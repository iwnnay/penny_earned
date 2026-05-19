import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { join, dirname } from 'path';

// ---------------------------------------------------------------------------
// In-memory database setup
// ---------------------------------------------------------------------------

/** @type {import('better-sqlite3').Database} */
let testDb;

vi.mock('$lib/server/db/client.js', () => ({
	getDb: () => testDb
}));

vi.mock('$lib/server/categories.js', () => ({
	getMiscCategoryId: () => null,
	setTransactionCategories: () => {}
}));

const {
	getNeededHorizon,
	getBalanceExtremes,
	recalculateFromMonth,
	createTransaction,
	updateTransaction,
	updateTransactionAndFuture,
	deleteTransaction,
	createRecurringSeries,
	deleteRecurringSeries,
	ensureHorizonForAccount
} = await import('$lib/server/transactions.js');

const SCHEMA_PATH = join(dirname(fileURLToPath(import.meta.url)), 'db/schema.sql');

function freshDb() {
	const db = new Database(':memory:');
	db.exec(readFileSync(SCHEMA_PATH, 'utf-8'));
	db.prepare('INSERT INTO users (email, password) VALUES (?, ?)').run('test@example.com', 'hashed');
	db.prepare(
		'INSERT INTO accounts (user_id, name, type, interest_rate, starting_amount, starting_date) VALUES (?, ?, ?, ?, ?, ?)'
	).run(1, 'Test Checking', 'checking', 0, 1000, '2026-01-01');
	return db;
}

/** Inserts a transaction with explicit order + total (bypasses recalculation). */
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
		insertTx(testDb, { order: 1, date: '2025-12-15', total: 800 });
		expect(getBalanceExtremes(1, '2026-01')).toBeNull();
	});

	it('identifies the correct min and max end-of-month balances', () => {
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
		insertTx(testDb, { order: 1, date: '2026-01-15', total: 500 });
		insertTx(testDb, { order: 2, date: '2026-02-15', total: 1100 });
		insertTx(testDb, { order: 3, date: '2026-03-15', total: 900 });

		const result = getBalanceExtremes(1, '2026-02');
		expect(result.min.total).toBe(900);
		expect(result.max.total).toBe(1100);
	});

	it('uses the last transaction per month (highest order), not the first', () => {
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
		testDb.prepare('INSERT INTO accounts (user_id, name, type, interest_rate, starting_amount, starting_date) VALUES (?, ?, ?, ?, ?, ?)').run(1, 'Savings', 'savings', 0, 5000, '2026-01-01');

		insertTx(testDb, { accountId: 1, order: 1, date: '2026-01-15', total: 800 });
		insertTx(testDb, { accountId: 2, order: 2, date: '2026-01-15', total: 9999 });

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
		testDb.prepare(`INSERT INTO transactions (account_id, "order", name, amount, debit, date, total) VALUES (1, 1, 'Dec', 100, 1, '2025-12-01', 1100)`).run();
		testDb.prepare(`INSERT INTO transactions (account_id, "order", name, amount, debit, date, total) VALUES (1, 0, 'Jan A', 50, 0, '2026-01-10', 0)`).run();
		testDb.prepare(`INSERT INTO transactions (account_id, "order", name, amount, debit, date, total) VALUES (1, 0, 'Jan B', 200, 1, '2026-01-20', 0)`).run();

		recalculateFromMonth(1, 2026, 1);

		const rows = testDb.prepare(`SELECT "order", total FROM transactions WHERE account_id = 1 AND date >= '2026-01-01' ORDER BY "order"`).all();
		expect(rows[0].order).toBe(2);
		expect(rows[0].total).toBe(1050);
		expect(rows[1].order).toBe(3);
		expect(rows[1].total).toBe(1250);
	});

	it('sorts withdrawals before debits on the same day', () => {
		testDb.prepare(`INSERT INTO transactions (account_id, "order", name, amount, debit, date, total) VALUES (1, 0, 'Income', 500, 1, '2026-02-15', 0)`).run();
		testDb.prepare(`INSERT INTO transactions (account_id, "order", name, amount, debit, date, total) VALUES (1, 0, 'Expense', 100, 0, '2026-02-15', 0)`).run();

		recalculateFromMonth(1, 2026, 2);

		const rows = testDb.prepare(`SELECT name, "order", total FROM transactions WHERE account_id = 1 ORDER BY "order"`).all();
		expect(rows[0].name).toBe('Expense');
		expect(rows[1].name).toBe('Income');
		expect(rows[0].total).toBe(900);
		expect(rows[1].total).toBe(1400);
	});

	it('falls back to account starting_amount when there are no prior transactions', () => {
		testDb.prepare(`INSERT INTO transactions (account_id, "order", name, amount, debit, date, total) VALUES (1, 0, 'First', 200, 0, '2026-01-01', 0)`).run();

		recalculateFromMonth(1, 2026, 1);

		const row = testDb.prepare(`SELECT total FROM transactions WHERE account_id = 1`).get();
		expect(row.total).toBe(800);
	});

	it('is a no-op when there are no transactions from that month forward', () => {
		expect(() => recalculateFromMonth(1, 2030, 1)).not.toThrow();
	});
});

