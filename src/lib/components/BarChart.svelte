<script>
    import { formatCurrency } from '$lib/shared/formatters.js';

    /** @type {{ income: number, expenses: number }} */
    let { income, expenses } = $props();

    const W = 320;
    const H = 200;
    const BAR_W = 80;
    const PAD_TOP = 36;
    const PAD_BOTTOM = 48;
    const PAD_SIDE = 60;
    const CHART_H = H - PAD_TOP - PAD_BOTTOM;

    const max = $derived(Math.max(income, expenses, 1));
    const incomeH = $derived((income / max) * CHART_H);
    const expensesH = $derived((expenses / max) * CHART_H);

    const GAP = W - PAD_SIDE * 2 - BAR_W * 2;
    const incomeX = PAD_SIDE;
    const expensesX = PAD_SIDE + BAR_W + GAP;
    const baseY = PAD_TOP + CHART_H;

    const net = $derived(income - expenses);
</script>

{#if income === 0 && expenses === 0}
    <p class="no-data">No transactions this month.</p>
{:else}
    <div class="chart-wrap">
        <svg viewBox="0 0 {W} {H}" class="bar-chart" role="img" aria-label="Income vs expenses">
            <!-- Baseline -->
            <line x1={PAD_SIDE - 8} y1={baseY} x2={W - PAD_SIDE + 8} y2={baseY} class="baseline" />

            <!-- Income bar -->
            {#if income > 0}
                <rect
                    x={incomeX}
                    y={baseY - incomeH}
                    width={BAR_W}
                    height={incomeH}
                    class="bar bar-income"
                    rx="3"
                />
            {/if}
            <text x={incomeX + BAR_W / 2} y={baseY - incomeH - 8} class="bar-amount income-amount">
                {formatCurrency(income)}
            </text>
            <text x={incomeX + BAR_W / 2} y={baseY + 18} class="bar-label">Income</text>

            <!-- Expenses bar -->
            {#if expenses > 0}
                <rect
                    x={expensesX}
                    y={baseY - expensesH}
                    width={BAR_W}
                    height={expensesH}
                    class="bar bar-expenses"
                    rx="3"
                />
            {/if}
            <text x={expensesX + BAR_W / 2} y={baseY - expensesH - 8} class="bar-amount expenses-amount">
                {formatCurrency(expenses)}
            </text>
            <text x={expensesX + BAR_W / 2} y={baseY + 18} class="bar-label">Expenses</text>
        </svg>

        <div class="net-summary">
            <span class="net-label">Net</span>
            <span class="net-value" class:net-pos={net >= 0} class:net-neg={net < 0}>
                {net >= 0 ? '+' : ''}{formatCurrency(net)}
            </span>
        </div>
    </div>
{/if}

<style>
    .chart-wrap {
        display: flex;
        align-items: center;
        gap: 2rem;
        flex-wrap: wrap;
    }

    .bar-chart {
        width: 320px;
        height: 200px;
        flex-shrink: 0;
    }

    .baseline {
        stroke: #2a4a60;
        stroke-width: 1.5;
    }

    .bar {
        transition: opacity 0.15s;
    }

    .bar:hover {
        opacity: 0.8;
    }

    .bar-income {
        fill: #3a7060;
    }

    .bar-expenses {
        fill: #a85860;
    }

    .bar-amount {
        text-anchor: middle;
        font-size: 11px;
        font-weight: 600;
        font-variant-numeric: tabular-nums;
    }

    .income-amount {
        fill: #5aaa90;
    }

    .expenses-amount {
        fill: #c87880;
    }

    .bar-label {
        text-anchor: middle;
        font-size: 11px;
        fill: #7a9ab5;
    }

    .net-summary {
        display: flex;
        flex-direction: column;
        gap: 0.3rem;
    }

    .net-label {
        font-size: 0.75rem;
        color: #7a9ab5;
        text-transform: uppercase;
        letter-spacing: 0.05em;
    }

    .net-value {
        font-size: 1.4rem;
        font-weight: 700;
        font-variant-numeric: tabular-nums;
    }

    .net-pos {
        color: #5aaa90;
    }

    .net-neg {
        color: #c87880;
    }

    .no-data {
        color: #7a9ab5;
        font-size: 0.9rem;
        margin: 0;
    }
</style>
