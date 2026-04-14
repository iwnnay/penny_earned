import { redirect } from '@sveltejs/kit';
import { deleteSession, COOKIE_NAME } from '$lib/server/session.js';

/** @type {import('./$types').Actions} */
export const actions = {
    default: ({ cookies }) => {
        const token = cookies.get(COOKIE_NAME);
        if (token) {
            deleteSession(token);
            cookies.delete(COOKIE_NAME, { path: '/' });
        }
        redirect(302, '/login');
    },
};
