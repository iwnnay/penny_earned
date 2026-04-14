import { migrate } from '$lib/server/db/migrate.js';
import { getSession, COOKIE_NAME } from '$lib/server/session.js';

migrate();

/** @type {import('@sveltejs/kit').Handle} */
export async function handle({ event, resolve }) {
    const token = event.cookies.get(COOKIE_NAME);
    if (token) {
        const session = getSession(token);
        if (session) {
            event.locals.user = { user_id: session.user_id, email: session.email };
        }
    }
    return resolve(event);
}
