import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { join, dirname } from 'path';

// ---------------------------------------------------------------------------
// In-memory database setup
//
// We mock `getDb` so every module under test uses a fresh in-memory SQLite
// instance rather than the production file on disk. The `testDb` variable is
// reassigned in `beforeEach`; the mock's factory closure picks up the new
// value automatically.
// ---------------------------------------------------------------------------

/** @type {import('better-sqlite3').Database} */
let testDb;

vi.mock('$lib/server/db/client.js', () => ({
	getDb: () => testDb
}));

// Also mock categories used by createTransaction so we can control the fallback
// Misc category without needing to seed it every time.
vi.mock('$lib/server/categories.js', () => ({
	getMiscCategoryId: () => null,
	setTransactionCategories: () => {}
}));

// Import after mocks are registered (vi.mock is hoisted but the resolved modules
// still need to be imported after the mock factory is in place).
const { getNeededHorizon, getBalanceExtremes, recalculateFromMonth, createTransaction } = await import('$lib/server/transactions.js');

const SCHEMA_PATH = join(dirname(fileURLToPath(import.meta.url)), 'db/schema.sql');

function freshDb() {
	const db = new Database(':memory:');
	const schema = readFileSync(SCHEMA_PATH, 'utf-8');
	db.exec(schema);

	// Minimal seed data: one user and one account.
	db.prepare('INSERT INTO users (email, password) VALUES (?, ?)').run('test@example.com', 'hashed');
	db.prepare(
		'INSERT INTO accounts (user_id, name, type, interest_rate, starting_amount, starting_date) VALUES (?, ?, ?, ?, ?, ?)'
	).run(1, 'Test Checking', 'checking', 0, 1000, '2026-01-01');

	return db;
}

/** Shorthand to insert a transaction with explicit order + total. */
function insertTx(db, { accountId = 1, order, name = 'Test', amount = 100, debit = 0, date, total }) {
	return db
		.prepare(
			`INSERT INTO transactions (account_id, "order", name, amount, debit, date, total)
             VALUES (?, ?, ?, ?, ?, ?, ?)`
		)
		.run(accountId, order, name, amount, debit, date, total).lastInsertRowid;
}

beforeEach(() => {
	testDb = freshDb();
});

afterEach(() => {
	testDb.close();
});

// ---------------------------------------------------------------------------
// getNeededHorizon
// ---------------------------------------------------------------------------

describe('getNeededHorizon', () => {
	it('returns a YYYY-MM string', () => {
		expect(getNeededHorizon()).toMatch(/^\d{4}-\d{2}$/);
	});

	it('is exactly 24 months from today', () => {
		const expected = new Date();
		expected.setMonth(expected.getMonth() + 24);
		const str = `${expected.getFullYear()}-${String(expected.getMonth() + 1).padStart(2, '0')}`;
		expect(getNeededHorizon()).toBe(str);
	});
});

// ---------------------------------------------------------------------------
// getBalanceExtremes
// ---------------------------------------------------------------------------

describe('getBalanceExtremes', () => {
	it('returns null when there are no transactions', () => {
		expect(getBalanceExtremes(1, '2026-01')).toBeNull();
	});

	it('returns null when there are no transactions from the given month onward', () => {
		// Insert a transaction in a past month only.
		insertTx(testDb, { order: 1, date: '2025-12-15', total: 800 });
		expect(getBalanceExtremes(1, '2026-01')).toBeNull();
	});

	it('identifies the correct min and max end-of-month balances', () => {
		// Jan ends at 800, Feb ends at 1200, Mar ends at 600.
		insertTx(testDb, { order: 1, date: '2026-01-15', total: 800 });
		insertTx(testDb, { order: 2, date: '2026-02-15', total: 1200 });
		insertTx(testDb, { order: 3, date: '2026-03-15', total: 600 });

		const result = getBalanceExtremes(1, '2026-01');
		expect(result).not.toBeNull();
		expect(result.min.total).toBe(600);
		expect(result.min.month).toBe('2026-03');
		expect(result.max.total).toBe(1200);
		expect(result.max.month).toBe('2026-02');
	});

	it('respects the fromYearMonth filter and excludes earlier months', () => {
		insertTx(testDb, { order: 1, date: '2026-01-15', total: 500 }); // Jan — should be excluded
		insertTx(testDb, { order: 2, date: '2026-02-15', total: 1100 });
		insertTx(testDb, { order: 3, date: '2026-03-15', total: 900 });

		const result = getBalanceExtremes(1, '2026-02');
		expect(result.min.total).toBe(900);
		expect(result.max.total).toBe(1100);
	});

	it('uses the last transaction per month (highest order), not the first', () => {
		// Two transactions in the same month: order 1 at 900, order 2 at 750.
		// End-of-month balance should be 750 (the last one), not 900.
		insertTx(testDb, { order: 1, date: '2026-01-10', total: 900 });
		insertTx(testDb, { order: 2, date: '2026-01-25', total: 750 });

		const result = getBalanceExtremes(1, '2026-01');
		expect(result.min.total).toBe(750);
		expect(result.max.total).toBe(750);
	});

	it('returns the same value for min and max when there is exactly one month', () => {
		insertTx(testDb, { order: 1, date: '2026-05-20', total: 3400 });

		const result = getBalanceExtremes(1, '2026-05');
		expect(result.min.total).toBe(3400);
		expect(result.max.total).toBe(3400);
		expect(result.min.month).toBe('2026-05');
		expect(result.max.month).toBe('2026-05');
	});

	it('handles negative balances correctly', () => {
		insertTx(testDb, { order: 1, date: '2026-01-15', total: -200 });
		insertTx(testDb, { order: 2, date: '2026-02-15', total: 100 });

		const result = getBalanceExtremes(1, '2026-01');
		expect(result.min.total).toBe(-200);
		expect(result.max.total).toBe(100);
	});

	it('does not mix transactions from different accounts', () => {
		// Second account
		testDb.prepare('INSERT INTO accounts (user_id, name, type, interest_rate, starting_amount, starting_date) VALUES (?, ?, ?, ?, ?, ?)').run(1, 'Savings', 'savings', 0, 5000, '2026-01-01');

		insertTx(testDb, { accountId: 1, order: 1, date: '2026-01-15', total: 800 });
		insertTx(testDb, { accountId: 2, order: 2, date: '2026-01-15', total: 9999 }); // different account, same month

		const result = getBalanceExtremes(1, '2026-01');
		expect(result.min.total).toBe(800);
		expect(result.max.total).toBe(800);
	});
});

