import { v4 as uuidv4 } from 'uuid';
import { getDb } from './db/client.js';
import { setTransactionCategories, getMiscCategoryId } from './categories.js';
import { HORIZON_MONTHS } from '$lib/shared/constants.js';

// ---------------------------------------------------------------------------
// Horizon helpers
// ---------------------------------------------------------------------------

/** Returns the YYYY-MM string {@link HORIZON_MONTHS} months from today — the generation horizon. */
export function getNeededHorizon() {
	const d = new Date();
	d.setMonth(d.getMonth() + HORIZON_MONTHS);
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Extends every active recurring series for this account whose last generated
 * occurrence falls before `neededHorizon`, then recalculates from the earliest
 * new row.
 *
 * Series that were intentionally ended (last date well in the past) are skipped
 * because their last_date will be far behind any active horizon.
 *
 * @param {number} accountId
 * @param {string} neededHorizon  YYYY-MM
 */
export function ensureHorizonForAccount(accountId, neededHorizon) {
	const db = getDb();

	// Upper bound: last day of the horizon month.
	const horizonEnd = new Date(neededHorizon + '-01T00:00:00');
	horizonEnd.setMonth(horizonEnd.getMonth() + 1);
	horizonEnd.setDate(horizonEnd.getDate() - 1);

	// Only extend series whose last occurrence is within the past 25 months —
	// series the user intentionally ended will have much earlier last dates.
	const activeFloor = new Date();
	activeFloor.setMonth(activeFloor.getMonth() - 1);
	const activeFloorStr = activeFloor.toISOString().slice(0, 10);

	const seriesList = db
		.prepare(
			`SELECT series, recurring_frequency, name, amount, debit, MAX(date) as last_date
             FROM transactions
             WHERE account_id = ? AND series IS NOT NULL
             GROUP BY series
             HAVING last_date >= ? AND last_date < ?`
		)
		.all(accountId, activeFloorStr, neededHorizon + '-01');

	if (seriesList.length === 0) {
		return;
	}

	const insertStmt = db.prepare(
		`INSERT INTO transactions (account_id, "order", name, amount, debit, date, series, recurring_frequency, total)
         VALUES (?, 0, ?, ?, ?, ?, ?, ?, 0)`
	);

	let earliestNewDate = null;

	db.transaction(() => {
		for (const s of seriesList) {
			const next = nextOccurrence(new Date(s.last_date + 'T00:00:00'), s.recurring_frequency);
			if (next > horizonEnd) {
				continue;
			}
			const newDates = expandDates(next.toISOString().slice(0, 10), s.recurring_frequency, horizonEnd);
			for (const d of newDates) {
				insertStmt.run(accountId, s.name, s.amount, s.debit, d, s.series, s.recurring_frequency);
				if (!earliestNewDate || d < earliestNewDate) {
					earliestNewDate = d;
				}
			}
		}
	})();

	if (earliestNewDate) {
		const [year, month] = earliestNewDate.split('-').map(Number);
		recalculateFromMonth(accountId, year, month);
	}
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/**
 * @param {number} accountId
 * @param {number} year
 * @param {number} month  1-based
 * @returns {import('../shared/types.js').Transaction[]}
 */
export function getTransactionsForMonth(accountId, year, month) {
	const start = `${year}-${String(month).padStart(2, '0')}-01`;
	const end = `${year}-${String(month).padStart(2, '0')}-31`;
	return getDb()
		.prepare(
			`SELECT * FROM transactions
             WHERE account_id = ? AND date BETWEEN ? AND ?
             ORDER BY "order"`
		)
		.all(accountId, start, end);
}

/**
 * Returns the minimum and maximum end-of-month balance from `fromYearMonth`
 * through the horizon, along with the YYYY-MM they occur in.
 *
 * "End-of-month balance" is the `total` on the last transaction of each month
 * (determined by the highest `order` value, which is account-scoped and
 * monotonically increasing).
 *
 * Returns `null` when there are no transactions from that month onward.
 *
 * @param {number} accountId
 * @param {string} fromYearMonth  YYYY-MM
 * @returns {{ min: { total: number, month: string }, max: { total: number, month: string } } | null}
 */
export function getBalanceExtremes(accountId, fromYearMonth) {
	const db = getDb();
	const fromDate = fromYearMonth + '-01';

	const rows = db
		.prepare(
			`WITH last_per_month AS (
                SELECT substr(date, 1, 7) AS ym, MAX("order") AS max_ord
                FROM transactions
                WHERE account_id = ? AND date >= ?
                GROUP BY ym
            )
            SELECT t.date, t.total
            FROM transactions t
            JOIN last_per_month lpm ON t."order" = lpm.max_ord AND t.account_id = ?
            ORDER BY t.total ASC`
		)
		.all(accountId, fromDate, accountId);

	if (rows.length === 0) {
		return null;
	}

	const minRow = rows[0];
	const maxRow = rows[rows.length - 1];
	return {
		min: { total: minRow.total, month: minRow.date.slice(0, 7) },
		max: { total: maxRow.total, month: maxRow.date.slice(0, 7) }
	};
}

// ---------------------------------------------------------------------------
// Recalculation
// ---------------------------------------------------------------------------

/**
 * Reorders and recalculates running totals for all transactions from the given
 * month forward. Within a day, withdrawals (debit=0) sort before debits (debit=1)
 * so they reflect an accurate intra-day ledger order.
 *
 * This is called after every mutation that affects amounts or dates.
 *
 * @param {number} accountId
 * @param {number} year
 * @param {number} month  1-based
 */
export function recalculateFromMonth(accountId, year, month) {
	const db = getDb();
	const startDate = `${year}-${String(month).padStart(2, '0')}-01`;

	const rows = db
		.prepare(
			`SELECT * FROM transactions
             WHERE account_id = ? AND date >= ?
             ORDER BY date ASC, debit ASC, transaction_id ASC`
		)
		.all(accountId, startDate);

	if (rows.length === 0) {
		return;
	}

	let runningTotal = getPreviousMonthEndTotal(accountId, year, month);
	let orderCounter = getOrderOffset(accountId, startDate);
	const updates = [];

	for (const row of rows) {
		orderCounter++;
		runningTotal = row.debit ? runningTotal + row.amount : runningTotal - row.amount;
		updates.push({ transaction_id: row.transaction_id, order: orderCounter, total: runningTotal });
	}

	const updateStmt = db.prepare('UPDATE transactions SET "order" = ?, total = ? WHERE transaction_id = ?');
	db.transaction(() => {
		for (const u of updates) {
			updateStmt.run(u.order, u.total, u.transaction_id);
		}
	})();
}

// ---------------------------------------------------------------------------
// Mutations — single transactions
// ---------------------------------------------------------------------------

/**
 * @param {{
 *   account_id: number,
 *   name: string,
 *   amount: number,
 *   debit: boolean,
 *   date: string,
 *   categories?: number[],
 *   series?: string | null,
 *   recurring_frequency?: string | null
 * }} data
 * @returns {number | bigint} The new transaction_id.
 */
export function createTransaction(data) {
	const db = getDb();
	const categoryIds = resolvedCategoryIds(data.categories);

	const transactionId = db.transaction(() => {
		const result = db
			.prepare(
				`INSERT INTO transactions (account_id, "order", name, amount, debit, date, series, recurring_frequency, total)
                 VALUES (?, 0, ?, ?, ?, ?, ?, ?, 0)`
			)
			.run(data.account_id, data.name, data.amount, data.debit ? 1 : 0, data.date, data.series ?? null, data.recurring_frequency ?? null);

		const id = result.lastInsertRowid;
		if (categoryIds.length > 0) {
			setTransactionCategories(id, categoryIds);
		}
		return id;
	})();

	const [year, month] = data.date.split('-').map(Number);
	recalculateFromMonth(data.account_id, year, month);

	return transactionId;
}

/**
 * Updates a single transaction and recalculates from the earliest affected month.
 * When the transaction belongs to a series, categories are propagated to all
 * occurrences in that series.
 *
 * @param {number} transactionId
 * @param {{ name: string, amount: number, debit: boolean, date: string, categories?: number[] }} data
 */
export function updateTransaction(transactionId, data) {
	const db = getDb();
	const old = db.prepare('SELECT account_id, date, series FROM transactions WHERE transaction_id = ?').get(transactionId);
	if (!old) {
		return;
	}

	db.transaction(() => {
		db.prepare('UPDATE transactions SET name = ?, amount = ?, debit = ?, date = ? WHERE transaction_id = ?').run(
			data.name,
			data.amount,
			data.debit ? 1 : 0,
			data.date,
			transactionId
		);
		if (data.categories) {
			applyCategories(db, transactionId, old.series, old.account_id, data.categories);
		}
	})();

	// Recalculate from whichever month is earlier — old date or new date
	const earliest = old.date < data.date ? old.date : data.date;
	const [year, month] = earliest.split('-').map(Number);
	recalculateFromMonth(old.account_id, year, month);
}

/**
 * Deletes a single transaction and recalculates from that month forward.
 * @param {number} transactionId
 */
export function deleteTransaction(transactionId) {
	const db = getDb();
	const row = db.prepare('SELECT account_id, date FROM transactions WHERE transaction_id = ?').get(transactionId);
	if (!row) {
		return;
	}
	db.prepare('DELETE FROM transactions WHERE transaction_id = ?').run(transactionId);
	const [year, month] = row.date.split('-').map(Number);
	recalculateFromMonth(row.account_id, year, month);
}

// ---------------------------------------------------------------------------
// Mutations — recurring series
// ---------------------------------------------------------------------------

/**
 * Creates a recurring series of transactions from `data.date` up to
 * {@link HORIZON_MONTHS} months out, then recalculates from the first occurrence.
 *
 * @param {{
 *   account_id: number,
 *   name: string,
 *   amount: number,
 *   debit: boolean,
 *   date: string,
 *   categories?: number[],
 *   recurring_frequency: string
 * }} data
 * @returns {string} The UUID series identifier.
 */
export function createRecurringSeries(data) {
	const seriesId = uuidv4();
	const db = getDb();

	const horizon = new Date(data.date + 'T00:00:00');
	horizon.setMonth(horizon.getMonth() + HORIZON_MONTHS);

	const dates = expandDates(data.date, data.recurring_frequency, horizon);
	const categoryIds = resolvedCategoryIds(data.categories);

	const insertStmt = db.prepare(
		`INSERT INTO transactions (account_id, "order", name, amount, debit, date, series, recurring_frequency, total)
         VALUES (?, 0, ?, ?, ?, ?, ?, ?, 0)`
	);

	db.transaction(() => {
		for (const d of dates) {
			const result = insertStmt.run(data.account_id, data.name, data.amount, data.debit ? 1 : 0, d, seriesId, data.recurring_frequency);
			if (categoryIds.length > 0) {
				setTransactionCategories(result.lastInsertRowid, categoryIds);
			}
		}
	})();

	const [year, month] = data.date.split('-').map(Number);
	recalculateFromMonth(data.account_id, year, month);

	return seriesId;
}

/**
 * Updates this transaction and all future occurrences in the same series.
 * For future occurrences only name, amount, and debit are propagated — each
 * keeps its own date. Categories are synced across the entire series.
 *
 * @param {number} transactionId
 * @param {{ name: string, amount: number, debit: boolean, date: string, categories?: number[] }} data
 */
export function updateTransactionAndFuture(transactionId, data) {
	const db = getDb();
	const old = db.prepare('SELECT account_id, date, series FROM transactions WHERE transaction_id = ?').get(transactionId);
	if (!old) {
		return;
	}

	db.transaction(() => {
		db.prepare('UPDATE transactions SET name = ?, amount = ?, debit = ?, date = ? WHERE transaction_id = ?').run(
			data.name,
			data.amount,
			data.debit ? 1 : 0,
			data.date,
			transactionId
		);
		if (old.series) {
			db.prepare(
				'UPDATE transactions SET name = ?, amount = ?, debit = ? WHERE series = ? AND account_id = ? AND date > ? AND transaction_id != ?'
			).run(data.name, data.amount, data.debit ? 1 : 0, old.series, old.account_id, old.date, transactionId);
		}
		if (data.categories) {
			applyCategories(db, transactionId, old.series, old.account_id, data.categories);
		}
	})();

	const earliest = old.date < data.date ? old.date : data.date;
	const [year, month] = earliest.split('-').map(Number);
	recalculateFromMonth(old.account_id, year, month);
}

/**
 * Deletes the clicked transaction and every future occurrence in the same series
 * (date >= fromDate). Past occurrences are left untouched.
 *
 * @param {string} seriesId
 * @param {number} accountId
 * @param {string} fromDate  YYYY-MM-DD — the date of the clicked transaction
 */
export function deleteRecurringSeries(seriesId, accountId, fromDate) {
	const db = getDb();
	db.prepare('DELETE FROM transactions WHERE series = ? AND account_id = ? AND date >= ?').run(seriesId, accountId, fromDate);
	const [year, month] = fromDate.split('-').map(Number);
	recalculateFromMonth(accountId, year, month);
}

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

/**
 * Normalises a category ID list: falls back to the Misc category when the list
 * is empty or absent.
 * @param {number[] | undefined} categoryIds
 * @returns {number[]}
 */
function resolvedCategoryIds(categoryIds) {
	if (categoryIds && categoryIds.length > 0) {
		return categoryIds;
	}
	const miscId = getMiscCategoryId();
	return miscId ? [miscId] : [];
}

/**
 * Applies categories to a transaction. When the transaction belongs to a series,
 * categories are synced across all occurrences in the series.
 *
 * @param {import('better-sqlite3').Database} db
 * @param {number | bigint} transactionId
 * @param {string | null} series
 * @param {number} accountId
 * @param {number[]} categoryIds
 */
function applyCategories(db, transactionId, series, accountId, categoryIds) {
	if (series) {
		const seriesTxIds = db.prepare('SELECT transaction_id FROM transactions WHERE series = ? AND account_id = ?').all(series, accountId);
		for (const row of seriesTxIds) {
			setTransactionCategories(row.transaction_id, categoryIds);
		}
	} else {
		setTransactionCategories(transactionId, categoryIds);
	}
}

/**
 * Returns the running total at the end of the month before (year, month), or
 * the account's `starting_amount` when there are no prior transactions.
 * @param {number} accountId
 * @param {number} year
 * @param {number} month  1-based
 */
function getPreviousMonthEndTotal(accountId, year, month) {
	const endOfPrevMonth = prevMonthEnd(year, month);
	const row = getDb()
		.prepare(
			`SELECT total FROM transactions
             WHERE account_id = ? AND date <= ?
             ORDER BY date DESC, "order" DESC
             LIMIT 1`
		)
		.get(accountId, endOfPrevMonth);

	if (row) {
		return row.total;
	}
	const account = getDb().prepare('SELECT starting_amount FROM accounts WHERE account_id = ?').get(accountId);
	return account?.starting_amount ?? 0;
}

/**
 * Returns the highest `order` value among transactions that fall before
 * `startDate` for this account (used as the offset when reordering).
 * @param {number} accountId
 * @param {string} startDate YYYY-MM-DD
 */
function getOrderOffset(accountId, startDate) {
	const row = getDb()
		.prepare(`SELECT MAX("order") as max_order FROM transactions WHERE account_id = ? AND date < ?`)
		.get(accountId, startDate);
	return row?.max_order ?? 0;
}

/**
 * Returns the last day of the month preceding (year, month) as YYYY-MM-DD.
 * e.g. prevMonthEnd(2026, 3) → '2026-02-28'
 * @param {number} year
 * @param {number} month  1-based
 */
function prevMonthEnd(year, month) {
	const d = new Date(year, month - 1, 0); // day=0 → last day of prior month
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Generates all occurrence dates from `startDate` up to (and including)
 * `horizon` for the given frequency.
 * @param {string} startDate  YYYY-MM-DD
 * @param {string} frequency
 * @param {Date} horizon
 * @returns {string[]}
 */
function expandDates(startDate, frequency, horizon) {
	const dates = [];
	let current = new Date(startDate + 'T00:00:00');
	while (current <= horizon) {
		dates.push(current.toISOString().slice(0, 10));
		current = nextOccurrence(current, frequency);
	}
	return dates;
}

/**
 * Advances `date` by one period according to `frequency`.
 * @param {Date} date
 * @param {string} frequency
 * @returns {Date}
 */
function nextOccurrence(date, frequency) {
	const d = new Date(date);
	switch (frequency) {
		case 'daily':
			d.setDate(d.getDate() + 1);
			break;
		case 'weekly':
			d.setDate(d.getDate() + 7);
			break;
		case 'bi-weekly':
			d.setDate(d.getDate() + 14);
			break;
		case 'monthly':
			d.setMonth(d.getMonth() + 1);
			break;
		case '1st-and-15th':
			if (d.getDate() < 15) {
				d.setDate(15);
			} else {
				d.setMonth(d.getMonth() + 1);
				d.setDate(1);
			}
			break;
		case 'quarterly':
			d.setMonth(d.getMonth() + 3);
			break;
		default:
			d.setMonth(d.getMonth() + 1);
	}
	return d;
}
