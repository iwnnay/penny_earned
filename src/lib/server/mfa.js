import { randomBytes } from 'crypto';
import { getDb } from './db/client.js';

export const MFA_COOKIE = 'mfa_challenge';
const CHALLENGE_TTL_MS = 10 * 60 * 1000; // 10 minutes

/** Creates a short-lived challenge after password auth succeeds, before MFA is verified. */
export function createMfaChallenge(userId) {
	const challengeId = randomBytes(32).toString('hex');
	const expires = new Date(Date.now() + CHALLENGE_TTL_MS).toISOString();
	getDb()
		.prepare('INSERT INTO mfa_challenges (challenge_id, user_id, expires) VALUES (?, ?, ?)')
		.run(challengeId, userId, expires);
	return challengeId;
}

/**
 * Validates and consumes a challenge. Returns user_id on success, null if invalid/expired.
 * Single-use: the row is deleted on read.
 */
export function consumeMfaChallenge(challengeId) {
	const db = getDb();
	const row = db
		.prepare(
			`SELECT user_id FROM mfa_challenges
		 WHERE challenge_id = ? AND expires > datetime('now')`
		)
		.get(challengeId);
	if (!row) return null;
	db.prepare('DELETE FROM mfa_challenges WHERE challenge_id = ?').run(challengeId);
	return row.user_id;
}
