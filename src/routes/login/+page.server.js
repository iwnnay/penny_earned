import { fail, redirect } from '@sveltejs/kit';
import { verifyPassword } from '$lib/server/auth.js';
import { createSession, COOKIE_NAME } from '$lib/server/session.js';
import { getDb } from '$lib/server/db/client.js';

/** @type {import('./$types').PageServerLoad} */
export function load({ locals }) {
    if (locals.user) {
        redirect(302, '/accounts');
    }
    return {};
}

/** @type {import('./$types').Actions} */
export const actions = {
    default: async ({ request, cookies }) => {
        const form = await request.formData();
        const email = String(form.get('email') ?? '').trim().toLowerCase();
        const password = String(form.get('password') ?? '');

        if (!email || !password) {
            return fail(400, { error: 'Email and password are required.' });
        }

        const user = getDb().prepare('SELECT * FROM users WHERE email = ?').get(email);
        if (!user || !(await verifyPassword(password, user.password))) {
            return fail(401, { error: 'Invalid email or password.' });
        }

        const token = createSession(user.user_id);
        cookies.set(COOKIE_NAME, token, {
            path: '/',
            httpOnly: true,
            sameSite: 'strict',
            maxAge: 30 * 24 * 60 * 60,
        });

        redirect(302, '/accounts');
    },
};
