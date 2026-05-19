<script>
	import { MONTH_NAMES } from '$lib/shared/constants.js';

	/**
	 * @type {{
	 *   year: number,
	 *   month: number,
	 *   horizon: string
	 * }}
	 */
	let { year, month, horizon } = $props();

	const currentMonthStr = $derived(`${year}-${String(month).padStart(2, '0')}`);
	const isAtHorizon = $derived(currentMonthStr >= horizon);

	/**
	 * Future months from today through the horizon, grouped by year for the
	 * jump-to-month dropdown.
	 * @type {Array<{ year: number, months: number[] }>}
	 */
	const monthGroups = $derived(
		(() => {
			const now = new Date();
			let y = now.getFullYear();
			let m = now.getMonth() + 1;
			const [hy, hm] = horizon.split('-').map(Number);
			/** @type {Record<number, number[]>} */
			const byYear = {};
			while (y < hy || (y === hy && m <= hm)) {
				if (!byYear[y]) {
					byYear[y] = [];
				}
				byYear[y].push(m);
				m++;
				if (m > 12) {
					m = 1;
					y++;
				}
			}
			return Object.entries(byYear).map(([yr, months]) => ({ year: Number(yr), months }));
		})()
	);

	let showMonthPicker = $state(false);

	function prevMonthHref() {
		let y = year;
		let m = month - 1;
		if (m < 1) {
			m = 12;
			y--;
		}
		return `?year=${y}&month=${m}`;
	}

	function nextMonthHref() {
		let y = year;
		let m = month + 1;
		if (m > 12) {
			m = 1;
			y++;
		}
		return `?year=${y}&month=${m}`;
	}
</script>

<div class="month-nav">
	<!-- Back group: ← button + ▾ go-to-current shortcut -->
	<div class="nav-btn-group">
		<a href={prevMonthHref()} class="nav-btn">&larr;</a>
		<a href="?" class="nav-btn nav-btn-caret" title="Go to current month">&#x25BE;</a>
	</div>

	<span class="month-label">{MONTH_NAMES[month - 1]} {year}</span>

	<!-- Forward group: → button + ▴ month-picker dropdown (hidden at horizon) -->
	{#if !isAtHorizon}
		<div class="nav-btn-group nav-forward-group">
			<a href={nextMonthHref()} class="nav-btn">&rarr;</a>
			<button class="nav-btn nav-btn-caret" onclick={() => (showMonthPicker = !showMonthPicker)} aria-label="Jump to month">&#x25B4;</button>

			{#if showMonthPicker}
				<!-- svelte-ignore a11y_no_static_element_interactions -->
				<div class="month-picker-backdrop" onclick={() => (showMonthPicker = false)}></div>
				<div class="month-picker">
					{#each monthGroups as group}
						<div class="picker-year-group">
							<span class="picker-year">{group.year}</span>
							<div class="picker-months">
								{#each group.months as m}
									{@const str = `${group.year}-${String(m).padStart(2, '0')}`}
									<a
										href={`?year=${group.year}&month=${m}`}
										class="picker-month"
										class:picker-month-current={str === currentMonthStr}
										onclick={() => (showMonthPicker = false)}
									>{MONTH_NAMES[m - 1].slice(0, 3)}</a>
								{/each}
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	{/if}
</div>

<style>
	.month-nav {
		display: flex;
		align-items: center;
		gap: 1rem;
		margin-bottom: 1.25rem;
	}

	.nav-btn-group {
		display: flex;
		position: relative;
	}

	.nav-btn-group .nav-btn:first-child {
		border-right: none;
		border-radius: 4px 0 0 4px;
	}

	.nav-btn-group .nav-btn:last-child {
		border-radius: 0 4px 4px 0;
		padding-left: 0.5rem;
		padding-right: 0.5rem;
		font-size: 0.75rem;
		color: var(--text-muted);
	}

	.nav-btn-group .nav-btn:last-child:hover {
		color: var(--primary);
	}

	.nav-btn {
		padding: 0.3rem 0.75rem;
		background: var(--bg-surface);
		border: 1px solid var(--border-input);
		border-radius: 4px;
		color: var(--text-main);
		text-decoration: none;
		font-size: 1rem;
		cursor: pointer;
		font-family: inherit;
	}

	.nav-btn:hover {
		background: var(--bg-surface-alt);
	}

	.month-label {
		font-size: 1.1rem;
		font-weight: 600;
		min-width: 160px;
		text-align: center;
	}

	.month-picker-backdrop {
		position: fixed;
		inset: 0;
		z-index: 10;
	}

	.month-picker {
		position: absolute;
		top: calc(100% + 0.4rem);
		right: 0;
		z-index: 11;
		background: var(--bg-surface);
		border: 1px solid var(--border-input);
		border-radius: 6px;
		padding: 1rem;
		display: flex;
		flex-direction: column;
		gap: 1rem;
		min-width: 220px;
		box-shadow: 0 6px 24px rgba(0, 0, 0, 0.5);
	}

	.picker-year-group {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
	}

	.picker-year {
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--text-muted);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.picker-months {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 0.25rem;
	}

	.picker-month {
		padding: 0.3rem 0.25rem;
		text-align: center;
		font-size: 0.8rem;
		color: var(--text-main);
		text-decoration: none;
		border-radius: 4px;
		border: 1px solid transparent;
	}

	.picker-month:hover {
		background: var(--bg-surface-alt);
		border-color: var(--border-input);
	}

	.picker-month-current {
		border-color: var(--primary);
		color: var(--primary);
		font-weight: 600;
	}
</style>
