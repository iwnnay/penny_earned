import { getDb } from './db/client.js';
import { getMiscCategoryId, setTransactionCategories } from './categories.js';
import { recalculateFromMonth } from './transactions.js';

// ---------------------------------------------------------------------------
// CSV parsing (Chase format)
// ---------------------------------------------------------------------------

/**
 * Parses a Chase bank CSV export.
 * Header: Details,Posting Date,Description,Amount,Type,Balance,Check or Slip #
 *
 * @param {string} text
 * @returns {{ date: string, description: string, amount: number, debit: boolean }[]}
 */
export function parseChaseCSV(text) {
	const lines = text.split(/\r?\n/).filter((l) => l.trim());
	if (lines.length < 2) return [];

	const rows = [];
	for (let i = 1; i < lines.length; i++) {
		const fields = splitCSVLine(lines[i]);
		if (fields.length < 5) continue;

		// columns: Details | Posting Date | Description | Amount | Type | ...
		const rawDate = fields[1].trim();
		const rawDesc = fields[2].trim();
		const rawAmount = parseFloat(fields[3].trim());

		if (!rawDate || isNaN(rawAmount)) continue;

		const date = parseChaseDate(rawDate);
		if (!date) continue;

		const description = normalizeDescription(rawDesc);
		const amount = Math.abs(rawAmount);
		// Chase: positive amount = credit (income); negative = debit (expense)
		// App:   debit = true means credit/income (adds to balance)
		const debit = rawAmount > 0;

		rows.push({ date, description, amount, debit });
	}

	return rows;
}

/**
 * Splits a single CSV line respecting double-quoted fields.
 * @param {string} line
 * @returns {string[]}
 */
function splitCSVLine(line) {
	const fields = [];
	let current = '';
	let inQuotes = false;

	for (let i = 0; i < line.length; i++) {
		const ch = line[i];
		if (ch === '"') {
			if (inQuotes && line[i + 1] === '"') {
				current += '"';
				i++;
			} else {
				inQuotes = !inQuotes;
			}
		} else if (ch === ',' && !inQuotes) {
			fields.push(current);
			current = '';
		} else {
			current += ch;
		}
	}
	fields.push(current);
	return fields;
}

/** Converts M/D/YYYY or MM/DD/YYYY → YYYY-MM-DD. Returns null for unrecognised formats. */
function parseChaseDate(raw) {
	const m = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
	return m ? `${m[3]}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}` : null;
}

/** Collapses internal whitespace and trims a bank description. */
export function normalizeDescription(raw) {
	return raw.replace(/\s+/g, ' ').trim();
}

// ---------------------------------------------------------------------------
// Fingerprinting
// ---------------------------------------------------------------------------

/**
 * Generates a stable unique key for a transaction row.
 * `ordinal` handles multiple identical rows within the same CSV.
 *
 * @param {string} date        YYYY-MM-DD
 * @param {number} amount      positive value
 * @param {boolean} debit
 * @param {string} description normalised
 * @param {number} [ordinal]   0-based index among identical rows
 */
function makeFingerprint(date, amount, debit, description, ordinal = 0) {
	const base = `${date}|${amount.toFixed(2)}|${debit ? 'C' : 'D'}|${description}`;
	return ordinal === 0 ? base : `${base}:${ordinal}`;
}

/**
 * Assigns fingerprints to an array of parsed rows, handling multiple
 * identical rows within the same import file.
 *
 * @param {{ date: string, description: string, amount: number, debit: boolean }[]} rows
 */
function assignFingerprints(rows) {
	/** @type {Map<string, number>} */
	const seen = new Map();
	return rows.map((row) => {
		const base = makeFingerprint(row.date, row.amount, row.debit, row.description);
		const ordinal = seen.get(base) ?? 0;
		seen.set(base, ordinal + 1);
		return { ...row, fingerprint: makeFingerprint(row.date, row.amount, row.debit, row.description, ordinal) };
	});
}

// ---------------------------------------------------------------------------
// Preview
// ---------------------------------------------------------------------------

/**
 * @typedef {{
 *   fingerprint: string,
 *   date: string,
 *   description: string,
 *   amount: number,
 *   debit: boolean,
 *   isDuplicate: boolean,
 *   duplicateReason: 'fingerprint' | 'match' | null,
 *   suggestedCategoryId: number | null,
 *   categorySource: 'rule' | 'default'
 * }} ImportRow
 */