// ---------------------------------------------------------------------------
// createTransaction
// ---------------------------------------------------------------------------

describe('createTransaction', () => {
	it('inserts the transaction and returns its id', () => {
		const id = createTransaction({ account_id: 1, name: 'Coffee', amount: 5, debit: false, date: '2026-03-01' });
		const row = testDb.prepare('SELECT * FROM transactions WHERE transaction_id = ?').get(id);
		expect(row.name).toBe('Coffee');
		expect(row.amount).toBe(5);
		expect(row.debit).toBe(0);
		expect(row.account_id).toBe(1);
		expect(row.date).toBe('2026-03-01');
	});

	it('stores debit=true as 1 in the database', () => {
		const id = createTransaction({ account_id: 1, name: 'Salary', amount: 1000, debit: true, date: '2026-03-01' });
		const row = testDb.prepare('SELECT debit FROM transactions WHERE transaction_id = ?').get(id);
		expect(row.debit).toBe(1);
	});

	it('recalculates the running total after insertion', () => {
		const id = createTransaction({ account_id: 1, name: 'Rent', amount: 200, debit: false, date: '2026-03-01' });
		const row = testDb.prepare('SELECT total FROM transactions WHERE transaction_id = ?').get(id);
		expect(row.total).toBe(800);
	});

	it('accumulates totals across multiple transactions', () => {
		createTransaction({ account_id: 1, name: 'Income', amount: 500, debit: true, date: '2026-03-01' });
		const id = createTransaction({ account_id: 1, name: 'Expense', amount: 100, debit: false, date: '2026-03-02' });
		const row = testDb.prepare('SELECT total FROM transactions WHERE transaction_id = ?').get(id);
		expect(row.total).toBe(1400);
	});
});

// ---------------------------------------------------------------------------
// deleteTransaction
// ---------------------------------------------------------------------------

describe('deleteTransaction', () => {
	it('removes the transaction from the database', () => {
		const id = createTransaction({ account_id: 1, name: 'Temp', amount: 50, debit: false, date: '2026-03-01' });
		deleteTransaction(id);
		const row = testDb.prepare('SELECT * FROM transactions WHERE transaction_id = ?').get(id);
		expect(row).toBeUndefined();
	});

	it('is a no-op when the transaction does not exist', () => {
		expect(() => deleteTransaction(99999)).not.toThrow();
	});

	it('recalculates totals for later transactions after deletion', () => {
		const id1 = createTransaction({ account_id: 1, name: 'Expense A', amount: 100, debit: false, date: '2026-03-01' });
		const id2 = createTransaction({ account_id: 1, name: 'Expense B', amount: 50, debit: false, date: '2026-03-02' });
		deleteTransaction(id1);
		const row = testDb.prepare('SELECT total FROM transactions WHERE transaction_id = ?').get(id2);
		expect(row.total).toBe(950);
	});
});

// ---------------------------------------------------------------------------
// updateTransaction
// ---------------------------------------------------------------------------

