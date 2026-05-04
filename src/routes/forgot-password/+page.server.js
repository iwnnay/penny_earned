import { fail, redirect } from '@sveltejs/kit';
import { getDb } from '$lib/server/db/client.js';
import { createPasswordResetToken } from '$lib/server/password-reset.js';
import { sendPasswordResetEmail } from '$lib/server/email.js';
import { isRateLimited } from '$lib/server/rate-limit.js';

export function load({ locals }) {
	if (locals.user) redirect(302, '/accounts');
	return {};
}

export const actions = {
	default: async ({ request, url, getClientAddress }) => {
		const form = await request.formData();
		const email = String(form.get('email') ?? '').trim().toLowerCase();

		if (!email) return fail(400, { error: 'Email is required.' });

		// Rate-limit reset requests separately from login attempts
		if (isRateLimited(`reset:${getClientAddress()}`)) {
			return { sent: true }; // lie to avoid timing-based enumeration
		}

		const user = getDb().prepare('SELECT user_id FROM users WHERE email = ?').get(email);
		if (user) {
			const token = createPasswordResetToken(user.user_id);
			const resetUrl = `${url.origin}/reset-password/${token}`;
			try {
				await sendPasswordResetEmail(email, resetUrl);
			} catch (e) {
				console.error('[forgot-password] email send failed:', e.message);
			}
		}

		// Always return success — never reveal whether the email is registered
		return { sent: true };
	}
};