/**
 * Parses the CSV and returns all rows annotated with duplicate status and
 * suggested categories, ready for the review UI.
 *
 * @param {number} accountId
 * @param {string} csvText
 * @returns {{ rows: ImportRow[], miscCategoryId: number | null }}
 */
export function previewImport(accountId, csvText) {
	const parsed = parseChaseCSV(csvText);
	const withPrints = assignFingerprints(parsed);

	const db = getDb();
	const miscId = getMiscCategoryId() ?? null;

	// Existing import fingerprints for this account
	const existingPrints = new Set(
		db
			.prepare(
				'SELECT import_fingerprint FROM transactions WHERE account_id = ? AND import_fingerprint IS NOT NULL'
			)
			.pluck()
			.all(accountId)
	);

	// User-saved category rules for this account
	const ruleRows = db
		.prepare('SELECT import_description, category_id FROM import_category_rules WHERE account_id = ?')
		.all(accountId);
	/** @type {Map<string, number>} */
	const ruleMap = new Map(ruleRows.map((r) => [r.import_description, r.category_id]));

	const rows = withPrints.map((row) => {
		// Primary dedup: fingerprint match (previously imported)
		let isDuplicate = existingPrints.has(row.fingerprint);
		let duplicateReason = isDuplicate ? /** @type {'fingerprint'} */ ('fingerprint') : null;

		// Secondary dedup: same date + amount + direction but no fingerprint (manual entry)
		if (!isDuplicate) {
			const match = db
				.prepare(
					`SELECT 1 FROM transactions
					 WHERE account_id = ? AND date = ? AND amount = ? AND debit = ?
					   AND import_fingerprint IS NULL
					 LIMIT 1`
				)
				.get(accountId, row.date, row.amount, row.debit ? 1 : 0);
			if (match) {
				isDuplicate = true;
				duplicateReason = 'match';
			}
		}

		const ruleCatId = ruleMap.get(row.description) ?? null;
		return /** @type {ImportRow} */ ({
			fingerprint: row.fingerprint,
			date: row.date,
			description: row.description,
			amount: row.amount,
			debit: row.debit,
			isDuplicate,
			duplicateReason,
			suggestedCategoryId: ruleCatId ?? miscId,
			categorySource: ruleCatId ? 'rule' : 'default'
		});
	});

	return { rows, miscCategoryId: miscId };
}

// ---------------------------------------------------------------------------
// Confirm (bulk insert)
// ---------------------------------------------------------------------------

/**
 * Inserts approved transactions in bulk, then runs one recalculate pass from
 * the earliest inserted date. Also persists any category rules.
 *
 * @param {number} accountId
 * @param {{
 *   fingerprint: string,
 *   date: string,
 *   name: string,
 *   amount: number,
 *   debit: boolean,
 *   categoryId: number | null,
 *   saveRule: boolean
 * }[]} transactions
 * @returns {{ count: number, earliestDate: string | null }}
 */
export function confirmImport(accountId, transactions) {
	if (transactions.length === 0) return { count: 0, earliestDate: null };

	const db = getDb();
	const miscId = getMiscCategoryId();

	const insertTx = db.prepare(
		`INSERT INTO transactions (account_id, "order", name, amount, debit, date, total, import_fingerprint)
		 VALUES (?, 0, ?, ?, ?, ?, 0, ?)`
	);

	const upsertRule = db.prepare(
		`INSERT INTO import_category_rules (account_id, import_description, category_id)
		 VALUES (?, ?, ?)
		 ON CONFLICT(account_id, import_description) DO UPDATE SET category_id = excluded.category_id`
	);

	let earliestDate = null;

	db.transaction(() => {
		for (const tx of transactions) {
			const result = insertTx.run(
				accountId,
				tx.name,
				tx.amount,
				tx.debit ? 1 : 0,
				tx.date,
				tx.fingerprint
			);
			const txId = result.lastInsertRowid;
			const catId = tx.categoryId ?? miscId;
			if (catId) setTransactionCategories(txId, [catId]);

			if (tx.saveRule && tx.categoryId) {
				upsertRule.run(accountId, tx.name, tx.categoryId);
			}

			if (!earliestDate || tx.date < earliestDate) earliestDate = tx.date;
		}
	})();

	if (earliestDate) {
		const [year, month] = earliestDate.split('-').map(Number);
		recalculateFromMonth(accountId, year, month);
	}

	return { count: transactions.length, earliestDate };
}
