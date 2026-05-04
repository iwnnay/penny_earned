import { getDb } from './db/client.js';

/**
 * Returns the ID for the 'Misc' category.
 * @returns {number}
 */
export function getMiscCategoryId() {
    const row = getDb().prepare("SELECT category_id FROM categories WHERE name = 'Misc' AND account_id IS NULL").get();
    return row?.category_id;
}

/**
 * Returns all main categories.
 * @returns {Array<{category_id: number, name: string, account_id: number | null}>}
 */
export function getMainCategories() {
    return getDb().prepare('SELECT * FROM categories WHERE account_id IS NULL ORDER BY name ASC').all();
}

/**
 * Returns all subcategories for a specific account.
 * @param {number} accountId
 * @returns {Array<{category_id: number, name: string, account_id: number}>}
 */
export function getSubcategories(accountId) {
    return getDb().prepare('SELECT * FROM categories WHERE account_id = ? ORDER BY name ASC').all(accountId);
}

/**
 * Ensures a category exists and returns its ID.
 * If accountId is provided, it looks for/creates an account-specific category.
 * If accountId is null, it looks for a global main category.
 * @param {string} name
 * @param {number | null} accountId
 * @returns {number}
 */
export function ensureCategory(name, accountId = null) {
    const db = getDb();
    let query = 'SELECT category_id FROM categories WHERE name = ? AND account_id ';
    query += accountId === null ? 'IS NULL' : '= ?';
    
    const params = accountId === null ? [name] : [name, accountId];
    const existing = db.prepare(query).get(...params);
    
    if (existing) {
        return existing.category_id;
    }
    
    const result = db.prepare('INSERT INTO categories (name, account_id) VALUES (?, ?)').run(name, accountId);
    return result.lastInsertRowid;
}

/**
 * Sets categories for a transaction.
 * @param {number} transactionId
 * @param {number[]} categoryIds
 */
export function setTransactionCategories(transactionId, categoryIds) {
    const db = getDb();
    db.transaction(() => {
        db.prepare('DELETE FROM transaction_categories WHERE transaction_id = ?').run(transactionId);
        const stmt = db.prepare('INSERT INTO transaction_categories (transaction_id, category_id) VALUES (?, ?)');
        for (const id of categoryIds) {
            stmt.run(transactionId, id);
        }
    })();
}

/**
 * Returns categories for a list of transactions. Each value in the returned
 * map includes an `is_main` flag derived as `account_id === null`.
 * @param {number[]} transactionIds
 * @returns {Record<number, { categories: Array<{ category_id: number, name: string, account_id: number | null, is_main: boolean }> }>}
 */
export function getCategoriesForTransactions(transactionIds) {
    if (transactionIds.length === 0) return {};
    const db = getDb();
    const placeholders = transactionIds.map(() => '?').join(',');
    
    const cats = db.prepare(`
        SELECT tc.transaction_id, c.* 
        FROM transaction_categories tc
        JOIN categories c ON tc.category_id = c.category_id
        WHERE tc.transaction_id IN (${placeholders})
    `).all(...transactionIds);

    /** @type {Object<number, {categories: any[]}>} */
    const result = {};
    for (const id of transactionIds) {
        result[id] = { categories: [] };
    }

    for (const c of cats) {
        result[c.transaction_id].categories.push({
            ...c,
            is_main: c.account_id === null
        });
    }

    return result;
}
