<script>
    import { enhance } from '$app/forms';
    import { formatCurrency, formatDate, formatPercent } from '$lib/shared/formatters.js';

    /** @type {{ data: import('./$types').PageData, form: import('./$types').ActionData }} */
    let { data, form } = $props();

    let showCreate = $state(data.accounts.length === 0);
    let editingId = $state(/** @type {number | null} */ (null));

    $effect(() => {
        if (form?.success) {
            showCreate = false;
            editingId = null;
        }
    });
</script>

<main>
    <div class="header">
        <h1>Accounts</h1>
        {#if data.accounts.length > 0}
            <button onclick={() => (showCreate = !showCreate)} class="btn-outline">
                {showCreate ? 'Cancel' : '+ New Account'}
            </button>
        {/if}
    </div>

    {#if form?.error}
        <p class="error">{form.error}</p>
    {/if}

    {#if showCreate}
        <section class="card form-card">
            <h2>New Account</h2>
            <form method="POST" action="?/create" use:enhance>
                <div class="form-grid">
                    <label>
                        Name
                        <input type="text" name="name" required />
                    </label>
                    <label>
                        Type
                        <select name="type" required>
                            <option value="checking">Checking</option>
                            <option value="savings">Savings</option>
                        </select>
                    </label>
                    <label>
                        Interest Rate (%)
                        <input type="number" name="interest_rate" step="0.001" min="0" value="0" />
                    </label>
                    <label>
                        Starting Amount
                        <input type="number" name="starting_amount" step="0.01" min="0" value="0" />
                    </label>
                    <label class="full-width">
                        Starting Date
                        <input type="date" name="starting_date" required />
                    </label>
                </div>
                <div class="form-actions">
                    <button type="submit" class="btn-primary">Create Account</button>
                    {#if data.accounts.length > 0}
                        <button type="button" onclick={() => (showCreate = false)} class="btn-outline">Cancel</button>
                    {/if}
                </div>
            </form>
        </section>
    {/if}

    {#if data.accounts.length === 0 && !showCreate}
        <p class="empty">No accounts yet. Create one to get started.</p>
    {:else}
        <div class="accounts-list">
            {#each data.accounts as account (account.account_id)}
                <div class="card account-card">
                    {#if editingId === account.account_id}
                        <form method="POST" action="?/update" use:enhance>
                            <input type="hidden" name="account_id" value={account.account_id} />
                            <div class="form-grid">
                                <label>
                                    Name
                                    <input type="text" name="name" value={account.name} required />
                                </label>
                                <label>
                                    Type
                                    <select name="type" required>
                                        <option value="checking" selected={account.type === 'checking'}>Checking</option>
                                        <option value="savings" selected={account.type === 'savings'}>Savings</option>
                                    </select>
                                </label>
                                <label>
                                    Interest Rate (%)
                                    <input type="number" name="interest_rate" step="0.001" min="0" value={account.interest_rate} />
                                </label>
                                <label>
                                    Starting Amount
                                    <input type="number" name="starting_amount" step="0.01" value={account.starting_amount} />
                                </label>
                                <label class="full-width">
                                    Starting Date
                                    <input type="date" name="starting_date" value={account.starting_date} required />
                                </label>
                            </div>
                            <div class="form-actions">
                                <button type="submit" class="btn-primary">Save</button>
                                <button type="button" onclick={() => (editingId = null)} class="btn-outline">Cancel</button>
                            </div>
                        </form>
                    {:else}
                        <div class="account-header">
                            <div>
                                <h2>
                                    <a href="/accounts/{account.account_id}">{account.name}</a>
                                </h2>
                                <span class="badge">{account.type}</span>
                            </div>
                            <div class="account-actions">
                                <button onclick={() => (editingId = account.account_id)} class="btn-outline btn-sm">Edit</button>
                                <form method="POST" action="?/delete" use:enhance>
                                    <input type="hidden" name="account_id" value={account.account_id} />
                                    <button
                                        type="submit"
                                        class="btn-danger btn-sm"
                                        onclick={(e) => {
                                            if (!confirm(`Delete "${account.name}"? This cannot be undone.`)) {
                                                e.preventDefault();
                                            }
                                        }}
                                    >
                                        Delete
                                    </button>
                                </form>
                            </div>
                        </div>
                        <dl class="account-details">
                            <dt>Starting Balance</dt>
                            <dd>{formatCurrency(account.starting_amount)}</dd>
                            <dt>Interest Rate</dt>
                            <dd>{formatPercent(account.interest_rate)}</dd>
                            <dt>Opened</dt>
                            <dd>{formatDate(account.starting_date)}</dd>
                        </dl>
                    {/if}
                </div>
            {/each}
        </div>
    {/if}
</main>

<style>
    main {
        max-width: 900px;
        margin: 2rem auto;
        padding: 0 1.5rem;
    }

    .header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 1.5rem;
    }

    h1 {
        margin: 0;
        font-size: 1.75rem;
    }

    h2 {
        margin: 0 0 0.25rem;
        font-size: 1.2rem;
    }

    h2 a {
        color: #7eb8f7;
        text-decoration: none;
    }

    h2 a:hover {
        text-decoration: underline;
    }

    .card {
        background: #1a1a2e;
        border: 1px solid #333;
        border-radius: 8px;
        padding: 1.5rem;
    }

    .form-card {
        margin-bottom: 1.5rem;
    }

    .form-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1rem;
        margin-bottom: 1rem;
    }

    .full-width {
        grid-column: 1 / -1;
    }

    label {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
        font-size: 0.875rem;
        color: #aaa;
    }

    input,
    select {
        padding: 0.5rem 0.75rem;
        background: #0f0f1a;
        border: 1px solid #444;
        border-radius: 4px;
        color: #e0e0e0;
        font-size: 0.95rem;
    }

    input:focus,
    select:focus {
        outline: none;
        border-color: #7eb8f7;
    }

    .form-actions {
        display: flex;
        gap: 0.75rem;
    }

    .accounts-list {
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }

    .account-header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        margin-bottom: 1rem;
    }

    .account-actions {
        display: flex;
        gap: 0.5rem;
    }

    .badge {
        display: inline-block;
        padding: 0.1rem 0.5rem;
        background: #2a2a4a;
        border-radius: 3px;
        font-size: 0.75rem;
        color: #aaa;
        text-transform: capitalize;
    }

    dl {
        display: grid;
        grid-template-columns: auto 1fr;
        gap: 0.4rem 1.5rem;
        margin: 0;
        font-size: 0.9rem;
    }

    dt {
        color: #888;
    }

    dd {
        margin: 0;
        color: #e0e0e0;
    }

    .empty {
        color: #888;
        text-align: center;
        margin-top: 3rem;
    }

    .error {
        color: #f87171;
        margin-bottom: 1rem;
    }

    .btn-primary {
        padding: 0.5rem 1.25rem;
        background: #7eb8f7;
        color: #0f0f1a;
        border: none;
        border-radius: 4px;
        font-size: 0.95rem;
        font-weight: 600;
        cursor: pointer;
    }

    .btn-primary:hover {
        background: #9ecbff;
    }

    .btn-outline {
        padding: 0.5rem 1.25rem;
        background: none;
        border: 1px solid #555;
        color: #ccc;
        border-radius: 4px;
        font-size: 0.95rem;
        cursor: pointer;
    }

    .btn-outline:hover {
        background: #2a2a4a;
    }

    .btn-danger {
        padding: 0.5rem 1.25rem;
        background: none;
        border: 1px solid #7f1d1d;
        color: #f87171;
        border-radius: 4px;
        font-size: 0.95rem;
        cursor: pointer;
    }

    .btn-danger:hover {
        background: #450a0a;
    }

    .btn-sm {
        padding: 0.25rem 0.75rem;
        font-size: 0.8rem;
    }
</style>
