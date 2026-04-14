import { fail, redirect } from '@sveltejs/kit';
import { listAccounts, createAccount, updateAccount, deleteAccount } from '$lib/server/accounts.js';

/** @type {import('./$types').PageServerLoad} */
export function load({ locals }) {
    if (!locals.user) {
        redirect(302, '/login');
    }
    return { accounts: listAccounts(locals.user.user_id) };
}

/** @type {import('./$types').Actions} */
export const actions = {
    create: async ({ request, locals }) => {
        if (!locals.user) {
            redirect(302, '/login');
        }
        const form = await request.formData();
        const name = String(form.get('name') ?? '').trim();
        const type = String(form.get('type') ?? '');
        const interest_rate = parseFloat(String(form.get('interest_rate') ?? '0'));
        const starting_amount = parseFloat(String(form.get('starting_amount') ?? '0'));
        const starting_date = String(form.get('starting_date') ?? '');

        if (!name || !type || !starting_date) {
            return fail(400, { error: 'Name, type, and starting date are required.' });
        }
        if (!['checking', 'savings'].includes(type)) {
            return fail(400, { error: 'Type must be checking or savings.' });
        }

        createAccount({ user_id: locals.user.user_id, name, type, interest_rate: interest_rate || 0, starting_amount: starting_amount || 0, starting_date });
        return { success: true };
    },

    update: async ({ request, locals }) => {
        if (!locals.user) {
            redirect(302, '/login');
        }
        const form = await request.formData();
        const account_id = parseInt(String(form.get('account_id') ?? ''));
        const name = String(form.get('name') ?? '').trim();
        const type = String(form.get('type') ?? '');
        const interest_rate = parseFloat(String(form.get('interest_rate') ?? '0'));
        const starting_amount = parseFloat(String(form.get('starting_amount') ?? '0'));
        const starting_date = String(form.get('starting_date') ?? '');

        if (!account_id || !name || !type || !starting_date) {
            return fail(400, { error: 'All fields are required.' });
        }

        updateAccount(account_id, { name, type, interest_rate: interest_rate || 0, starting_amount: starting_amount || 0, starting_date });
        return { success: true };
    },

    delete: async ({ request, locals }) => {
        if (!locals.user) {
            redirect(302, '/login');
        }
        const form = await request.formData();
        const account_id = parseInt(String(form.get('account_id') ?? ''));
        if (account_id) {
            deleteAccount(account_id);
        }
        return { success: true };
    },
};