// ---------------------------------------------------------------------------
// recalculateFromMonth
// ---------------------------------------------------------------------------

describe('recalculateFromMonth', () => {
	it('assigns sequential order values starting after any prior transactions', () => {
		// Pre-existing transaction in December (order 1) not in the recalc range.
		testDb.prepare(`INSERT INTO transactions (account_id, "order", name, amount, debit, date, total) VALUES (1, 1, 'Dec', 100, 1, '2025-12-01', 1100)`).run();

		// Raw January transactions with placeholder order=0.
		testDb.prepare(`INSERT INTO transactions (account_id, "order", name, amount, debit, date, total) VALUES (1, 0, 'Jan A', 50, 0, '2026-01-10', 0)`).run();
		testDb.prepare(`INSERT INTO transactions (account_id, "order", name, amount, debit, date, total) VALUES (1, 0, 'Jan B', 200, 1, '2026-01-20', 0)`).run();

		recalculateFromMonth(1, 2026, 1);

		const rows = testDb.prepare(`SELECT "order", total FROM transactions WHERE account_id = 1 AND date >= '2026-01-01' ORDER BY "order"`).all();
		// Starting balance: 1100 (from Dec). Jan A is a withdrawal: 1100-50=1050. Jan B is a debit: 1050+200=1250.
		expect(rows[0].order).toBe(2);
		expect(rows[0].total).toBe(1050);
		expect(rows[1].order).toBe(3);
		expect(rows[1].total).toBe(1250);
	});

	it('sorts withdrawals before debits on the same day', () => {
		// Debit inserted first but withdrawal (debit=0) should sort first within the day.
		testDb.prepare(`INSERT INTO transactions (account_id, "order", name, amount, debit, date, total) VALUES (1, 0, 'Income', 500, 1, '2026-02-15', 0)`).run();
		testDb.prepare(`INSERT INTO transactions (account_id, "order", name, amount, debit, date, total) VALUES (1, 0, 'Expense', 100, 0, '2026-02-15', 0)`).run();

		recalculateFromMonth(1, 2026, 2);

		const rows = testDb.prepare(`SELECT name, "order", total FROM transactions WHERE account_id = 1 ORDER BY "order"`).all();
		// Withdrawal (Expense, debit=0) should have lower order than Income (debit=1).
		expect(rows[0].name).toBe('Expense');
		expect(rows[1].name).toBe('Income');
		// Starting amount is 1000. Expense: 1000-100=900. Income: 900+500=1400.
		expect(rows[0].total).toBe(900);
		expect(rows[1].total).toBe(1400);
	});

	it('falls back to account starting_amount when there are no prior transactions', () => {
		testDb.prepare(`INSERT INTO transactions (account_id, "order", name, amount, debit, date, total) VALUES (1, 0, 'First', 200, 0, '2026-01-01', 0)`).run();

		recalculateFromMonth(1, 2026, 1);

		const row = testDb.prepare(`SELECT total FROM transactions WHERE account_id = 1`).get();
		// starting_amount = 1000, withdrawal of 200 → 800
		expect(row.total).toBe(800);
	});
});
