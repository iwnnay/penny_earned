import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { join, dirname } from 'path';

/** @type {import('better-sqlite3').Database} */
let testDb;

vi.mock('$lib/server/db/client.js', () => ({
	getDb: () => testDb
}));

const { parseChaseCSV, normalizeDescription, previewImport, confirmImport } = await import('$lib/server/import.js');

const SCHEMA_PATH = join(dirname(fileURLToPath(import.meta.url)), 'db/schema.sql');

function freshDb() {
	const db = new Database(':memory:');
	db.exec(readFileSync(SCHEMA_PATH, 'utf-8'));

	// Migration 3: import_fingerprint column + import_category_rules table
	db.exec('ALTER TABLE transactions ADD COLUMN import_fingerprint TEXT');
	db.exec(`CREATE TABLE IF NOT EXISTS import_category_rules (
		rule_id            INTEGER PRIMARY KEY AUTOINCREMENT,
		account_id         INTEGER NOT NULL REFERENCES accounts(account_id) ON DELETE CASCADE,
		import_description TEXT    NOT NULL,
		category_id        INTEGER NOT NULL REFERENCES categories(category_id) ON DELETE CASCADE,
		UNIQUE(account_id, import_description)
	)`);

	db.prepare('INSERT INTO users (email, password) VALUES (?, ?)').run('test@example.com', 'hashed');
	db.prepare(
		'INSERT INTO accounts (user_id, name, type, interest_rate, starting_amount, starting_date) VALUES (?, ?, ?, ?, ?, ?)'
	).run(1, 'Test Checking', 'checking', 0, 1000, '2026-01-01');

	return db;
}

beforeEach(() => {
	testDb = freshDb();
});

afterEach(() => {
	testDb.close();
});

// ---------------------------------------------------------------------------
// parseChaseCSV
// ---------------------------------------------------------------------------

const CHASE_HEADER = 'Details,Posting Date,Description,Amount,Type,Balance,Check or Slip #';

describe('parseChaseCSV', () => {
	it('returns an empty array for empty input', () => {
		expect(parseChaseCSV('')).toEqual([]);
	});

	it('returns an empty array for a header-only file', () => {
		expect(parseChaseCSV(CHASE_HEADER)).toEqual([]);
	});

	it('parses a credit (positive amount) row as debit=true', () => {
		const csv = `${CHASE_HEADER}\nCREDIT,01/15/2026,Direct Deposit,2000.00,ACH_CREDIT,3000.00,`;
		const rows = parseChaseCSV(csv);
		expect(rows.length).toBe(1);
		expect(rows[0].debit).toBe(true);
		expect(rows[0].amount).toBe(2000);
		expect(rows[0].date).toBe('2026-01-15');
		expect(rows[0].description).toBe('Direct Deposit');
	});

	it('parses a debit (negative amount) row as debit=false', () => {
		const csv = `${CHASE_HEADER}\nDEBIT,03/05/2026,AMAZON,-49.99,DEBIT_CARD,950.00,`;
		const rows = parseChaseCSV(csv);
		expect(rows.length).toBe(1);
		expect(rows[0].debit).toBe(false);
		expect(rows[0].amount).toBe(49.99);
	});

	it('converts M/D/YYYY date to YYYY-MM-DD', () => {
		const csv = `${CHASE_HEADER}\nCREDIT,3/5/2026,Test,100.00,ACH_CREDIT,1100.00,`;
		const rows = parseChaseCSV(csv);
		expect(rows[0].date).toBe('2026-03-05');
	});

	it('handles quoted fields containing commas', () => {
		const csv = `${CHASE_HEADER}\nDEBIT,01/10/2026,"STORE, INC",-25.00,DEBIT_CARD,975.00,`;
		const rows = parseChaseCSV(csv);
		expect(rows[0].description).toBe('STORE, INC');
	});

	it('skips rows with fewer than 5 fields', () => {
		const csv = `${CHASE_HEADER}\nCREDIT,01/15/2026,Test`;
		expect(parseChaseCSV(csv)).toEqual([]);
	});

	it('skips rows with an unrecognised date format', () => {
		const csv = `${CHASE_HEADER}\nCREDIT,not-a-date,Test,100.00,ACH_CREDIT,1100.00,`;
		expect(parseChaseCSV(csv)).toEqual([]);
	});

	it('skips rows where amount is NaN', () => {
		const csv = `${CHASE_HEADER}\nCREDIT,01/15/2026,Test,abc,ACH_CREDIT,1100.00,`;
		expect(parseChaseCSV(csv)).toEqual([]);
	});

	it('parses multiple rows', () => {
		const csv = [
			CHASE_HEADER,
			'CREDIT,01/01/2026,Deposit,500.00,ACH_CREDIT,1500.00,',
			'DEBIT,01/05/2026,Grocery,-75.00,DEBIT_CARD,1425.00,'
		].join('\n');
		const rows = parseChaseCSV(csv);
		expect(rows.length).toBe(2);
	});

	it('handles CRLF line endings', () => {
		const csv = `${CHASE_HEADER}\r\nCREDIT,01/01/2026,Test,100.00,ACH_CREDIT,1100.00,\r\n`;
		expect(parseChaseCSV(csv).length).toBe(1);
	});

	it('stores amount as absolute (positive) value regardless of sign', () => {
		const csv = `${CHASE_HEADER}\nDEBIT,01/01/2026,Expense,-123.45,DEBIT_CARD,876.55,`;
		const rows = parseChaseCSV(csv);
		expect(rows[0].amount).toBe(123.45);
	});
});

