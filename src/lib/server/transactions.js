import { v4 as uuidv4 } from 'uuid';
import { getDb } from './db/client.js';

/** Returns the YYYY-MM string 24 months from today — the generation horizon. */
export function getNeededHorizon() {
    const d = new Date();
    d.setMonth(d.getMonth() + 24);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Finds every recurring series for the account whose last generated occurrence
 * falls before the needed horizon and extends it, then recalculates.
 * Series that were intentionally ended (last date well in the past) are skipped
 * because their last_date will be far behind any active horizon.
 * @param {number} accountId
 * @param {string} neededHorizon  YYYY-MM
 */
export function ensureHorizonForAccount(accountId, neededHorizon) {
    const db = getDb();
    // Use the last day of the horizon month as a generous upper bound.
    const horizonEnd = new Date(neededHorizon + '-01T00:00:00');
    horizonEnd.setMonth(horizonEnd.getMonth() + 1);
    horizonEnd.setDate(horizonEnd.getDate() - 1);

    // Only extend series whose last occurrence is within the past 25 months —
    // i.e. series that were actively generated and have reached (or nearly reached)
    // the previous horizon. Series the user ended months ago will have much earlier
    // last dates and will be skipped.
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

    const stmt = db.prepare(
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
                stmt.run(accountId, s.name, s.amount, s.debit, d, s.series, s.recurring_frequency);
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
 * Returns the running total at the end of the month before the given month,
 * or the account's starting_amount if there are no prior transactions.
 * @param {number} accountId
 * @param {number} year
 * @param {number} month  1-based
 */
function getPreviousMonthEndTotal(accountId, year, month) {
    const endOfPrevMonth = getPrevMonthEnd(year, month);
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
    // Fall back to the account's starting_amount
    const account = getDb().prepare('SELECT starting_amount FROM accounts WHERE account_id = ?').get(accountId);
    return account ? account.starting_amount : 0;
}

/**
 * Returns the last day of the month before (year, month).
 * @param {number} year
 * @param {number} month  1-based
 */
function getPrevMonthEnd(year, month) {
    // month is 1-based; day=0 gives last day of (month-1)
    const d = new Date(year, month - 1, 0);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Parse YYYY-MM from a YYYY-MM-DD string.
 * @param {string} date
 */
function yearMonth(date) {
    return date.slice(0, 7);
}

/**
 * Recalculate order and total for all transactions in the given month and every
 * subsequent month that has transactions for this account.
 * @param {number} accountId
 * @param {number} year
 * @param {number} month  1-based
 */
export function recalculateFromMonth(accountId, year, month) {
    const db = getDb();
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;

    // Fetch all transactions from this month forward, sorted for ordering:
    // within a day withdrawals (debit=0) come before debits (debit=1)
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
    const runUpdates = db.transaction(() => {
        for (const u of updates) {
            updateStmt.run(u.order, u.total, u.transaction_id);
        }
    });
    runUpdates();
}

/**
 * Returns the highest order value among transactions before startDate for this account.
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
 * @param {{
 *   account_id: number,
 *   name: string,
 *   amount: number,
 *   debit: boolean,
 *   date: string,
 *   series?: string | null,
 *   recurring_frequency?: string | null
 * }} data
 */
export function createTransaction(data) {
    const db = getDb();
    // Temporary order=0; recalculation will assign the real value
    const stmt = db.prepare(
        `INSERT INTO transactions (account_id, "order", name, amount, debit, date, series, recurring_frequency, total)
         VALUES (?, 0, ?, ?, ?, ?, ?, ?, 0)`
    );
    const result = stmt.run(
        data.account_id,
        data.name,
        data.amount,
        data.debit ? 1 : 0,
        data.date,
        data.series ?? null,
        data.recurring_frequency ?? null
    );

    const [year, month] = data.date.split('-').map(Number);
    recalculateFromMonth(data.account_id, year, month);

    return result.lastInsertRowid;
}

/**
 * Creates a recurring series of transactions from startDate up to 24 months out.
 * @param {{
 *   account_id: number,
 *   name: string,
 *   amount: number,
 *   debit: boolean,
 *   date: string,
 *   recurring_frequency: string
 * }} data
 */
export function createRecurringSeries(data) {
    const seriesId = uuidv4();
    const db = getDb();
    const horizon = new Date(data.date);
    horizon.setMonth(horizon.getMonth() + 24);

    const dates = expandDates(data.date, data.recurring_frequency, horizon);

    const stmt = db.prepare(
        `INSERT INTO transactions (account_id, "order", name, amount, debit, date, series, recurring_frequency, total)
         VALUES (?, 0, ?, ?, ?, ?, ?, ?, 0)`
    );
    const insertAll = db.transaction(() => {
        for (const d of dates) {
            stmt.run(data.account_id, data.name, data.amount, data.debit ? 1 : 0, d, seriesId, data.recurring_frequency);
        }
    });
    insertAll();

    // Recalculate from the first occurrence's month
    const [year, month] = data.date.split('-').map(Number);
    recalculateFromMonth(data.account_id, year, month);

    return seriesId;
}

/**
 * Updates a single transaction and recalculates from the earliest affected month.
 * @param {number} transactionId
 * @param {{ name: string, amount: number, debit: boolean, date: string }} data
 */
export function updateTransaction(transactionId, data) {
    const db = getDb();
    const old = db.prepare('SELECT account_id, date FROM transactions WHERE transaction_id = ?').get(transactionId);
    if (!old) {
        return;
    }
    db.prepare('UPDATE transactions SET name = ?, amount = ?, debit = ?, date = ? WHERE transaction_id = ?').run(
        data.name,
        data.amount,
        data.debit ? 1 : 0,
        data.date,
        transactionId
    );
    // Recalculate from whichever month is earlier — old date or new date
    const earliest = old.date < data.date ? old.date : data.date;
    const [year, month] = earliest.split('-').map(Number);
    recalculateFromMonth(old.account_id, year, month);
}

/**
 * Updates this transaction and all future transactions in the same recurring series
 * (same series UUID, date >= this transaction's original date).
 * Future occurrences keep their own dates; only name, amount, and debit are propagated.
 * @param {number} transactionId
 * @param {{ name: string, amount: number, debit: boolean, date: string }} data
 */
export function updateTransactionAndFuture(transactionId, data) {
    const db = getDb();
    const old = db.prepare('SELECT account_id, date, series FROM transactions WHERE transaction_id = ?').get(transactionId);
    if (!old) {
        return;
    }

    const updateThis = db.prepare('UPDATE transactions SET name = ?, amount = ?, debit = ?, date = ? WHERE transaction_id = ?');
    const updateFuture = db.prepare(
        'UPDATE transactions SET name = ?, amount = ?, debit = ? WHERE series = ? AND account_id = ? AND date > ? AND transaction_id != ?'
    );

    db.transaction(() => {
        updateThis.run(data.name, data.amount, data.debit ? 1 : 0, data.date, transactionId);
        if (old.series) {
            updateFuture.run(data.name, data.amount, data.debit ? 1 : 0, old.series, old.account_id, old.date, transactionId);
        }
    })();

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

/**
 * Deletes the given transaction and all future transactions in the same recurring series
 * (date >= fromDate), then recalculates from that month forward.
 * Past occurrences are left untouched.
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

/**
 * Generate all occurrence dates from startDate up to (but not exceeding) horizon.
 * @param {string} startDate YYYY-MM-DD
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
        case '1st-and-15th': {
            if (d.getDate() < 15) {
                d.setDate(15);
            } else {
                d.setMonth(d.getMonth() + 1);
                d.setDate(1);
            }
            break;
        }
        case 'quarterly':
            d.setMonth(d.getMonth() + 3);
            break;
        default:
            d.setMonth(d.getMonth() + 1);
    }
    return d;
}
