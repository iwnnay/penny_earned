<script>
    import { enhance } from '$app/forms';
    import { formatCurrency, formatDate } from '$lib/shared/formatters.js';

    /** @type {{ data: import('./$types').PageData, form: import('./$types').ActionData }} */
    let { data, form } = $props();

    const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const FREQUENCIES = ['daily', 'weekly', 'bi-weekly', 'monthly', '1st-and-15th', 'quarterly'];

    let showAddForm = $state(false);
    let isRecurring = $state(false);
    let editingId = $state(/** @type {number | null} */ (null));

    $effect(() => {
        if (form?.success) {
            showAddForm = false;
            isRecurring = false;
            editingId = null;
        }
    });

    function prevMonth() {
        let y = data.year;
        let m = data.month - 1;
        if (m < 1) {
            m = 12;
            y--;
        }
        return `?year=${y}&month=${m}`;
    }

    function nextMonth() {
        let y = data.year;
        let m = data.month + 1;
        if (m > 12) {
            m = 1;
            y++;
        }
        return `?year=${y}&month=${m}`;
    }

    /** @param {number} id */
    function startEdit(id) {
        editingId = id;
        showAddForm = false;
    }
</script>

<main>
    <div class="breadcrumb">
        <a href="/accounts">Accounts</a> / <span>{data.account.name}</span>
    </div>

    <div class="header">
        <h1>{data.account.name}</h1>
        <span class="badge">{data.account.type}</span>
    </div>

    <div class="month-nav">
        <a href={prevMonth()} class="nav-btn">&larr;</a>
        <span class="month-label">{MONTHS[data.month - 1]} {data.year}</span>
        <a href={nextMonth()} class="nav-btn">&rarr;</a>
    </div>

    {#if form?.error}
        <p class="error">{form.error}</p>
    {/if}

    <div class="toolbar">
        <span class="tx-count">{data.transactions.length} transaction{data.transactions.length !== 1 ? 's' : ''}</span>
        <button onclick={() => { showAddForm = !showAddForm; editingId = null; }} class="btn-outline btn-sm">
            {showAddForm ? 'Cancel' : '+ Add Transaction'}
        </button>
    </div>

    {#if showAddForm}
        <section class="card form-card">
            <h2>Add Transaction</h2>
            <form method="POST" action="?/create" use:enhance>
                <input type="hidden" name="is_recurring" value={isRecurring} />
                <div class="form-grid">
                    <label class="full-width">
                        Name
                        <input type="text" name="name" required />
                    </label>
                    <label>
                        Amount
                        <input type="number" name="amount" step="0.01" min="0.01" required />
                    </label>
                    <label>
                        Date
                        <input type="date" name="date" required value={`${data.year}-${String(data.month).padStart(2, '0')}-01`} />
                    </label>
                    <label class="full-width type-row">
                        <span>Type</span>
                        <div class="radio-group">
                            <label class="radio">
                                <input type="radio" name="debit" value="true" checked /> Debit (deposit / income)
                            </label>
                            <label class="radio">
                                <input type="radio" name="debit" value="false" /> Withdrawal (expense)
                            </label>
                        </div>
                    </label>
                    <label class="full-width">
                        <span class="toggle-label">
                            <input type="checkbox" bind:checked={isRecurring} />
                            Recurring transaction
                        </span>
                    </label>
                    {#if isRecurring}
                        <label class="full-width">
                            Frequency
                            <select name="recurring_frequency">
                                {#each FREQUENCIES as f}
                                    <option value={f}>{f}</option>
                                {/each}
                            </select>
                        </label>
                    {:else}
                        <input type="hidden" name="recurring_frequency" value="" />
                    {/if}
                </div>
                <div class="form-actions">
                    <button type="submit" class="btn-primary">Add</button>
                    <button type="button" onclick={() => (showAddForm = false)} class="btn-outline">Cancel</button>
                </div>
            </form>
        </section>
    {/if}

    {#if data.transactions.length === 0}
        <p class="empty">No transactions for {MONTHS[data.month - 1]} {data.year}.</p>
    {:else}
        <div class="table-wrap">
            <table>
                <thead>
                    <tr>
                        <th class="col-order">#</th>
                        <th>Date</th>
                        <th>Name</th>
                        <th class="col-right">Amount</th>
                        <th class="col-right">Balance</th>
                        <th class="col-actions"></th>
                    </tr>
                </thead>
                <tbody>
                    {#each data.transactions as tx (tx.transaction_id)}
                        {#if editingId === tx.transaction_id}
                            <tr class="editing-row">
                                <td colspan="6" class="edit-cell">
                                    <form method="POST" action="?/update" use:enhance class="inline-edit-form">
                                        <input type="hidden" name="transaction_id" value={tx.transaction_id} />
                                        <div class="inline-edit-fields">
                                            <label>
                                                Name
                                                <input type="text" name="name" value={tx.name} required />
                                            </label>
                                            <label>
                                                Amount
                                                <input type="number" name="amount" step="0.01" min="0.01" value={tx.amount} required />
                                            </label>
                                            <label>
                                                Date
                                                <input type="date" name="date" value={tx.date} required />
                                            </label>
                                            <label class="type-row">
                                                <span>Type</span>
                                                <div class="radio-group">
                                                    <label class="radio">
                                                        <input type="radio" name="debit" value="true" checked={!!tx.debit} /> Debit
                                                    </label>
                                                    <label class="radio">
                                                        <input type="radio" name="debit" value="false" checked={!tx.debit} /> Withdrawal
                                                    </label>
                                                </div>
                                            </label>
                                        </div>
                                        <div class="form-actions">
                                            <button type="submit" name="update_future" value="false" class="btn-primary btn-sm">Save</button>
                                            {#if tx.series}
                                                <button
                                                    type="submit"
                                                    name="update_future"
                                                    value="true"
                                                    class="btn-save-plus btn-sm"
                                                    title="Adjust this and future transactions"
                                                >Save+</button>
                                            {/if}
                                            <button type="button" onclick={() => (editingId = null)} class="btn-outline btn-sm">Cancel</button>
                                        </div>
                                    </form>
                                </td>
                            </tr>
                        {:else}
                            <tr class="data-row" onclick={() => startEdit(tx.transaction_id)}>
                                <td class="col-order muted">{tx.order}</td>
                                <td>{formatDate(tx.date)}</td>
                                <td>
                                    {tx.name}
                                    {#if tx.series}
                                        <span class="recurring-badge" title="Recurring">↺</span>
                                    {/if}
                                </td>
                                <td class="col-right amount">
                                    {#if tx.debit}
                                        <span class="pos">+{formatCurrency(tx.amount)}</span>
                                    {:else}
                                        <span class="neg">-{formatCurrency(tx.amount)}</span>
                                    {/if}
                                </td>
                                <td class="col-right total">
                                    <span class={tx.total >= 0 ? 'pos' : 'neg'}>{formatCurrency(tx.total)}</span>
                                </td>
                                <td class="col-actions" onclick={(e) => e.stopPropagation()}>
                                    <form method="POST" action="?/delete" use:enhance>
                                        <input type="hidden" name="transaction_id" value={tx.transaction_id} />
                                        <input type="hidden" name="series" value={tx.series ?? ''} />
                                        <input type="hidden" name="date" value={tx.date} />
                                        {#if tx.series}
                                            <div class="delete-group">
                                                <button
                                                    type="submit"
                                                    name="delete_series"
                                                    value="false"
                                                    class="btn-icon"
                                                    title="Delete this occurrence"
                                                    onclick={(e) => { if (!confirm('Delete this occurrence?')) { e.preventDefault(); } }}
                                                >✕</button>
                                                <button
                                                    type="submit"
                                                    name="delete_series"
                                                    value="true"
                                                    class="btn-icon btn-icon-warn"
                                                    title="Delete entire series"
                                                    onclick={(e) => { if (!confirm('Delete the entire recurring series?')) { e.preventDefault(); } }}
                                                >↺✕</button>
                                            </div>
                                        {:else}
                                            <button
                                                type="submit"
                                                name="delete_series"
                                                value="false"
                                                class="btn-icon"
                                                title="Delete transaction"
                                                onclick={(e) => { if (!confirm('Delete this transaction?')) { e.preventDefault(); } }}
                                            >✕</button>
                                        {/if}
                                    </form>
                                </td>
                            </tr>
                        {/if}
                    {/each}
                </tbody>
            </table>
        </div>
    {/if}
</main>

<style>
    main {
        max-width: 960px;
        margin: 2rem auto;
        padding: 0 1.5rem;
    }

    .breadcrumb {
        font-size: 0.85rem;
        color: #888;
        margin-bottom: 0.75rem;
    }

    .breadcrumb a {
        color: #7eb8f7;
        text-decoration: none;
    }

    .breadcrumb a:hover {
        text-decoration: underline;
    }

    .header {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        margin-bottom: 1.25rem;
    }

    h1 {
        margin: 0;
        font-size: 1.75rem;
    }

    h2 {
        margin: 0 0 1rem;
    }

    .badge {
        display: inline-block;
        padding: 0.15rem 0.6rem;
        background: #2a2a4a;
        border-radius: 3px;
        font-size: 0.75rem;
        color: #aaa;
        text-transform: capitalize;
    }

    .month-nav {
        display: flex;
        align-items: center;
        gap: 1rem;
        margin-bottom: 1.25rem;
    }

    .nav-btn {
        padding: 0.3rem 0.75rem;
        background: #1a1a2e;
        border: 1px solid #444;
        border-radius: 4px;
        color: #ccc;
        text-decoration: none;
        font-size: 1rem;
    }

    .nav-btn:hover {
        background: #2a2a4a;
    }

    .month-label {
        font-size: 1.1rem;
        font-weight: 600;
        min-width: 160px;
        text-align: center;
    }

    .toolbar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 1rem;
    }

    .tx-count {
        font-size: 0.85rem;
        color: #888;
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

    .type-row {
        gap: 0.5rem;
    }

    .radio-group {
        display: flex;
        gap: 1.5rem;
    }

    .radio {
        flex-direction: row;
        align-items: center;
        gap: 0.4rem;
        color: #ccc;
        cursor: pointer;
    }

    .toggle-label {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        color: #ccc;
        cursor: pointer;
    }

    input[type='text'],
    input[type='number'],
    input[type='date'],
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
        align-items: center;
    }

    .table-wrap {
        overflow-x: auto;
    }

    table {
        width: 100%;
        border-collapse: collapse;
        font-size: 0.9rem;
    }

    th {
        text-align: left;
        padding: 0.6rem 0.75rem;
        color: #888;
        font-weight: 500;
        border-bottom: 1px solid #333;
        white-space: nowrap;
    }

    td {
        padding: 0.6rem 0.75rem;
        border-bottom: 1px solid #222;
        vertical-align: middle;
    }

    tr:last-child td {
        border-bottom: none;
    }

    .data-row {
        cursor: pointer;
    }

    .data-row:hover td {
        background: #1a1a2e;
    }

    .editing-row td {
        background: #12122a;
        border-bottom: 1px solid #444;
        padding: 0;
    }

    .editing-row:last-child td {
        border-bottom: none;
    }

    .edit-cell {
        padding: 1rem 0.75rem !important;
    }

    .inline-edit-form {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
    }

    .inline-edit-fields {
        display: grid;
        grid-template-columns: 2fr 1fr 1fr 2fr;
        gap: 0.75rem;
        align-items: start;
    }

    .col-order {
        width: 2.5rem;
        text-align: center;
    }

    .col-right {
        text-align: right;
    }

    .col-actions {
        width: 5rem;
        text-align: right;
    }

    .muted {
        color: #666;
    }

    .recurring-badge {
        font-size: 0.75rem;
        color: #7eb8f7;
        margin-left: 0.3rem;
    }

    .pos {
        color: #4ade80;
    }

    .neg {
        color: #f87171;
    }

    .amount {
        font-variant-numeric: tabular-nums;
    }

    .total {
        font-weight: 600;
        font-variant-numeric: tabular-nums;
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

    .btn-save-plus {
        padding: 0.5rem 1.25rem;
        background: #4a7a5a;
        color: #d4f0dd;
        border: 1px solid #5a9a6a;
        border-radius: 4px;
        font-size: 0.95rem;
        font-weight: 600;
        cursor: pointer;
    }

    .btn-save-plus:hover {
        background: #5a9a6a;
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

    .btn-sm {
        padding: 0.25rem 0.75rem;
        font-size: 0.8rem;
    }

    .btn-icon {
        background: none;
        border: none;
        color: #666;
        cursor: pointer;
        padding: 0.2rem 0.4rem;
        font-size: 0.85rem;
        border-radius: 3px;
    }

    .btn-icon:hover {
        color: #f87171;
        background: #450a0a;
    }

    .btn-icon-warn:hover {
        color: #fb923c;
        background: #431407;
    }

    .delete-group {
        display: flex;
        gap: 0.25rem;
        justify-content: flex-end;
    }
</style>
