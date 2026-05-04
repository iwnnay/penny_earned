<script>
	import { invalidateAll } from '$app/navigation';
	import { formatCurrency, formatDate } from '$lib/shared/formatters.js';

	/**
	 * @type {{
	 *   accountId: number,
	 *   mainCategories: { category_id: number, name: string }[]
	 * }}
	 */
	let { accountId, mainCategories } = $props();

	// ---------------------------------------------------------------------------
	// State
	// ---------------------------------------------------------------------------

	/** @type {HTMLInputElement} */
	let fileInput = $state(null);
	let showDropdown = $state(false);

	/** @type {'idle' | 'loading' | 'review' | 'importing' | 'done'} */
	let phase = $state('idle');

	/**
	 * @type {{
	 *   fingerprint: string, date: string, description: string,
	 *   amount: number, debit: boolean, isDuplicate: boolean,
	 *   duplicateReason: string | null, suggestedCategoryId: number | null,
	 *   categorySource: string
	 * }[]}
	 */
	let rows = $state([]);

	/** Per-row selection state, mirrors `rows`. */
	let selections = $state(/** @type {{ selected: boolean, categoryId: number | null }[]} */ ([]));

	let showDuplicates = $state(false);
	let importResult = $state(/** @type {{ count: number, earliestDate: string | null } | null} */ (null));
	let error = $state(/** @type {string | null} */ (null));

	// ---------------------------------------------------------------------------
	// Derived
	// ---------------------------------------------------------------------------

	const newRows = $derived(rows.filter((r) => !r.isDuplicate));
	const dupRows = $derived(rows.filter((r) => r.isDuplicate));
	const visibleRows = $derived(
		showDuplicates ? rows : newRows
	);

	const selectedCount = $derived(
		selections.filter((s, i) => s.selected && (showDuplicates || !rows[i].isDuplicate)).length
	);

	const allNewSelected = $derived(
		newRows.length > 0 && newRows.every((_, localIdx) => {
			const globalIdx = rows.indexOf(newRows[localIdx]);
			return selections[globalIdx]?.selected;
		})
	);

	// ---------------------------------------------------------------------------
	// Handlers
	// ---------------------------------------------------------------------------

	function openFilePicker() {
		showDropdown = false;
		fileInput?.click();
	}

	/** @param {Event} e */
	async function onFileChange(e) {
		const input = /** @type {HTMLInputElement} */ (e.target);
		const file = input.files?.[0];
		if (!file) return;

		phase = 'loading';
		error = null;

		try {
			const fd = new FormData();
			fd.append('csv', file);

			const res = await fetch(`/api/accounts/${accountId}/import`, {
				method: 'POST',
				body: fd
			});
			if (!res.ok) throw new Error((await res.json()).error ?? res.statusText);

			const data = await res.json();
			rows = data.rows;
			selections = rows.map((r) => ({
				selected: !r.isDuplicate,
				categoryId: r.suggestedCategoryId
			}));
			phase = 'review';
		} catch (err) {
			error = /** @type {Error} */ (err).message;
			phase = 'idle';
		}

		input.value = '';
	}

	function toggleSelectAll() {
		const next = !allNewSelected;
		selections = selections.map((s, i) => ({
			...s,
			selected: rows[i].isDuplicate ? s.selected : next
		}));
	}

	/** @param {number} globalIdx */
	function toggleRow(globalIdx) {
		selections[globalIdx] = { ...selections[globalIdx], selected: !selections[globalIdx].selected };
	}

	/**
	 * @param {number} globalIdx
	 * @param {number} catId
	 */
	function onCategoryChange(globalIdx, catId) {
		selections[globalIdx] = { ...selections[globalIdx], categoryId: catId };
	}

	async function confirmImport() {
		const toImport = rows
			.map((row, i) => ({ row, sel: selections[i] }))
			.filter(({ sel }) => sel.selected)
			.map(({ row, sel }) => ({
				fingerprint: row.fingerprint,
				date: row.date,
				name: row.description,
				amount: row.amount,
				debit: row.debit,
				categoryId: sel.categoryId,
				saveRule: true
			}));

		if (toImport.length === 0) return;

		phase = 'importing';
		error = null;

		try {
			const res = await fetch(`/api/accounts/${accountId}/import`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ transactions: toImport })
			});
			if (!res.ok) throw new Error((await res.json()).error ?? res.statusText);

			importResult = await res.json();
			phase = 'done';
			await invalidateAll();
		} catch (err) {
			error = /** @type {Error} */ (err).message;
			phase = 'review';
		}
	}

	function close() {
		phase = 'idle';
		rows = [];
		selections = [];
		error = null;
		importResult = null;
		showDuplicates = false;
	}

	/** Formats YYYY-MM-DD as "Mon YYYY" for the earliest-date link. */
	function formatMonthLink(isoDate) {
		if (!isoDate) return null;
		const [year, month] = isoDate.split('-').map(Number);
		const label = new Date(year, month - 1).toLocaleString('default', { month: 'short', year: 'numeric' });
		return { year, month, label };
	}
