import { randomBytes } from 'crypto';
import { getDb } from './db/client.js';

const SESSION_TTL_DAYS = 30;
const COOKIE_NAME = 'session';

/** @param {number} userId */
export function createSession(userId) {
    const token = randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString();
    getDb().prepare('INSERT INTO sessions (token, user_id, expires) VALUES (?, ?, ?)').run(token, userId, expires);
    return token;
}

/** @param {string} token */
export function getSession(token) {
    const row = getDb()
        .prepare(
            `SELECT s.token, u.user_id, u.email
             FROM sessions s
             JOIN users u ON u.user_id = s.user_id
             WHERE s.token = ? AND s.expires > datetime('now')`
        )
        .get(token);
    return row ?? null;
}

/** @param {string} token */
export function deleteSession(token) {
    getDb().prepare('DELETE FROM sessions WHERE token = ?').run(token);
}

export function pruneExpiredSessions() {
    getDb().prepare("DELETE FROM sessions WHERE expires <= datetime('now')").run();
}

export { COOKIE_NAME };
