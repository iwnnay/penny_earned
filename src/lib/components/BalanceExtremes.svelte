<script>
	import { formatCurrency } from '$lib/shared/formatters.js';
	import { MONTH_NAMES } from '$lib/shared/constants.js';

	/**
	 * @type {{
	 *   extremes: { min: { total: number, month: string }, max: { total: number, month: string } } | null
	 * }}
	 */
	let { extremes } = $props();

	/**
	 * Converts a YYYY-MM string to a navigation href and a human-readable label.
	 * @param {string} ym  YYYY-MM
	 */
	function monthInfo(ym) {
		const [year, month] = ym.split('-').map(Number);
		return {
			href: `?year=${year}&month=${month}`,
			label: `${MONTH_NAMES[month - 1]} ${year}`
		};
	}
</script>

{#if extremes}
	{@const min = monthInfo(extremes.min.month)}
	{@const max = monthInfo(extremes.max.month)}
	<div class="extremes">
		<a href={min.href} class="extreme-link" title="Lowest balance: {min.label}">
			<span class="extreme-label">Min</span>
			<span class="extreme-value neg">{formatCurrency(extremes.min.total)}</span>
		</a>
		<a href={max.href} class="extreme-link" title="Highest balance: {max.label}">
			<span class="extreme-label">Max</span>
			<span class="extreme-value pos">{formatCurrency(extremes.max.total)}</span>
		</a>
	</div>
{/if}

<style>
	.extremes {
		display: flex;
		gap: 1rem;
	}

	.extreme-link {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		text-decoration: none;
		padding: 0.2rem 0.5rem;
		border-radius: 4px;
		border: 1px solid transparent;
		transition:
			border-color 0.1s,
			background 0.1s;
	}

	.extreme-link:hover {
		background: var(--bg-surface-alt);
		border-color: var(--border-main);
	}

	.extreme-label {
		font-size: 0.7rem;
		color: var(--text-muted);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		line-height: 1;
	}

	.extreme-value {
		font-size: 0.9rem;
		font-weight: 600;
		font-variant-numeric: tabular-nums;
		line-height: 1.3;
	}

	.pos {
		color: var(--success-text);
	}

	.neg {
		color: var(--danger);
	}
</style>