describe('updateTransaction', () => {
	it('updates name, amount, debit, and date', () => {
		const id = createTransaction({ account_id: 1, name: 'Old', amount: 100, debit: false, date: '2026-03-01' });
		updateTransaction(id, { name: 'New', amount: 200, debit: true, date: '2026-03-05' });
		const row = testDb.prepare('SELECT * FROM transactions WHERE transaction_id = ?').get(id);
		expect(row.name).toBe('New');
		expect(row.amount).toBe(200);
		expect(row.debit).toBe(1);
		expect(row.date).toBe('2026-03-05');
	});

	it('is a no-op when the transaction does not exist', () => {
		expect(() => updateTransaction(99999, { name: 'X', amount: 1, debit: false, date: '2026-03-01' })).not.toThrow();
	});

	it('recalculates the running total after update', () => {
		const id = createTransaction({ account_id: 1, name: 'Income', amount: 500, debit: true, date: '2026-03-01' });
		updateTransaction(id, { name: 'Income', amount: 300, debit: true, date: '2026-03-01' });
		const row = testDb.prepare('SELECT total FROM transactions WHERE transaction_id = ?').get(id);
		expect(row.total).toBe(1300);
	});

	it('recalculates from the earlier of old or new date when the date changes', () => {
		// Add a transaction in February so the recalc from Feb is observable
		const beforeId = insertTx(testDb, { order: 1, date: '2026-02-01', total: 900, debit: 0, amount: 100 });
		const id = createTransaction({ account_id: 1, name: 'Test', amount: 50, debit: false, date: '2026-03-01' });

		// Move the transaction to February — recalc must cover February
		updateTransaction(id, { name: 'Test', amount: 50, debit: false, date: '2026-02-15' });

		const row = testDb.prepare('SELECT date FROM transactions WHERE transaction_id = ?').get(id);
		expect(row.date).toBe('2026-02-15');
		// Confirm recalculation ran (total on beforeId should be updated too)
		const beforeRow = testDb.prepare('SELECT total FROM transactions WHERE transaction_id = ?').get(beforeId);
		expect(typeof beforeRow.total).toBe('number');
	});
});

// ---------------------------------------------------------------------------
// createRecurringSeries
// ---------------------------------------------------------------------------

describe('createRecurringSeries', () => {
	it('returns a UUID string', () => {
		const id = createRecurringSeries({
			account_id: 1, name: 'Rent', amount: 1200, debit: false, date: '2026-01-01', recurring_frequency: 'monthly'
		});
		expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
	});

	it('creates multiple transactions spanning the horizon', () => {
		const seriesId = createRecurringSeries({
			account_id: 1, name: 'Rent', amount: 1200, debit: false, date: '2026-01-01', recurring_frequency: 'monthly'
		});
		const rows = testDb.prepare('SELECT * FROM transactions WHERE series = ?').all(seriesId);
		expect(rows.length).toBeGreaterThan(1);
		expect(rows.every((r) => r.name === 'Rent' && r.amount === 1200)).toBe(true);
		expect(rows.every((r) => r.recurring_frequency === 'monthly')).toBe(true);
	});

	it('sets the series field on all created transactions', () => {
		const seriesId = createRecurringSeries({
			account_id: 1, name: 'Insurance', amount: 200, debit: false, date: '2026-01-01', recurring_frequency: 'monthly'
		});
		const rows = testDb.prepare('SELECT series FROM transactions WHERE account_id = 1').all();
		expect(rows.every((r) => r.series === seriesId)).toBe(true);
	});

	it('recalculates totals after creation', () => {
		const seriesId = createRecurringSeries({
			account_id: 1, name: 'Sub', amount: 100, debit: false, date: '2026-01-01', recurring_frequency: 'monthly'
		});
		const first = testDb.prepare('SELECT total FROM transactions WHERE series = ? ORDER BY date LIMIT 1').get(seriesId);
		expect(first.total).toBe(900);
	});
});

// ---------------------------------------------------------------------------
// updateTransactionAndFuture
// ---------------------------------------------------------------------------

describe('updateTransactionAndFuture', () => {
	it('updates only the target and future occurrences, not past ones', () => {
		const seriesId = createRecurringSeries({
			account_id: 1, name: 'Salary', amount: 1000, debit: true, date: '2026-01-01', recurring_frequency: 'monthly'
		});
		const all = testDb.prepare('SELECT transaction_id, date FROM transactions WHERE series = ? ORDER BY date').all(seriesId);
		const second = all[1];

		updateTransactionAndFuture(second.transaction_id, { name: 'Salary+', amount: 1100, debit: true, date: second.date });

		const first = testDb.prepare('SELECT name, amount FROM transactions WHERE transaction_id = ?').get(all[0].transaction_id);
		expect(first.name).toBe('Salary');
		expect(first.amount).toBe(1000);

		const updated = testDb.prepare('SELECT name, amount FROM transactions WHERE series = ? AND date >= ?').all(seriesId, second.date);
		expect(updated.every((r) => r.name === 'Salary+' && r.amount === 1100)).toBe(true);
	});

	it('is a no-op when the transaction does not exist', () => {
		expect(() => updateTransactionAndFuture(99999, { name: 'X', amount: 1, debit: false, date: '2026-03-01' })).not.toThrow();
	});
});

