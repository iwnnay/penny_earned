import { json } from '@sveltejs/kit';
import { getDb } from '$lib/server/db/client.js';
import { deleteTransaction, deleteRecurringSeries } from '$lib/server/transactions.js';

/** @type {import('./$types').RequestHandler} */
export function GET({ locals, params }) {
    if (!locals.user) {
        return json({ error: 'Unauthorized' }, { status: 401 });
    }
    const tx = getDb()
        .prepare(
            `SELECT t.* FROM transactions t
             JOIN accounts a ON a.account_id = t.account_id
             WHERE t.transaction_id = ? AND a.user_id = ?`
        )
        .get(parseInt(params.transaction_id), locals.user.user_id);
    if (!tx) {
        return json({ error: 'Not found' }, { status: 404 });
    }
    return json(tx);
}

/** @type {import('./$types').RequestHandler} */
export async function DELETE({ request, locals, params }) {
    if (!locals.user) {
        return json({ error: 'Unauthorized' }, { status: 401 });
    }
    const transactionId = parseInt(params.transaction_id);
    const tx = getDb()
        .prepare(
            `SELECT t.* FROM transactions t
             JOIN accounts a ON a.account_id = t.account_id
             WHERE t.transaction_id = ? AND a.user_id = ?`
        )
        .get(transactionId, locals.user.user_id);
    if (!tx) {
        return json({ error: 'Not found' }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    if (body.delete_series && tx.series) {
        deleteRecurringSeries(tx.series, tx.account_id, tx.date);
    } else {
        deleteTransaction(transactionId);
    }

    return json({ success: true });
}
