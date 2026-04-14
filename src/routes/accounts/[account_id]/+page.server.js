import { fail, redirect } from '@sveltejs/kit';
import { getAccount } from '$lib/server/accounts.js';
import { getTransactionsForMonth, createTransaction, createRecurringSeries, updateTransaction, updateTransactionAndFuture, deleteTransaction, deleteRecurringSeries, getNeededHorizon, ensureHorizonForAccount } from '$lib/server/transactions.js';

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
            maxAge: 60 * 60 * 24 * 365 * 3,
        });
    }

    const transactions = getTransactionsForMonth(accountId, year, month);

    return { account, transactions, year, month, horizon: neededHorizon };
}

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
        const name = String(form.get('name') ?? '').trim();
        const amount = parseFloat(String(form.get('amount') ?? '0'));
        const debit = form.get('debit') === 'true';
        const date = String(form.get('date') ?? '');
        const is_recurring = form.get('is_recurring') === 'true';
        const recurring_frequency = String(form.get('recurring_frequency') ?? '') || null;

        if (!name || !date || isNaN(amount) || amount <= 0) {
            return fail(400, { error: 'Name, valid amount, and date are required.' });
        }

        if (is_recurring && recurring_frequency) {
            createRecurringSeries({ account_id: accountId, name, amount, debit, date, recurring_frequency });
        } else {
            createTransaction({ account_id: accountId, name, amount, debit, date });
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
        const name = String(form.get('name') ?? '').trim();
        const amount = parseFloat(String(form.get('amount') ?? '0'));
        const debit = form.get('debit') === 'true';
        const date = String(form.get('date') ?? '');
        const update_future = form.get('update_future') === 'true';

        if (!transaction_id || !name || !date || isNaN(amount) || amount <= 0) {
            return fail(400, { error: 'Name, valid amount, and date are required.' });
        }

        if (update_future) {
            updateTransactionAndFuture(transaction_id, { name, amount, debit, date });
        } else {
            updateTransaction(transaction_id, { name, amount, debit, date });
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
    },
};
