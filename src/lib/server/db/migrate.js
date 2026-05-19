import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { join, dirname } from 'path';
import { getDb } from './client.js';

let migrated = false;
const __dir = dirname(fileURLToPath(import.meta.url));

export function migrate() {
	if (migrated) return;
	const db = getDb();

	db.exec(readFileSync(join(__dir, 'schema.sql'), 'utf-8'));

	db.exec(`CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY)`);
	const applied = new Set(db.prepare('SELECT version FROM schema_migrations').pluck().all());

	for (const { version, up } of MIGRATIONS) {
		if (applied.has(version)) continue;
		db.transaction(() => {
			for (const stmt of up) db.exec(stmt);
			db.prepare('INSERT INTO schema_migrations (version) VALUES (?)').run(version);
		})();
	}

	migrated = true;
}

const MIGRATIONS = [
	{
		version: 2,
		up: [
			'ALTER TABLE users ADD COLUMN failed_attempts INTEGER NOT NULL DEFAULT 0',
			'ALTER TABLE users ADD COLUMN locked_until TEXT',
			'ALTER TABLE users ADD COLUMN mfa_enabled INTEGER NOT NULL DEFAULT 0',
			'ALTER TABLE users ADD COLUMN mfa_type TEXT',
			`CREATE TABLE IF NOT EXISTS password_reset_tokens (
				token_hash TEXT    PRIMARY KEY,
				user_id    INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
				expires    TEXT    NOT NULL,
				used       INTEGER NOT NULL DEFAULT 0
			)`,
			'CREATE INDEX IF NOT EXISTS idx_prt_user ON password_reset_tokens(user_id)',
			`CREATE TABLE IF NOT EXISTS mfa_challenges (
				challenge_id TEXT    PRIMARY KEY,
				user_id      INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
				expires      TEXT    NOT NULL
			)`
		]
	},
	{
		version: 3,
		up: [
			'ALTER TABLE transactions ADD COLUMN import_fingerprint TEXT',
			'CREATE INDEX IF NOT EXISTS idx_tx_fingerprint ON transactions(account_id, import_fingerprint) WHERE import_fingerprint IS NOT NULL',
			`CREATE TABLE IF NOT EXISTS import_category_rules (
				rule_id            INTEGER PRIMARY KEY AUTOINCREMENT,
				account_id         INTEGER NOT NULL REFERENCES accounts(account_id) ON DELETE CASCADE,
				import_description TEXT    NOT NULL,
				category_id        INTEGER NOT NULL REFERENCES categories(category_id) ON DELETE CASCADE,
				UNIQUE(account_id, import_description)
			)`
		]
	}
];
