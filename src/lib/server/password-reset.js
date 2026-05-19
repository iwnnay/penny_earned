import { randomBytes, createHash } from 'crypto';
import { getDb } from './db/client.js';

const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

function hashToken(token) {
	return createHash('sha256').update(token).digest('hex');
}

export function createPasswordResetToken(userId) {
	const token = randomBytes(32).toString('hex');
	const tokenHash = hashToken(token);
	const expires = new Date(Date.now() + TOKEN_TTL_MS).toISOString();

	const db = getDb();
	// One active reset token per user at a time
	db.prepare('DELETE FROM password_reset_tokens WHERE user_id = ?').run(userId);
	db.prepare(
		'INSERT INTO password_reset_tokens (token_hash, user_id, expires) VALUES (?, ?, ?)'
	).run(tokenHash, userId, expires);

	return token; // plain token sent to user; hash is what lives in the DB
}

/** Returns { user_id } if the token is valid and unused, otherwise null. */
export function validatePasswordResetToken(token) {
	const tokenHash = hashToken(token);
	return (
		getDb()
			.prepare(
				`SELECT user_id FROM password_reset_tokens
			 WHERE token_hash = ? AND expires > datetime('now') AND used = 0`
			)
			.get(tokenHash) ?? null
	);
}

/** Marks the token used. Returns true if it was valid and not already consumed. */
export function consumePasswordResetToken(token) {
	const tokenHash = hashToken(token);
	const result = getDb()
		.prepare(
			`UPDATE password_reset_tokens SET used = 1
		 WHERE token_hash = ? AND expires > datetime('now') AND used = 0`
		)
		.run(tokenHash);
	return result.changes > 0;
}
