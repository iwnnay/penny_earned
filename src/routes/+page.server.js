import { redirect } from '@sveltejs/kit';
import { getDb } from '$lib/server/db/client.js';

/** @type {import('./$types').PageServerLoad} */
export function load({ locals }) {
    if (locals.user) {
        redirect(302, '/accounts');
    }
    const hasUsers = getDb().prepare('SELECT COUNT(*) as count FROM users').get();
    if (hasUsers.count === 0) {
        redirect(302, '/setup');
    }
    redirect(302, '/login');
}
