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

const {
	getMiscCategoryId,
	getMainCategories,
	getSubcategories,
	ensureCategory,
	setTransactionCategories,
	getCategoriesForTransactions
} = await import('$lib/server/categories.js');

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

/** Inserts a bare transaction and returns its id. */
function insertTx(db, date = '2026-01-01') {
	return db
		.prepare(`INSERT INTO transactions (account_id, "order", name, amount, debit, date, total) VALUES (1, 1, 'Tx', 50, 0, ?, 950)`)
		.run(date).lastInsertRowid;
}

beforeEach(() => {
	testDb = freshDb();
});

afterEach(() => {
	testDb.close();
});

// ---------------------------------------------------------------------------
// getMiscCategoryId
// ---------------------------------------------------------------------------

describe('getMiscCategoryId', () => {
	it('returns a number for the seeded Misc category', () => {
		const id = getMiscCategoryId();
		expect(typeof id).toBe('number');
	});

	it('returns the same id on repeated calls', () => {
		expect(getMiscCategoryId()).toBe(getMiscCategoryId());
	});
});

// ---------------------------------------------------------------------------
// getMainCategories
// ---------------------------------------------------------------------------

describe('getMainCategories', () => {
	it('returns the seeded global categories', () => {
		const cats = getMainCategories();
		expect(cats.length).toBeGreaterThan(0);
		expect(cats.some((c) => c.name === 'Misc')).toBe(true);
		expect(cats.some((c) => c.name === 'Food')).toBe(true);
	});

	it('returns only global categories (account_id IS NULL)', () => {
		const cats = getMainCategories();
		expect(cats.every((c) => c.account_id === null)).toBe(true);
	});

	it('returns categories sorted by name', () => {
		const cats = getMainCategories();
		const names = cats.map((c) => c.name);
		expect(names).toEqual([...names].sort());
	});
});

// ---------------------------------------------------------------------------
// getSubcategories
// ---------------------------------------------------------------------------

