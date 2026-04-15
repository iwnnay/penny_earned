import { migrate } from '$lib/server/db/migrate.js';
import { getSession, pruneExpiredSessions, COOKIE_NAME } from '$lib/server/session.js';

migrate();

// Prune expired sessions on ~1% of requests so the table never grows unboundedly
// without adding a scheduled job. The low rate keeps the overhead negligible.
const PRUNE_PROBABILITY = 0.01;

/** @type {import('@sveltejs/kit').Handle} */
export async function handle({ event, resolve }) {
	const token = event.cookies.get(COOKIE_NAME);
	if (token) {
		const session = getSession(token);
		if (session) {
			event.locals.user = { user_id: session.user_id, email: session.email };
		}
	}

	if (Math.random() < PRUNE_PROBABILITY) {
		pruneExpiredSessions();
	}

	return resolve(event);
}