// ---------------------------------------------------------------------------
// normalizeDescription
// ---------------------------------------------------------------------------

describe('normalizeDescription', () => {
	it('trims leading and trailing whitespace', () => {
		expect(normalizeDescription('  Test  ')).toBe('Test');
	});

	it('collapses multiple internal spaces into one', () => {
		expect(normalizeDescription('AMAZON   PRIME  PURCHASE')).toBe('AMAZON PRIME PURCHASE');
	});

	it('collapses tabs and mixed whitespace', () => {
		expect(normalizeDescription('A\t\tB')).toBe('A B');
	});

	it('leaves a normal string unchanged', () => {
		expect(normalizeDescription('Direct Deposit')).toBe('Direct Deposit');
	});

	it('returns an empty string for whitespace-only input', () => {
		expect(normalizeDescription('   ')).toBe('');
	});
});

// ---------------------------------------------------------------------------
// previewImport
// ---------------------------------------------------------------------------

const SAMPLE_CSV = [
	CHASE_HEADER,
	'DEBIT,01/15/2026,STARBUCKS,-5.50,DEBIT_CARD,994.50,',
	'CREDIT,01/20/2026,Payroll,2000.00,ACH_CREDIT,2994.50,'
].join('\n');

describe('previewImport', () => {
	it('returns a row for each parsed CSV entry', () => {
		const { rows } = previewImport(1, SAMPLE_CSV);
		expect(rows.length).toBe(2);
	});

	it('marks all rows as not duplicate for a fresh import', () => {
		const { rows } = previewImport(1, SAMPLE_CSV);
		expect(rows.every((r) => !r.isDuplicate)).toBe(true);
	});

	it('returns the miscCategoryId alongside rows', () => {
		const { rows, miscCategoryId } = previewImport(1, SAMPLE_CSV);
		expect(miscCategoryId).not.toBeNull();
		expect(rows.every((r) => r.suggestedCategoryId === miscCategoryId)).toBe(true);
	});

	it('marks rows as categorySource="default" when no rule matches', () => {
		const { rows } = previewImport(1, SAMPLE_CSV);
		expect(rows.every((r) => r.categorySource === 'default')).toBe(true);
	});

	it('detects fingerprint duplicates for previously imported transactions', () => {
		const { rows: preview } = previewImport(1, SAMPLE_CSV);
		const fp = preview[0].fingerprint;
		testDb.prepare(
			`INSERT INTO transactions (account_id, "order", name, amount, debit, date, total, import_fingerprint)
			 VALUES (1, 1, 'old', 5.50, 0, '2026-01-15', 994.50, ?)`
		).run(fp);

		const { rows } = previewImport(1, SAMPLE_CSV);
		const dup = rows.find((r) => r.fingerprint === fp);
		expect(dup.isDuplicate).toBe(true);
		expect(dup.duplicateReason).toBe('fingerprint');
	});

	it('detects match duplicates for manual transactions with same date/amount/direction', () => {
		// Manual entry (no fingerprint) matching the STARBUCKS row
		testDb.prepare(
			`INSERT INTO transactions (account_id, "order", name, amount, debit, date, total)
			 VALUES (1, 1, 'Manual', 5.50, 0, '2026-01-15', 994.50)`
		).run();

		const { rows } = previewImport(1, SAMPLE_CSV);
		const dup = rows.find((r) => r.date === '2026-01-15' && !r.debit);
		expect(dup.isDuplicate).toBe(true);
		expect(dup.duplicateReason).toBe('match');
	});

	it('applies a saved category rule for matching descriptions', () => {
		const food = testDb.prepare("SELECT category_id FROM categories WHERE name = 'Food'").get();
		testDb.prepare('INSERT INTO import_category_rules (account_id, import_description, category_id) VALUES (?, ?, ?)').run(1, 'STARBUCKS', food.category_id);

		const { rows } = previewImport(1, SAMPLE_CSV);
		const starbucks = rows.find((r) => r.description === 'STARBUCKS');
		expect(starbucks.suggestedCategoryId).toBe(food.category_id);
		expect(starbucks.categorySource).toBe('rule');
	});

	it('returns an empty rows array for a blank CSV', () => {
		const { rows } = previewImport(1, '');
		expect(rows).toEqual([]);
	});
});

