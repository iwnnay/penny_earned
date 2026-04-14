import { json } from '@sveltejs/kit';
import { getAccount, updateAccount, deleteAccount } from '$lib/server/accounts.js';

/** @type {import('./$types').RequestHandler} */
export function GET({ locals, params }) {
    if (!locals.user) {
        return json({ error: 'Unauthorized' }, { status: 401 });
    }
    const account = getAccount(parseInt(params.account_id), locals.user.user_id);
    if (!account) {
        return json({ error: 'Not found' }, { status: 404 });
    }
    return json(account);
}

/** @type {import('./$types').RequestHandler} */
export async function PUT({ request, locals, params }) {
    if (!locals.user) {
        return json({ error: 'Unauthorized' }, { status: 401 });
    }
    const accountId = parseInt(params.account_id);
    const account = getAccount(accountId, locals.user.user_id);
    if (!account) {
        return json({ error: 'Not found' }, { status: 404 });
    }
    const body = await request.json();
    updateAccount(accountId, { ...account, ...body });
    return json({ success: true });
}

/** @type {import('./$types').RequestHandler} */
export function DELETE({ locals, params }) {
    if (!locals.user) {
        return json({ error: 'Unauthorized' }, { status: 401 });
    }
    const accountId = parseInt(params.account_id);
    const account = getAccount(accountId, locals.user.user_id);
    if (!account) {
        return json({ error: 'Not found' }, { status: 404 });
    }
    deleteAccount(accountId);
    return json({ success: true });
}
