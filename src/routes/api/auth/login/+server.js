import { json } from '@sveltejs/kit';
import { dev } from '$app/environment';
import { verifyPassword } from '$lib/server/auth.js';
import { createSession, COOKIE_NAME } from '$lib/server/session.js';
import { getDb } from '$lib/server/db/client.js';
import { isRateLimited } from '$lib/server/rate-limit.js';

const MAX_FAILED = 5;
const LOCKOUT_MINUTES = 15;

/** @type {import('./$types').RequestHandler} */
export async function POST({ request, cookies, getClientAddress }) {
	const body = await request.json();
	const email = String(body.email ?? '').trim().toLowerCase();
	const password = String(body.password ?? '');

	if (!email || !password) {
		return json({ error: 'email and password are required' }, { status: 400 });
	}

	if (isRateLimited(`ip:${getClientAddress()}`)) {
		return json({ error: 'Too many attempts. Please try again later.' }, { status: 429 });
	}

	const user = getDb().prepare('SELECT * FROM users WHERE email = ?').get(email);

	if (user?.locked_until && new Date(user.locked_until) > new Date()) {
		return json({ error: 'Account temporarily locked.' }, { status: 423 });
	}

	if (!user || !(await verifyPassword(password, user.password))) {
		if (user) {
			const next = user.failed_attempts + 1;
			if (next >= MAX_FAILED) {
				const lockUntil = new Date(Date.now() + LOCKOUT_MINUTES * 60_000).toISOString();
				getDb()
					.prepare('UPDATE users SET failed_attempts = ?, locked_until = ? WHERE user_id = ?')
					.run(next, lockUntil, user.user_id);
			} else {
				getDb()
					.prepare('UPDATE users SET failed_attempts = ? WHERE user_id = ?')
					.run(next, user.user_id);
			}
		}
		return json({ error: 'Invalid credentials' }, { status: 401 });
	}

	getDb()
		.prepare('UPDATE users SET failed_attempts = 0, locked_until = NULL WHERE user_id = ?')
		.run(user.user_id);

	const token = createSession(user.user_id);
	cookies.set(COOKIE_NAME, token, {
		path: '/',
		httpOnly: true,
		sameSite: 'strict',
		secure: !dev,
		maxAge: 30 * 24 * 60 * 60
	});

	return json({ user_id: user.user_id, email: user.email });
}
