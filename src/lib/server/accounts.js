import { getDb } from './db/client.js';

/** @param {number} userId */
export function listAccounts(userId) {
    return getDb().prepare('SELECT * FROM accounts WHERE user_id = ? ORDER BY account_id').all(userId);
}

/** @param {number} accountId @param {number} userId */
export function getAccount(accountId, userId) {
    return getDb().prepare('SELECT * FROM accounts WHERE account_id = ? AND user_id = ?').get(accountId, userId) ?? null;
}

/**
 * @param {{ user_id: number, name: string, type: string, interest_rate: number, starting_amount: number, starting_date: string }} data
 */
export function createAccount(data) {
    const stmt = getDb().prepare(
        'INSERT INTO accounts (user_id, name, type, interest_rate, starting_amount, starting_date) VALUES (?, ?, ?, ?, ?, ?)'
    );
    const result = stmt.run(data.user_id, data.name, data.type, data.interest_rate, data.starting_amount, data.starting_date);
    return result.lastInsertRowid;
}

/**
 * @param {number} accountId
 * @param {{ name: string, type: string, interest_rate: number, starting_amount: number, starting_date: string }} data
 */
export function updateAccount(accountId, data) {
    getDb()
        .prepare(
            'UPDATE accounts SET name = ?, type = ?, interest_rate = ?, starting_amount = ?, starting_date = ? WHERE account_id = ?'
        )
        .run(data.name, data.type, data.interest_rate, data.starting_amount, data.starting_date, accountId);
}

/** @param {number} accountId */
export function deleteAccount(accountId) {
    getDb().prepare('DELETE FROM accounts WHERE account_id = ?').run(accountId);
}