// ---------------------------------------------------------------------------
// confirmImport
// ---------------------------------------------------------------------------

describe('confirmImport', () => {
	it('returns zero count and null earliestDate for empty input', () => {
		const result = confirmImport(1, []);
		expect(result.count).toBe(0);
		expect(result.earliestDate).toBeNull();
	});

	it('inserts transactions and returns the correct count', () => {
		const txs = [
			{ fingerprint: '2026-01-15|5.50|D|STARBUCKS', date: '2026-01-15', name: 'STARBUCKS', amount: 5.5, debit: false, categoryId: null, saveRule: false },
			{ fingerprint: '2026-01-20|2000.00|C|Payroll', date: '2026-01-20', name: 'Payroll', amount: 2000, debit: true, categoryId: null, saveRule: false }
		];
		const result = confirmImport(1, txs);
		expect(result.count).toBe(2);
	});

	it('returns the earliest inserted date', () => {
		const txs = [
			{ fingerprint: 'fp-b', date: '2026-01-20', name: 'B', amount: 10, debit: true, categoryId: null, saveRule: false },
			{ fingerprint: 'fp-a', date: '2026-01-05', name: 'A', amount: 10, debit: true, categoryId: null, saveRule: false }
		];
		const { earliestDate } = confirmImport(1, txs);
		expect(earliestDate).toBe('2026-01-05');
	});

	it('stores fingerprints on inserted transactions', () => {
		const fp = '2026-02-01|100.00|D|GROCERY';
		confirmImport(1, [{ fingerprint: fp, date: '2026-02-01', name: 'GROCERY', amount: 100, debit: false, categoryId: null, saveRule: false }]);

		const row = testDb.prepare('SELECT import_fingerprint FROM transactions WHERE import_fingerprint = ?').get(fp);
		expect(row).toBeDefined();
	});

	it('saves a category rule when saveRule is true', () => {
		const food = testDb.prepare("SELECT category_id FROM categories WHERE name = 'Food'").get();
		confirmImport(1, [{
			fingerprint: 'fp1', date: '2026-01-01', name: 'STARBUCKS', amount: 5, debit: false, categoryId: food.category_id, saveRule: true
		}]);

		const rule = testDb.prepare("SELECT * FROM import_category_rules WHERE account_id = 1 AND import_description = 'STARBUCKS'").get();
		expect(rule).toBeDefined();
		expect(rule.category_id).toBe(food.category_id);
	});

	it('does not save a rule when saveRule is false', () => {
		const food = testDb.prepare("SELECT category_id FROM categories WHERE name = 'Food'").get();
		confirmImport(1, [{
			fingerprint: 'fp2', date: '2026-01-01', name: 'TARGET', amount: 30, debit: false, categoryId: food.category_id, saveRule: false
		}]);

		const rule = testDb.prepare("SELECT * FROM import_category_rules WHERE import_description = 'TARGET'").get();
		expect(rule).toBeUndefined();
	});

	it('recalculates running totals after bulk insert', () => {
		confirmImport(1, [{
			fingerprint: 'fp-income', date: '2026-03-01', name: 'Paycheck', amount: 2000, debit: true, categoryId: null, saveRule: false
		}]);

		const row = testDb.prepare("SELECT total FROM transactions WHERE name = 'Paycheck'").get();
		expect(row.total).toBe(3000); // starting_amount 1000 + 2000
	});
});
