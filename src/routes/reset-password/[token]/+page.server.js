import { fail, redirect } from '@sveltejs/kit';
import { validatePasswordResetToken, consumePasswordResetToken } from '$lib/server/password-reset.js';
import { hashPassword } from '$lib/server/auth.js';
import { deleteAllUserSessions } from '$lib/server/session.js';
import { getDb } from '$lib/server/db/client.js';

export function load({ params }) {
	const valid = validatePasswordResetToken(params.token);
	// Return a flag instead of redirecting so the page can show a friendly message
	return { invalid: !valid };
}

export const actions = {
	default: async ({ params, request }) => {
		const form = await request.formData();
		const password = String(form.get('password') ?? '');
		const confirm = String(form.get('confirm') ?? '');

		if (!password) return fail(400, { error: 'Password is required.' });
		if (password.length < 8) return fail(400, { error: 'Password must be at least 8 characters.' });
		if (password !== confirm) return fail(400, { error: 'Passwords do not match.' });

		// Re-validate before consuming to guard against TOCTOU
		const record = validatePasswordResetToken(params.token);
		if (!record) return fail(400, { error: 'Reset link is invalid or has expired.' });

		const consumed = consumePasswordResetToken(params.token);
		if (!consumed) return fail(400, { error: 'Reset link is invalid or has expired.' });

		const hash = await hashPassword(password);
		getDb().transaction(() => {
			getDb()
				.prepare(
					'UPDATE users SET password = ?, failed_attempts = 0, locked_until = NULL WHERE user_id = ?'
				)
				.run(hash, record.user_id);
			deleteAllUserSessions(record.user_id);
		})();

		redirect(302, '/login?reset=1');
	}
};
