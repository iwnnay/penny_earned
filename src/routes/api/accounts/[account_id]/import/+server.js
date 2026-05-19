import { json } from '@sveltejs/kit';
import { getAccount } from '$lib/server/accounts.js';
import { previewImport, confirmImport } from '$lib/server/import.js';

function getAccountOrFail(params, user) {
	const accountId = parseInt(params.account_id);
	const account = getAccount(accountId, user.user_id);
	return account ? { accountId, account } : null;
}

/** POST — parse CSV and return rows for review (no DB writes). */
export async function POST({ request, params, locals }) {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });

	const ctx = getAccountOrFail(params, locals.user);
	if (!ctx) return json({ error: 'Account not found' }, { status: 404 });

	const formData = await request.formData();
	const file = formData.get('csv');
	if (!file || typeof file === 'string') {
		return json({ error: 'csv file is required' }, { status: 400 });
	}

	const text = await file.text();
	const result = previewImport(ctx.accountId, text);
	return json(result);
}

/** PUT — insert approved transactions returned from the review step. */
export async function PUT({ request, params, locals }) {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });

	const ctx = getAccountOrFail(params, locals.user);
	if (!ctx) return json({ error: 'Account not found' }, { status: 404 });

	const body = await request.json();
	if (!Array.isArray(body.transactions)) {
		return json({ error: 'transactions array required' }, { status: 400 });
	}

	const result = confirmImport(ctx.accountId, body.transactions);
	return json(result);
}