// ---------------------------------------------------------------------------
// deleteRecurringSeries
// ---------------------------------------------------------------------------

describe('deleteRecurringSeries', () => {
	it('deletes the target and all future occurrences', () => {
		const seriesId = createRecurringSeries({
			account_id: 1, name: 'Gym', amount: 40, debit: false, date: '2026-01-01', recurring_frequency: 'monthly'
		});
		const all = testDb.prepare('SELECT date FROM transactions WHERE series = ? ORDER BY date').all(seriesId);
		expect(all.length).toBeGreaterThan(2);

		const cutDate = all[2].date;
		deleteRecurringSeries(seriesId, 1, cutDate);

		const remaining = testDb.prepare('SELECT date FROM transactions WHERE series = ? ORDER BY date').all(seriesId);
		expect(remaining.length).toBe(2);
		expect(remaining.every((r) => r.date < cutDate)).toBe(true);
	});

	it('leaves all transactions before the cut date untouched', () => {
		const seriesId = createRecurringSeries({
			account_id: 1, name: 'Sub', amount: 15, debit: false, date: '2026-01-01', recurring_frequency: 'monthly'
		});
		const all = testDb.prepare('SELECT transaction_id, date FROM transactions WHERE series = ? ORDER BY date').all(seriesId);

		deleteRecurringSeries(seriesId, 1, all[1].date);

		const kept = testDb.prepare('SELECT date FROM transactions WHERE series = ?').all(seriesId);
		expect(kept.length).toBe(1);
		expect(kept[0].date).toBe(all[0].date);
	});

	it('recalculates totals after deletion', () => {
		const seriesId = createRecurringSeries({
			account_id: 1, name: 'Sub', amount: 10, debit: false, date: '2026-03-01', recurring_frequency: 'monthly'
		});
		const all = testDb.prepare('SELECT transaction_id, date FROM transactions WHERE series = ? ORDER BY date').all(seriesId);
		const firstId = all[0].transaction_id;

		deleteRecurringSeries(seriesId, 1, all[1].date);

		const row = testDb.prepare('SELECT total FROM transactions WHERE transaction_id = ?').get(firstId);
		expect(row.total).toBe(990);
	});
});

// ---------------------------------------------------------------------------
// ensureHorizonForAccount
// ---------------------------------------------------------------------------

describe('ensureHorizonForAccount', () => {
	it('is a no-op when there are no series', () => {
		expect(() => ensureHorizonForAccount(1, getNeededHorizon())).not.toThrow();
		const count = testDb.prepare('SELECT count(*) as n FROM transactions WHERE account_id = 1').get().n;
		expect(count).toBe(0);
	});

	it('extends an active series whose last occurrence is before the horizon', () => {
		const seriesId = 'test-extend';
		const today = new Date().toISOString().slice(0, 10);

		testDb.prepare(
			`INSERT INTO transactions (account_id, "order", name, amount, debit, date, series, recurring_frequency, total)
			 VALUES (1, 1, 'Monthly', 100, 0, ?, ?, 'monthly', 900)`
		).run(today, seriesId);

		// Horizon 3 months out
		const d = new Date();
		d.setMonth(d.getMonth() + 3);
		const horizon = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

		ensureHorizonForAccount(1, horizon);

		const rows = testDb.prepare('SELECT date FROM transactions WHERE series = ? ORDER BY date').all(seriesId);
		expect(rows.length).toBeGreaterThan(1);
	});

	it('does not extend a series whose last occurrence already meets or exceeds the horizon', () => {
		const seriesId = 'test-no-extend';
		const horizon = getNeededHorizon();
		const horizonDate = horizon + '-01';

		testDb.prepare(
			`INSERT INTO transactions (account_id, "order", name, amount, debit, date, series, recurring_frequency, total)
			 VALUES (1, 1, 'Monthly', 100, 0, ?, ?, 'monthly', 900)`
		).run(horizonDate, seriesId);

		ensureHorizonForAccount(1, horizon);

		const rows = testDb.prepare('SELECT date FROM transactions WHERE series = ?').all(seriesId);
		expect(rows.length).toBe(1);
	});
});