describe('getSubcategories', () => {
	it('returns an empty array when the account has no subcategories', () => {
		expect(getSubcategories(1)).toEqual([]);
	});

	it('returns account-specific subcategories', () => {
		testDb.prepare('INSERT INTO categories (name, account_id) VALUES (?, ?)').run('MyCustom', 1);
		const cats = getSubcategories(1);
		expect(cats.some((c) => c.name === 'MyCustom')).toBe(true);
	});

	it('does not include global main categories', () => {
		const cats = getSubcategories(1);
		expect(cats.every((c) => c.account_id !== null)).toBe(true);
	});

	it('does not include subcategories from other accounts', () => {
		testDb.prepare('INSERT INTO accounts (user_id, name, type, interest_rate, starting_amount, starting_date) VALUES (?, ?, ?, ?, ?, ?)').run(1, 'Other', 'savings', 0, 0, '2026-01-01');
		testDb.prepare('INSERT INTO categories (name, account_id) VALUES (?, ?)').run('OtherTag', 2);
		const cats = getSubcategories(1);
		expect(cats.every((c) => c.account_id === 1)).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// ensureCategory
// ---------------------------------------------------------------------------

describe('ensureCategory', () => {
	it('returns the existing global category id without creating a duplicate', () => {
		const id1 = ensureCategory('Misc', null);
		const id2 = ensureCategory('Misc', null);
		expect(id1).toBe(id2);
		const count = testDb.prepare("SELECT count(*) as n FROM categories WHERE name = 'Misc' AND account_id IS NULL").get().n;
		expect(count).toBe(1);
	});

	it('creates a new account-specific category when it does not exist', () => {
		const id = ensureCategory('Custom Cat', 1);
		expect(typeof id).toBe('number');
		const row = testDb.prepare('SELECT * FROM categories WHERE category_id = ?').get(id);
		expect(row.name).toBe('Custom Cat');
		expect(row.account_id).toBe(1);
	});

	it('returns the same id on repeated calls for the same name and account', () => {
		const id1 = ensureCategory('Tag', 1);
		const id2 = ensureCategory('Tag', 1);
		expect(id1).toBe(id2);
	});

	it('creates distinct categories for different accounts with the same name', () => {
		testDb.prepare('INSERT INTO accounts (user_id, name, type, interest_rate, starting_amount, starting_date) VALUES (?, ?, ?, ?, ?, ?)').run(1, 'Savings', 'savings', 0, 0, '2026-01-01');
		const id1 = ensureCategory('Tag', 1);
		const id2 = ensureCategory('Tag', 2);
		expect(id1).not.toBe(id2);
	});
});

// ---------------------------------------------------------------------------
// setTransactionCategories
// ---------------------------------------------------------------------------

describe('setTransactionCategories', () => {
	it('inserts category associations for a transaction', () => {
		const txId = insertTx(testDb);
		const catId = testDb.prepare("SELECT category_id FROM categories WHERE name = 'Misc'").get().category_id;
		setTransactionCategories(txId, [catId]);

		const rows = testDb.prepare('SELECT category_id FROM transaction_categories WHERE transaction_id = ?').all(txId);
		expect(rows.length).toBe(1);
		expect(rows[0].category_id).toBe(catId);
	});

	it('replaces existing categories on re-call', () => {
		const txId = insertTx(testDb);
		const food = testDb.prepare("SELECT category_id FROM categories WHERE name = 'Food'").get().category_id;
		const misc = testDb.prepare("SELECT category_id FROM categories WHERE name = 'Misc'").get().category_id;

		setTransactionCategories(txId, [food]);
		setTransactionCategories(txId, [misc]);

		const rows = testDb.prepare('SELECT category_id FROM transaction_categories WHERE transaction_id = ?').all(txId);
		expect(rows.length).toBe(1);
		expect(rows[0].category_id).toBe(misc);
	});

	it('handles multiple categories at once', () => {
		const txId = insertTx(testDb);
		const food = testDb.prepare("SELECT category_id FROM categories WHERE name = 'Food'").get().category_id;
		const misc = testDb.prepare("SELECT category_id FROM categories WHERE name = 'Misc'").get().category_id;

		setTransactionCategories(txId, [food, misc]);

		const rows = testDb.prepare('SELECT category_id FROM transaction_categories WHERE transaction_id = ?').all(txId);
		expect(rows.length).toBe(2);
	});

	it('handles an empty category list (clears all categories)', () => {
		const txId = insertTx(testDb);
		const catId = testDb.prepare("SELECT category_id FROM categories WHERE name = 'Misc'").get().category_id;
		setTransactionCategories(txId, [catId]);
		setTransactionCategories(txId, []);

		const rows = testDb.prepare('SELECT * FROM transaction_categories WHERE transaction_id = ?').all(txId);
		expect(rows.length).toBe(0);
	});
});

// ---------------------------------------------------------------------------
// getCategoriesForTransactions
// ---------------------------------------------------------------------------

describe('getCategoriesForTransactions', () => {
	it('returns an empty object for empty input', () => {
		expect(getCategoriesForTransactions([])).toEqual({});
	});

	it('returns a key for every requested transaction id, even with no categories', () => {
		const txId = insertTx(testDb);
		const result = getCategoriesForTransactions([txId]);
		expect(result[txId]).toBeDefined();
		expect(result[txId].categories).toEqual([]);
	});

	it('sets is_main=true for global categories (account_id IS NULL)', () => {
		const txId = insertTx(testDb);
		const miscId = testDb.prepare("SELECT category_id FROM categories WHERE name = 'Misc'").get().category_id;
		testDb.prepare('INSERT INTO transaction_categories (transaction_id, category_id) VALUES (?, ?)').run(txId, miscId);

		const result = getCategoriesForTransactions([txId]);
		expect(result[txId].categories[0].is_main).toBe(true);
	});

	it('sets is_main=false for account-specific subcategories', () => {
		const txId = insertTx(testDb);
		const subId = testDb.prepare('INSERT INTO categories (name, account_id) VALUES (?, ?)').run('MyTag', 1).lastInsertRowid;
		testDb.prepare('INSERT INTO transaction_categories (transaction_id, category_id) VALUES (?, ?)').run(txId, subId);

		const result = getCategoriesForTransactions([txId]);
		expect(result[txId].categories[0].is_main).toBe(false);
	});

	it('returns categories for multiple transactions in one call', () => {
		const tx1 = insertTx(testDb, '2026-01-01');
		const tx2 = insertTx(testDb, '2026-01-02');
		const catId = testDb.prepare("SELECT category_id FROM categories WHERE name = 'Food'").get().category_id;
		testDb.prepare('INSERT INTO transaction_categories (transaction_id, category_id) VALUES (?, ?)').run(tx1, catId);

		const result = getCategoriesForTransactions([tx1, tx2]);
		expect(result[tx1].categories.length).toBe(1);
		expect(result[tx2].categories.length).toBe(0);
	});
});
