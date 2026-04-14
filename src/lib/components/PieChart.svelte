<script>
    import { formatCurrency } from '$lib/shared/formatters.js';

    /**
     * @type {{
     *   segments: Array<{ label: string, amount: number }>,
     *   total: number
     * }}
     */
    let { segments, total } = $props();

    const SIZE = 220;
    const R = 80;
    const CX = SIZE / 2;
    const CY = SIZE / 2;

    // Muted financial palette — distinct but not neon
    const COLORS = [
        '#4a82a8', // steel blue
        '#3a7060', // teal
        '#7a6040', // amber
        '#6a5a90', // purple
        '#3a6a50', // green
        '#7a5050', // rose
        '#4a6a80', // slate
        '#7a6a40', // olive
        '#5a4878', // indigo
        '#3a5870', // dark teal
        '#6a4050', // mauve
        '#507050', // forest
    ];

    /**
     * Converts polar coordinates to Cartesian.
     * @param {number} angle  radians, 0 = right, increases clockwise
     * @returns {{ x: number, y: number }}
     */
    function polar(angle) {
        return {
            x: CX + R * Math.cos(angle),
            y: CY + R * Math.sin(angle),
        };
    }

    /**
     * Builds an SVG arc path for one pie slice.
     * @param {number} startAngle
     * @param {number} endAngle
     */
    function slicePath(startAngle, endAngle) {
        const start = polar(startAngle);
        const end = polar(endAngle);
        const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;
        return [
            `M ${CX} ${CY}`,
            `L ${start.x.toFixed(3)} ${start.y.toFixed(3)}`,
            `A ${R} ${R} 0 ${largeArc} 1 ${end.x.toFixed(3)} ${end.y.toFixed(3)}`,
            'Z',
        ].join(' ');
    }

    const slices = $derived((() => {
        if (total === 0) { return []; }
        let angle = -Math.PI / 2; // start at top
        return segments.map((seg, i) => {
            const sweep = (seg.amount / total) * 2 * Math.PI;
            const path = slicePath(angle, angle + sweep);
            const mid = angle + sweep / 2;
            angle += sweep;
            return {
                ...seg,
                path,
                color: COLORS[i % COLORS.length],
                pct: ((seg.amount / total) * 100).toFixed(1),
                mid,
            };
        });
    })());

    let hoveredIndex = $state(/** @type {number | null} */ (null));
</script>

{#if total === 0}
    <p class="no-data">No expenses this month.</p>
{:else}
    <div class="chart-wrap">
        <svg viewBox="0 0 {SIZE} {SIZE}" class="pie" role="img" aria-label="Expense breakdown">
            {#each slices as slice, i}
                <!-- svelte-ignore a11y_no_static_element_interactions -->
                <path
                    d={slice.path}
                    fill={slice.color}
                    class="slice"
                    class:slice-hovered={hoveredIndex === i}
                    onmouseenter={() => (hoveredIndex = i)}
                    onmouseleave={() => (hoveredIndex = null)}
                    role="presentation"
                >
                    <title>{slice.label}: {formatCurrency(slice.amount)} ({slice.pct}%)</title>
                </path>
            {/each}
            <!-- Donut hole -->
            <circle cx={CX} cy={CY} r={R * 0.52} class="donut-hole" />
            <!-- Center label -->
            {#if hoveredIndex !== null}
                <text x={CX} y={CY - 8} class="center-label-main">{slices[hoveredIndex].label}</text>
                <text x={CX} y={CY + 12} class="center-label-sub">{formatCurrency(slices[hoveredIndex].amount)}</text>
                <text x={CX} y={CY + 28} class="center-label-pct">{slices[hoveredIndex].pct}%</text>
            {:else}
                <text x={CX} y={CY - 6} class="center-label-main">Total</text>
                <text x={CX} y={CY + 14} class="center-label-sub">{formatCurrency(total)}</text>
            {/if}
        </svg>

        <ul class="legend">
            {#each slices as slice, i}
                <!-- svelte-ignore a11y_no_static_element_interactions -->
                <li
                    class="legend-item"
                    class:legend-item-hovered={hoveredIndex === i}
                    onmouseenter={() => (hoveredIndex = i)}
                    onmouseleave={() => (hoveredIndex = null)}
                >
                    <span class="swatch" style="background:{slice.color}"></span>
                    <span class="legend-label">{slice.label}</span>
                    <span class="legend-amount">{formatCurrency(slice.amount)}</span>
                    <span class="legend-pct">{slice.pct}%</span>
                </li>
            {/each}
        </ul>
    </div>
{/if}

<style>
    .chart-wrap {
        display: flex;
        gap: 2rem;
        align-items: flex-start;
        flex-wrap: wrap;
    }

    .pie {
        width: 220px;
        height: 220px;
        flex-shrink: 0;
    }

    .slice {
        transition: opacity 0.15s;
        cursor: default;
    }

    .slice-hovered {
        opacity: 0.85;
    }

    .donut-hole {
        fill: #111f30;
    }

    .center-label-main {
        text-anchor: middle;
        font-size: 11px;
        fill: #7a9ab5;
        font-weight: 500;
    }

    .center-label-sub {
        text-anchor: middle;
        font-size: 13px;
        fill: #c5d8e8;
        font-weight: 600;
    }

    .center-label-pct {
        text-anchor: middle;
        font-size: 11px;
        fill: #7a9ab5;
    }

    .legend {
        list-style: none;
        margin: 0;
        padding: 0;
        display: flex;
        flex-direction: column;
        gap: 0.4rem;
        flex: 1;
        min-width: 180px;
    }

    .legend-item {
        display: grid;
        grid-template-columns: 10px 1fr auto auto;
        align-items: center;
        gap: 0.5rem;
        padding: 0.3rem 0.5rem;
        border-radius: 4px;
        cursor: default;
        transition: background 0.1s;
        font-size: 0.85rem;
    }

    .legend-item-hovered {
        background: #172840;
    }

    .swatch {
        width: 10px;
        height: 10px;
        border-radius: 2px;
        flex-shrink: 0;
    }

    .legend-label {
        color: #c5d8e8;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .legend-amount {
        color: #a85860;
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
        margin-left: 0.5rem;
    }

    .legend-pct {
        color: #506880;
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
        min-width: 3.5rem;
        text-align: right;
    }

    .no-data {
        color: #7a9ab5;
        font-size: 0.9rem;
        margin: 0;
    }
</style>
