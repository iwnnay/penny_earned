import { fail, redirect } from '@sveltejs/kit';
import { getAccount } from '$lib/server/accounts.js';
import {
	getTransactionsForMonth,
	createTransaction,
	createRecurringSeries,
	updateTransaction,
	updateTransactionAndFuture,
	deleteTransaction,
	deleteRecurringSeries,
	getNeededHorizon,
	ensureHorizonForAccount,
	getBalanceExtremes
} from '$lib/server/transactions.js';
import { getMainCategories, getSubcategories, ensureCategory, getCategoriesForTransactions } from '$lib/server/categories.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Resolves a list of category names to category IDs, creating account-specific
 * categories on demand for any name that isn't a global main category.
 *
 * Guarantees at least one main-category ID is present; returns `null` when
 * the caller must reject the request because no main category was supplied.
 *
 * @param {string[]} names
 * @param {{ category_id: number, name: string }[]} allMainCategories
 * @param {number} accountId
 * @returns {{ ids: number[], hasMain: boolean }}
 */
function resolveCategories(names, allMainCategories, accountId) {
	if (names.length === 0) {
		names = ['Misc'];
	}

	const ids = names.map((name) => {
		const existing = allMainCategories.find((c) => c.name.toLowerCase() === name.toLowerCase());
		return existing ? existing.category_id : ensureCategory(name, accountId);
	});

	const hasMain = ids.some((id) => allMainCategories.some((m) => m.category_id === id));
	return { ids, hasMain };
}

/**
 * Parses and lightly validates the shared transaction fields from a form submission.
 * Returns a plain object on success or a `fail` result on validation error.
 *
 * @param {FormData} form
 */
function parseTransactionForm(form) {
	const name = String(form.get('name') ?? '').trim();
	const amount = parseFloat(String(form.get('amount') ?? '0'));
	const debit = form.get('debit') === 'true';
	const date = String(form.get('date') ?? '');

	if (!name || !date || isNaN(amount) || amount <= 0) {
		return { error: fail(400, { error: 'Name, valid amount, and date are required.' }) };
	}

	return { value: { name, amount, debit, date } };
}

// ---------------------------------------------------------------------------
// Load
// ---------------------------------------------------------------------------

/** @type {import('./$types').PageServerLoad} */
export function load({ locals, params, url, cookies }) {
	if (!locals.user) {
		redirect(302, '/login');
	}

	const accountId = parseInt(params.account_id);
	const account = getAccount(accountId, locals.user.user_id);
	if (!account) {
		redirect(302, '/accounts');
	}

	const now = new Date();
	const year = parseInt(url.searchParams.get('year') ?? String(now.getFullYear()));
	const month = parseInt(url.searchParams.get('month') ?? String(now.getMonth() + 1));

	// Self-heal: extend recurring series to the 24-month horizon whenever the
	// cookie is behind the needed horizon (advances by one month each month).
	const neededHorizon = getNeededHorizon();
	const cookieHorizon = cookies.get('series_horizon') ?? '';
	if (cookieHorizon < neededHorizon) {
		ensureHorizonForAccount(accountId, neededHorizon);
		cookies.set('series_horizon', neededHorizon, {
			path: '/',
			httpOnly: true,
			sameSite: 'strict',
			maxAge: 60 * 60 * 24 * 365 * 3
		});
	}

	const transactions = getTransactionsForMonth(accountId, year, month);
	const mainCategories = getMainCategories();
	const subcategories = getSubcategories(accountId);
	const transactionCategories = getCategoriesForTransactions(transactions.map((t) => t.transaction_id));

	const currentMonthStr = `${year}-${String(month).padStart(2, '0')}`;
	const balanceExtremes = getBalanceExtremes(accountId, currentMonthStr);

	return {
		account,
		transactions,
		year,
		month,
		horizon: neededHorizon,
		mainCategories,
		subcategories,
		transactionCategories,
		balanceExtremes
	};
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

/** @type {import('./$types').Actions} */
export const actions = {
	create: async ({ request, locals, params }) => {
		if (!locals.user) {
			redirect(302, '/login');
		}
		const accountId = parseInt(params.account_id);
		const account = getAccount(accountId, locals.user.user_id);
		if (!account) {
			return fail(403, { error: 'Account not found.' });
		}

		const form = await request.formData();
		const parsed = parseTransactionForm(form);
		if (parsed.error) {
			return parsed.error;
		}
		const { name, amount, debit, date } = parsed.value;

		const is_recurring = form.get('is_recurring') === 'true';
		const recurring_frequency = String(form.get('recurring_frequency') ?? '') || null;

		const allMainCategories = getMainCategories();
		const categoryNames = form.getAll('categories').map(String).filter(Boolean);
		const { ids: categoryIds, hasMain } = resolveCategories(categoryNames, allMainCategories, accountId);

		if (!hasMain) {
			return fail(400, { error: 'At least one main category is required.' });
		}

		if (is_recurring && recurring_frequency) {
			createRecurringSeries({ account_id: accountId, name, amount, debit, date, recurring_frequency, categories: categoryIds });
		} else {
			createTransaction({ account_id: accountId, name, amount, debit, date, categories: categoryIds });
		}

		return { success: true };
	},

	update: async ({ request, locals, params }) => {
		if (!locals.user) {
			redirect(302, '/login');
		}
		const accountId = parseInt(params.account_id);
		const account = getAccount(accountId, locals.user.user_id);
		if (!account) {
			return fail(403, { error: 'Account not found.' });
		}

		const form = await request.formData();
		const transaction_id = parseInt(String(form.get('transaction_id') ?? ''));
		if (!transaction_id) {
			return fail(400, { error: 'Missing transaction ID.' });
		}

		const parsed = parseTransactionForm(form);
		if (parsed.error) {
			return parsed.error;
		}
		const { name, amount, debit, date } = parsed.value;

		const update_future = form.get('update_future') === 'true';

		const allMainCategories = getMainCategories();
		const categoryNames = form.getAll('categories').map(String).filter(Boolean);
		const { ids: categoryIds, hasMain } = resolveCategories(categoryNames, allMainCategories, accountId);

		if (!hasMain) {
			return fail(400, { error: 'At least one main category is required.' });
		}

		if (update_future) {
			updateTransactionAndFuture(transaction_id, { name, amount, debit, date, categories: categoryIds });
		} else {
			updateTransaction(transaction_id, { name, amount, debit, date, categories: categoryIds });
		}

		return { success: true };
	},

	delete: async ({ request, locals, params }) => {
		if (!locals.user) {
			redirect(302, '/login');
		}
		const accountId = parseInt(params.account_id);
		const account = getAccount(accountId, locals.user.user_id);
		if (!account) {
			return fail(403, { error: 'Account not found.' });
		}

		const form = await request.formData();
		const transaction_id = parseInt(String(form.get('transaction_id') ?? ''));
		const delete_series = form.get('delete_series') === 'true';
		const series = String(form.get('series') ?? '') || null;
		const date = String(form.get('date') ?? '');

		if (delete_series && series && date) {
			deleteRecurringSeries(series, accountId, date);
		} else if (transaction_id) {
			deleteTransaction(transaction_id);
		}

		return { success: true };
	}
};
