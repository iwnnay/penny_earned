/**
 * The six recurring-transaction frequencies supported throughout the app.
 * Used in the form <select>, transaction validation, and date expansion logic.
 * @type {readonly string[]}
 */
export const RECURRING_FREQUENCIES = /** @type {const} */ ([
	'daily',
	'weekly',
	'bi-weekly',
	'monthly',
	'1st-and-15th',
	'quarterly'
]);

/**
 * How many months ahead recurring series are generated and navigation is capped.
 */
export const HORIZON_MONTHS = 24;

/**
 * Maximum number of categories that can be attached to a single transaction.
 */
export const MAX_CATEGORIES_PER_TRANSACTION = 4;

/**
 * Full month names indexed 0–11, matching JavaScript's Date.getMonth().
 */
export const MONTH_NAMES = [
	'January',
	'February',
	'March',
	'April',
	'May',
	'June',
	'July',
	'August',
	'September',
	'October',
	'November',
	'December'
];
