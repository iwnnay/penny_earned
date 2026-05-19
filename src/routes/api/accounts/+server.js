import { json } from '@sveltejs/kit';
import { listAccounts, createAccount } from '$lib/server/accounts.js';

/** @type {import('./$types').RequestHandler} */
export function GET({ locals }) {
    if (!locals.user) {
        return json({ error: 'Unauthorized' }, { status: 401 });
    }
    return json(listAccounts(locals.user.user_id));
}

/** @type {import('./$types').RequestHandler} */
export async function POST({ request, locals }) {
    if (!locals.user) {
        return json({ error: 'Unauthorized' }, { status: 401 });
    }
    const body = await request.json();
    const { name, type, interest_rate = 0, starting_amount = 0, starting_date } = body;
    if (!name || !type || !starting_date) {
        return json({ error: 'name, type, and starting_date are required' }, { status: 400 });
    }
    const id = createAccount({ user_id: locals.user.user_id, name, type, interest_rate, starting_amount, starting_date });
    return json({ account_id: id }, { status: 201 });
}
