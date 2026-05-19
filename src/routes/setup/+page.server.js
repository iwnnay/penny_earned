import { fail, redirect } from '@sveltejs/kit';
import { hashPassword } from '$lib/server/auth.js';
import { getDb } from '$lib/server/db/client.js';

/** @type {import('./$types').PageServerLoad} */
export function load() {
    const existing = getDb().prepare('SELECT COUNT(*) as count FROM users').get();
    if (existing.count > 0) {
        redirect(302, '/login');
    }
    return {};
}

/** @type {import('./$types').Actions} */
export const actions = {
    default: async ({ request }) => {
        const existing = getDb().prepare('SELECT COUNT(*) as count FROM users').get();
        if (existing.count > 0) {
            redirect(302, '/login');
        }

        const form = await request.formData();
        const email = String(form.get('email') ?? '').trim().toLowerCase();
        const password = String(form.get('password') ?? '');
        const confirm = String(form.get('confirm') ?? '');

        if (!email || !password) {
            return fail(400, { error: 'Email and password are required.' });
        }
        if (password !== confirm) {
            return fail(400, { error: 'Passwords do not match.' });
        }
        if (password.length < 8) {
            return fail(400, { error: 'Password must be at least 8 characters.' });
        }

        const hash = await hashPassword(password);
        getDb().prepare('INSERT INTO users (email, password) VALUES (?, ?)').run(email, hash);

        redirect(302, '/login');
    },
};
