import { json } from '@sveltejs/kit';
import { getAccount } from '$lib/server/accounts.js';
import { getTransactionsForMonth, createTransaction, createRecurringSeries } from '$lib/server/transactions.js';

/** @type {import('./$types').RequestHandler} */
export function GET({ locals, url }) {
    if (!locals.user) {
        return json({ error: 'Unauthorized' }, { status: 401 });
    }
    const accountId = parseInt(url.searchParams.get('account_id') ?? '');
    const year = parseInt(url.searchParams.get('year') ?? String(new Date().getFullYear()));
    const month = parseInt(url.searchParams.get('month') ?? String(new Date().getMonth() + 1));
    if (!accountId) {
        return json({ error: 'account_id is required' }, { status: 400 });
    }
    const account = getAccount(accountId, locals.user.user_id);
    if (!account) {
        return json({ error: 'Account not found' }, { status: 404 });
    }
    return json(getTransactionsForMonth(accountId, year, month));
}

/** @type {import('./$types').RequestHandler} */
export async function POST({ request, locals }) {
    if (!locals.user) {
        return json({ error: 'Unauthorized' }, { status: 401 });
    }
    const body = await request.json();
    const { account_id, name, amount, debit = true, date, recurring_frequency } = body;

    if (!account_id || !name || !amount || !date) {
        return json({ error: 'account_id, name, amount, and date are required' }, { status: 400 });
    }

    const account = getAccount(account_id, locals.user.user_id);
    if (!account) {
        return json({ error: 'Account not found' }, { status: 404 });
    }

    if (recurring_frequency) {
        const seriesId = createRecurringSeries({ account_id, name, amount, debit, date, recurring_frequency });
        return json({ series: seriesId }, { status: 201 });
    } else {
        const id = createTransaction({ account_id, name, amount, debit, date });
        return json({ transaction_id: id }, { status: 201 });
    }
}
