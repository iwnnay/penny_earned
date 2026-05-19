/**
 * @typedef {Object} User
 * @property {number} user_id
 * @property {string} email
 */

/**
 * @typedef {Object} Account
 * @property {number} account_id
 * @property {number} user_id
 * @property {string} name
 * @property {'checking' | 'savings'} type
 * @property {number} interest_rate
 * @property {number} starting_amount
 * @property {string} starting_date
 */

/**
 * @typedef {'daily' | 'weekly' | 'bi-weekly' | 'monthly' | '1st-and-15th' | 'quarterly'} RecurringFrequency
 */

/**
 * @typedef {Object} Transaction
 * @property {number} transaction_id
 * @property {number} account_id
 * @property {number} order
 * @property {string} name
 * @property {number} amount
 * @property {boolean} debit
 * @property {string} date
 * @property {string | null} series
 * @property {RecurringFrequency | null} recurring_frequency
 * @property {number} total
 * @property {string | null} import_fingerprint
 */
