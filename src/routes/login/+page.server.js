import { fail, redirect } from '@sveltejs/kit';
import { dev } from '$app/environment';
import { verifyPassword } from '$lib/server/auth.js';
import { createSession, COOKIE_NAME } from '$lib/server/session.js';
import { getDb } from '$lib/server/db/client.js';
import { isRateLimited } from '$lib/server/rate-limit.js';
import { createMfaChallenge, MFA_COOKIE } from '$lib/server/mfa.js';

const MAX_FAILED = 5;
const LOCKOUT_MINUTES = 15;

/** @type {import('./$types').PageServerLoad} */
export function load({ locals, url }) {
	if (locals.user) redirect(302, '/accounts');
	return { passwordReset: url.searchParams.has('reset') };
}

/** @type {import('./$types').Actions} */
export const actions = {
	default: async ({ request, cookies, getClientAddress }) => {
		const form = await request.formData();
		const email = String(form.get('email') ?? '').trim().toLowerCase();
		const password = String(form.get('password') ?? '');

		if (!email || !password) {
			return fail(400, { error: 'Email and password are required.' });
		}

		if (isRateLimited(`ip:${getClientAddress()}`)) {
			return fail(429, { error: 'Too many attempts. Please try again later.' });
		}

		const user = getDb().prepare('SELECT * FROM users WHERE email = ?').get(email);

		if (user?.locked_until && new Date(user.locked_until) > new Date()) {
			return fail(423, {
				error:
					'Account temporarily locked due to too many failed attempts. Try again later or reset your password.'
			});
		}

		if (!user || !(await verifyPassword(password, user.password))) {
			if (user) {
				const next = user.failed_attempts + 1;
				if (next >= MAX_FAILED) {
					const lockUntil = new Date(Date.now() + LOCKOUT_MINUTES * 60_000).toISOString();
					getDb()
						.prepare(
							'UPDATE users SET failed_attempts = ?, locked_until = ? WHERE user_id = ?'
						)
						.run(next, lockUntil, user.user_id);
				} else {
					getDb()
						.prepare('UPDATE users SET failed_attempts = ? WHERE user_id = ?')
						.run(next, user.user_id);
				}
			}
			return fail(401, { error: 'Invalid email or password.' });
		}

		getDb()
			.prepare('UPDATE users SET failed_attempts = 0, locked_until = NULL WHERE user_id = ?')
			.run(user.user_id);

		if (user.mfa_enabled) {
			const challengeId = createMfaChallenge(user.user_id);
			cookies.set(MFA_COOKIE, challengeId, {
				path: '/login/mfa',
				httpOnly: true,
				sameSite: 'strict',
				secure: !dev,
				maxAge: 10 * 60
			});
			redirect(302, '/login/mfa');
		}

		const token = createSession(user.user_id);
		cookies.set(COOKIE_NAME, token, {
			path: '/',
			httpOnly: true,
			sameSite: 'strict',
			secure: !dev,
			maxAge: 30 * 24 * 60 * 60
		});

		redirect(302, '/accounts');
	}
};