</script>

<!-- Hidden file input -->
<input
	bind:this={fileInput}
	type="file"
	accept=".csv,.CSV"
	style="display:none"
	onchange={onFileChange}
/>

<!-- ▾ trigger + dropdown -->
<div class="import-wrap">
	<button
		class="btn-arrow btn-outline btn-sm"
		onclick={() => (showDropdown = !showDropdown)}
		aria-label="Import options"
		aria-expanded={showDropdown}
	>▾</button>

	{#if showDropdown}
		<div class="dropdown" role="menu">
			<button role="menuitem" onclick={openFilePicker}>Import CSV</button>
		</div>
	{/if}
</div>

<!-- Modal overlay -->
{#if phase !== 'idle'}
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
	<div
		class="overlay"
		onclick={(e) => {
			if (e.target === e.currentTarget && phase !== 'loading' && phase !== 'importing') close();
		}}
	>
		<div class="modal" role="dialog" aria-modal="true">

			<!-- Loading -->
			{#if phase === 'loading'}
				<div class="modal-body center">
					<p class="muted">Parsing CSV…</p>
				</div>

			<!-- Done -->
			{:else if phase === 'done' && importResult}
				{@const link = formatMonthLink(importResult.earliestDate)}
				<div class="modal-header">
					<h2>Import complete</h2>
				</div>
				<div class="modal-body center">
					<p class="success-msg">
						{importResult.count} transaction{importResult.count !== 1 ? 's' : ''} imported successfully.
					</p>
					{#if link && link.month}
						<p class="muted">
							Earliest transaction: <a href="/accounts/{accountId}?year={link.year}&month={link.month}">{link.label}</a>
						</p>
					{/if}
				</div>
				<div class="modal-footer">
					<button class="btn-primary" onclick={close}>Done</button>
				</div>

			<!-- Review / Importing -->
			{:else}
				<div class="modal-header">
					<h2>Review import</h2>
					<span class="summary-badge">
						{newRows.length} new
						{#if dupRows.length > 0}· {dupRows.length} duplicate{dupRows.length !== 1 ? 's' : ''}{/if}
					</span>
				</div>

				{#if error}
					<p class="error">{error}</p>
				{/if}

				<div class="modal-body">
					<div class="table-wrap">
						<table>
							<thead>
								<tr>
									<th class="col-check">
										<input
											type="checkbox"
											checked={allNewSelected}
											indeterminate={!allNewSelected && newRows.some((_, li) => selections[rows.indexOf(newRows[li])]?.selected)}
											onchange={toggleSelectAll}
											title="Select / deselect all new"
										/>
									</th>
									<th class="col-date">Date</th>
									<th>Description</th>
									<th class="col-amount">Amount</th>
									<th class="col-cat">Category</th>
									<th class="col-status">Status</th>
								</tr>
							</thead>
							<tbody>
								{#each visibleRows as row}
									{@const globalIdx = rows.indexOf(row)}
									{@const sel = selections[globalIdx]}
									<tr class:dup-row={row.isDuplicate} class:selected={sel?.selected}>
										<td class="col-check">
											<input
												type="checkbox"
												checked={sel?.selected}
												onchange={() => toggleRow(globalIdx)}
											/>
										</td>
										<td class="col-date muted">{formatDate(row.date)}</td>
										<td class="col-desc" title={row.description}>{row.description}</td>
										<td class="col-amount">
											{#if row.debit}
												<span class="pos">+{formatCurrency(row.amount)}</span>
											{:else}
												<span class="neg">-{formatCurrency(row.amount)}</span>
											{/if}
										</td>
										<td class="col-cat">
											{#if !row.isDuplicate}
												<select
													value={sel?.categoryId ?? ''}
													onchange={(e) => onCategoryChange(globalIdx, parseInt(/** @type {HTMLSelectElement} */(e.target).value))}
												>
													{#each mainCategories as cat}
														<option value={cat.category_id}>{cat.name}{row.suggestedCategoryId === cat.category_id && row.categorySource === 'rule' ? ' ★' : ''}</option>
													{/each}
												</select>
											{:else}
												<span class="muted">—</span>
											{/if}
										</td>
										<td class="col-status">
											{#if row.isDuplicate}
												<span class="badge-dup" title={row.duplicateReason === 'fingerprint' ? 'Previously imported' : 'Matches a manual entry'}>
													duplicate
												</span>
											{:else if row.categorySource === 'rule'}
												<span class="badge-rule" title="Category was remembered from a previous import">remembered</span>
											{/if}
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>

					{#if dupRows.length > 0}
						<button class="toggle-dups" onclick={() => (showDuplicates = !showDuplicates)}>
							{showDuplicates ? 'Hide duplicates' : `Show ${dupRows.length} duplicate${dupRows.length !== 1 ? 's' : ''}`}
						</button>
					{/if}
				</div>

				<div class="modal-footer">
					<span class="sel-count muted">{selectedCount} selected</span>
					<button class="btn-outline" onclick={close} disabled={phase === 'importing'}>Cancel</button>
					<button
						class="btn-primary"
						onclick={confirmImport}
						disabled={selectedCount === 0 || phase === 'importing'}
					>
						{phase === 'importing' ? 'Importing…' : `Import ${selectedCount}`}
					</button>
				</div>
			{/if}

		</div>
	</div>
{/if}

<style>
	/* Trigger */
	.import-wrap {
		position: relative;
	}

	.btn-arrow {
		padding: 0.25rem 0.5rem;
		font-size: 0.9rem;
		line-height: 1;
	}

	.dropdown {
		position: absolute;
		right: 0;
		top: calc(100% + 4px);
		background: var(--bg-surface);
		border: 1px solid var(--border-main);
		border-radius: 6px;
		box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
		min-width: 140px;
		z-index: 100;
		overflow: hidden;
	}

	.dropdown button {
		display: block;
		width: 100%;
		padding: 0.6rem 1rem;
		background: none;
		border: none;
		text-align: left;
		font-size: 0.875rem;
		color: var(--text-main);
		cursor: pointer;
	}

	.dropdown button:hover {
		background: var(--bg-surface-alt);
	}

	/* Overlay */
	.overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.6);
		display: flex;
		align-items: flex-start;
		justify-content: center;
		padding: 3rem 1rem;
		z-index: 500;
		overflow-y: auto;
	}

	.modal {
		background: var(--bg-main);
		border: 1px solid var(--border-main);
		border-radius: 10px;
		width: 100%;
		max-width: 860px;
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	.modal-header {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 1.25rem 1.5rem;
		border-bottom: 1px solid var(--border-main);
	}

	.modal-header h2 {
		margin: 0;
		font-size: 1.1rem;
	}

	.summary-badge {
		font-size: 0.8rem;
		color: var(--text-muted);
		background: var(--bg-surface-alt);
		padding: 0.2rem 0.6rem;
		border-radius: 3px;
	}

	.modal-body {
		padding: 1rem 1.5rem;
		overflow-y: auto;
		max-height: 60vh;
	}

	.modal-body.center {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		min-height: 120px;
		gap: 0.5rem;
	}

	.modal-footer {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 1rem 1.5rem;
		border-top: 1px solid var(--border-main);
	}

	.sel-count {
		flex: 1;
		font-size: 0.875rem;
	}

	/* Table */
	.table-wrap {
		overflow-x: auto;
	}

	table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.85rem;
	}

	th {
		text-align: left;
		padding: 0.5rem 0.6rem;
		color: var(--text-muted);
		font-weight: 500;
		border-bottom: 1px solid var(--border-main);
		white-space: nowrap;
	}

	td {
		padding: 0.45rem 0.6rem;
		border-bottom: 1px solid var(--border-main);
		vertical-align: middle;
	}

	tr:last-child td {
		border-bottom: none;
	}

	.dup-row td {
		opacity: 0.45;
	}

	.col-check {
		width: 2rem;
	}

	.col-date {
		white-space: nowrap;
		width: 6rem;
	}

	.col-desc {
		max-width: 320px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.col-amount {
		text-align: right;
		white-space: nowrap;
		font-variant-numeric: tabular-nums;
	}

	.col-cat {
		width: 140px;
	}

	.col-status {
		width: 90px;
		text-align: right;
	}

	select {
		width: 100%;
		padding: 0.25rem 0.4rem;
		background: var(--bg-input);
		border: 1px solid var(--border-input);
		border-radius: 4px;
		color: var(--text-main);
		font-size: 0.8rem;
	}

	select:focus {
		outline: none;
		border-color: var(--primary);
	}

	.badge-dup {
		font-size: 0.7rem;
		background: var(--bg-surface-alt);
		color: var(--text-muted);
		padding: 0.1rem 0.4rem;
		border-radius: 3px;
	}

	.badge-rule {
		font-size: 0.7rem;
		background: var(--bg-surface-alt);
		color: var(--primary);
		padding: 0.1rem 0.4rem;
		border-radius: 3px;
	}

	.toggle-dups {
		margin-top: 0.75rem;
		background: none;
		border: none;
		color: var(--text-muted);
		font-size: 0.8rem;
		cursor: pointer;
		padding: 0;
		text-decoration: underline;
	}

	.toggle-dups:hover {
		color: var(--primary);
	}

	/* Misc */
	.muted {
		color: var(--text-muted);
	}

	.pos {
		color: var(--success-text);
	}

	.neg {
		color: var(--danger);
	}

	.error {
		color: var(--danger);
		font-size: 0.875rem;
		padding: 0 1.5rem;
	}

	.success-msg {
		font-size: 1rem;
		color: var(--text-main);
		margin: 0;
	}

	.success-msg + p {
		margin: 0;
	}

	/* Buttons (scoped copies — modal is a portal outside page styles) */
	.btn-primary {
		padding: 0.5rem 1.25rem;
		background: var(--primary);
		color: var(--text-inverse);
		border: none;
		border-radius: 4px;
		font-size: 0.9rem;
		font-weight: 600;
		cursor: pointer;
	}

	.btn-primary:hover:not(:disabled) {
		background: var(--primary-hover);
	}

	.btn-primary:disabled {
		opacity: 0.5;
		cursor: default;
	}

	.btn-outline {
		padding: 0.5rem 1.25rem;
		background: none;
		border: 1px solid var(--border-button);
		color: var(--text-main);
		border-radius: 4px;
		font-size: 0.9rem;
		cursor: pointer;
	}

	.btn-outline:hover:not(:disabled) {
		background: var(--bg-surface-alt);
	}

	.btn-outline:disabled {
		opacity: 0.5;
		cursor: default;
	}

	.btn-sm {
		padding: 0.25rem 0.75rem;
		font-size: 0.8rem;
	}
</style>
