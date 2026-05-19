<script>
	import { enhance } from '$app/forms';
	import { formatCurrency, formatDate } from '$lib/shared/formatters.js';
	import { RECURRING_FREQUENCIES } from '$lib/shared/constants.js';
	import DatePicker from '$lib/components/DatePicker.svelte';
	import CategoryInput from '$lib/components/CategoryInput.svelte';
	import PieChart from '$lib/components/PieChart.svelte';
	import BarChart from '$lib/components/BarChart.svelte';
	import MonthNav from '$lib/components/MonthNav.svelte';
	import BalanceExtremes from '$lib/components/BalanceExtremes.svelte';
	import ImportModal from '$lib/components/ImportModal.svelte';

	/** @type {{ data: import('./$types').PageData, form: import('./$types').ActionData }} */
	let { data, form } = $props();

	// Default date for new transactions: today's day-of-month clamped to the last
	// valid day of the viewed month. $derived so it updates when navigating months.
	const defaultNewDate = $derived(
		(() => {
			const todayDay = new Date().getDate();
			const lastDay = new Date(data.year, data.month, 0).getDate();
			const day = String(Math.min(todayDay, lastDay)).padStart(2, '0');
			return `${data.year}-${String(data.month).padStart(2, '0')}-${day}`;
		})()
	);

	let showAddForm = $state(false);
	let isRecurring = $state(false);
	let editingId = $state(/** @type {number | null} */ (null));

	/**
	 * Category breakdown for the pie chart: withdrawals only, grouped by main
	 * category name, sorted by total descending.
	 */
	const categoryBreakdown = $derived(
		(() => {
			/** @type {Record<string, number>} */
			const totals = {};
			for (const tx of data.transactions) {
				if (tx.debit) {
					continue;
				}
				const cats = data.transactionCategories[tx.transaction_id]?.categories ?? [];
				const mainCat = cats.find((c) => c.is_main);
				const label = mainCat?.name ?? 'Misc';
				totals[label] = (totals[label] ?? 0) + tx.amount;
			}
			return Object.entries(totals)
				.map(([label, amount]) => ({ label, amount }))
				.sort((a, b) => b.amount - a.amount);
		})()
	);

	const totalIncome = $derived(
		data.transactions.filter((tx) => tx.debit).reduce((s, tx) => s + tx.amount, 0)
	);
	const totalExpenses = $derived(
		data.transactions.filter((tx) => !tx.debit).reduce((s, tx) => s + tx.amount, 0)
	);

	$effect(() => {
		if (form?.success) {
			showAddForm = false;
			isRecurring = false;
			editingId = null;
		}
	});

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

	<MonthNav year={data.year} month={data.month} horizon={data.horizon} />

	{#if form?.error}
		<p class="error">{form.error}</p>
	{/if}

	<div class="toolbar">
		<span class="tx-count">{data.transactions.length} transaction{data.transactions.length !== 1 ? 's' : ''}</span>
		<BalanceExtremes extremes={data.balanceExtremes} />
		<button
			onclick={() => {
				showAddForm = !showAddForm;
				editingId = null;
			}}
			class="btn-outline btn-sm"
		>
			{showAddForm ? 'Cancel' : '+ Add Transaction'}
		</button>
		<ImportModal accountId={data.account.account_id} mainCategories={data.mainCategories} />
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
						<DatePicker name="date" value={defaultNewDate} required />
					</label>
					<label class="full-width">
						Categories
						<CategoryInput mainCategories={data.mainCategories} subcategories={data.subcategories} value={['Misc']} />
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
								{#each RECURRING_FREQUENCIES as f}
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
		<p class="empty">No transactions for {data.month}/{data.year}.</p>
	{:else}
		<div class="table-wrap">
			<table>
				<thead>
					<tr>
						<th>Date</th>
						<th>Category</th>
						<th>Name</th>
						<th class="col-right">Amount</th>
						<th class="col-right">Balance</th>
						<th class="col-actions"></th>
					</tr>
				</thead>
				<tbody>
					{#each data.transactions as tx (tx.transaction_id)}
						{@const cats = data.transactionCategories[tx.transaction_id]}
						{@const mainCat = cats.categories.find((c) => c.is_main)}
						{#if editingId === tx.transaction_id}
							<tr class="editing-row">
								<td colspan="6" class="edit-cell">
									<form method="POST" action="?/update" use:enhance class="inline-edit-form">
										<input type="hidden" name="transaction_id" value={tx.transaction_id} />
										<div class="inline-edit-fields">
											<div class="field-row">
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
													<DatePicker name="date" value={tx.date} required />
												</label>
											</div>
											<label class="full-width">
												Categories
												<CategoryInput mainCategories={data.mainCategories} subcategories={data.subcategories} value={cats.categories.map((c) => c.name)} />
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
												<button type="submit" name="update_future" value="true" class="btn-save-plus btn-sm" title="Adjust this and future transactions">
													Save+
												</button>
											{/if}
											<button type="button" onclick={() => (editingId = null)} class="btn-outline btn-sm">Cancel</button>
										</div>
									</form>
								</td>
							</tr>
						{:else}
							<tr class="data-row" onclick={() => startEdit(tx.transaction_id)}>
								<td>{formatDate(tx.date)}</td>
								<td>
									{#if mainCat}
										<div class="category-cell">
											<span class="main-cat-name">
												{mainCat.name}
												{#if cats.categories.length > 1}+{/if}
											</span>
											{#if cats.categories.length > 1}
												<div class="category-popup">
													<strong>Categories:</strong>
													<ul>
														{#each cats.categories as c}
															<li class={c.is_main ? 'popup-main' : ''}>{c.name}</li>
														{/each}
													</ul>
												</div>
											{/if}
										</div>
									{/if}
								</td>
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
													onclick={(e) => {
														if (!confirm('Delete this occurrence?')) {
															e.preventDefault();
														}
													}}
												>✕</button>
												<button
													type="submit"
													name="delete_series"
													value="true"
													class="btn-icon btn-icon-warn"
													title="Delete this and all future occurrences"
													onclick={(e) => {
														if (!confirm('Delete this and all future occurrences?')) {
															e.preventDefault();
														}
													}}
												>↺✕</button>
											</div>
										{:else}
											<button
												type="submit"
												name="delete_series"
												value="false"
												class="btn-icon"
												title="Delete transaction"
												onclick={(e) => {
													if (!confirm('Delete this transaction?')) {
														e.preventDefault();
													}
												}}
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

	<section class="card breakdown-card">
		<h2>Expense Breakdown</h2>
		<PieChart segments={categoryBreakdown} total={totalExpenses} />
	</section>

	<section class="card breakdown-card">
		<h2>Income vs Expenses</h2>
		<BarChart income={totalIncome} expenses={totalExpenses} />
	</section>
</main>

<style>
	main {
		max-width: 960px;
		margin: 2rem auto;
		padding: 0 1.5rem;
	}

	.breadcrumb {
		font-size: 0.85rem;
		color: var(--text-muted);
		margin-bottom: 0.75rem;
	}

	.breadcrumb a {
		color: var(--primary-alt);
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
		background: var(--bg-surface-alt);
		border-radius: 3px;
		font-size: 0.75rem;
		color: var(--text-muted);
		text-transform: capitalize;
	}

	.toolbar {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		margin-bottom: 1rem;
	}

	.tx-count {
		font-size: 0.85rem;
		color: var(--text-muted);
		flex: 1;
	}

	.card {
		background: var(--bg-surface);
		border: 1px solid var(--border-main);
		border-radius: 8px;
		padding: 1.5rem;
	}

	.form-card {
		margin-bottom: 1.5rem;
	}

	.breakdown-card {
		margin-top: 2rem;
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
		color: var(--text-muted);
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
		color: var(--text-main);
		cursor: pointer;
	}

	.toggle-label {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		color: var(--text-main);
		cursor: pointer;
	}

	input[type='text'],
	input[type='number'],
	input[type='date'],
	select {
		padding: 0.5rem 0.75rem;
		background: var(--bg-input);
		border: 1px solid var(--border-input);
		border-radius: 4px;
		color: var(--text-main);
		font-size: 0.95rem;
	}

	input:focus,
	select:focus {
		outline: none;
		border-color: var(--primary);
	}

	.form-actions {
		display: flex;
		gap: 0.75rem;
		align-items: center;
	}

	table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.9rem;
	}

	th {
		text-align: left;
		padding: 0.6rem 0.75rem;
		color: var(--text-muted);
		font-weight: 500;
		border-bottom: 1px solid var(--border-main);
		white-space: nowrap;
	}

	td {
		padding: 0.6rem 0.75rem;
		border-bottom: 1px solid var(--border-main);
		vertical-align: middle;
	}

	tr:last-child td {
		border-bottom: none;
	}

	.data-row {
		cursor: pointer;
	}

	.data-row:hover td {
		background: var(--bg-surface);
	}

	.editing-row td {
		background: var(--bg-main);
		border-bottom: 1px solid var(--border-input);
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
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.field-row {
		display: grid;
		grid-template-columns: 2fr 1fr 1fr;
		gap: 0.75rem;
	}

	.category-cell {
		position: relative;
		display: inline-block;
	}

	.main-cat-name {
		cursor: help;
	}

	.category-cell:hover .category-popup {
		display: block;
	}

	.category-popup {
		display: none;
		position: absolute;
		bottom: 100%;
		left: 0;
		z-index: 1001;
		background: var(--bg-surface);
		border: 1px solid var(--border-input);
		border-radius: 4px;
		padding: 0.75rem;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
		min-width: 150px;
		pointer-events: none;
	}

	.category-popup strong {
		display: block;
		font-size: 0.75rem;
		color: var(--text-muted);
		margin-bottom: 0.4rem;
		text-transform: uppercase;
	}

	.category-popup ul {
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.category-popup li {
		font-size: 0.85rem;
		color: var(--text-main);
		padding: 0.1rem 0;
	}

	.popup-main {
		font-weight: bold;
		color: var(--primary-alt);
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
		color: var(--text-muted);
	}

	.recurring-badge {
		font-size: 0.75rem;
		color: var(--primary);
		margin-left: 0.3rem;
	}

	.pos {
		color: var(--success-text);
	}

	.neg {
		color: var(--danger);
	}

	.amount {
		font-variant-numeric: tabular-nums;
	}

	.total {
		font-weight: 600;
		font-variant-numeric: tabular-nums;
	}

	.empty {
		color: var(--text-muted);
		text-align: center;
		margin-top: 3rem;
	}

	.error {
		color: var(--danger);
		margin-bottom: 1rem;
	}

	.btn-primary {
		padding: 0.5rem 1.25rem;
		background: var(--primary);
		color: var(--text-inverse);
		border: none;
		border-radius: 4px;
		font-size: 0.95rem;
		font-weight: 600;
		cursor: pointer;
	}

	.btn-primary:hover {
		background: var(--primary-hover);
	}

	.btn-save-plus {
		padding: 0.5rem 1.25rem;
		background: var(--success-bg);
		color: var(--success-text);
		border: 1px solid var(--success-border);
		border-radius: 4px;
		font-size: 0.95rem;
		font-weight: 600;
		cursor: pointer;
	}

	.btn-save-plus:hover {
		background: var(--success-hover);
	}

	.btn-outline {
		padding: 0.5rem 1.25rem;
		background: none;
		border: 1px solid var(--border-button);
		color: var(--text-main);
		border-radius: 4px;
		font-size: 0.95rem;
		cursor: pointer;
	}

	.btn-outline:hover {
		background: var(--bg-surface-alt);
	}

	.btn-sm {
		padding: 0.25rem 0.75rem;
		font-size: 0.8rem;
	}

	.btn-icon {
		background: none;
		border: none;
		color: var(--text-muted);
		cursor: pointer;
		padding: 0.2rem 0.4rem;
		font-size: 0.85rem;
		border-radius: 3px;
	}

	.btn-icon:hover {
		color: var(--danger);
		background: var(--danger-bg);
	}

	.btn-icon-warn:hover {
		color: var(--warning-text);
		background: var(--warning-bg);
	}

	.delete-group {
		display: flex;
		gap: 0.25rem;
		justify-content: flex-end;
	}
</style>
