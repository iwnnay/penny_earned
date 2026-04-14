import { json } from '@sveltejs/kit';
import { verifyPassword } from '$lib/server/auth.js';
import { createSession, COOKIE_NAME } from '$lib/server/session.js';
import { getDb } from '$lib/server/db/client.js';

/** @type {import('./$types').RequestHandler} */
export async function POST({ request, cookies }) {
    const body = await request.json();
    const email = String(body.email ?? '').trim().toLowerCase();
    const password = String(body.password ?? '');

    if (!email || !password) {
        return json({ error: 'email and password are required' }, { status: 400 });
    }

    const user = getDb().prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user || !(await verifyPassword(password, user.password))) {
        return json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const token = createSession(user.user_id);
    cookies.set(COOKIE_NAME, token, {
        path: '/',
        httpOnly: true,
        sameSite: 'strict',
        maxAge: 30 * 24 * 60 * 60,
    });

    return json({ user_id: user.user_id, email: user.email });
}
