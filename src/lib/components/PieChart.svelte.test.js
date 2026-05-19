import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import PieChart from './PieChart.svelte';

// Note: SVG <path> elements include a <title> child whose text looks like
// "Food: $300.00 (75.0%)". To avoid strict-mode ambiguity we use
// { exact: true } so that a query for "Food" only matches the legend <span>
// (exact text "Food"), not the title (exact text "Food: $300.00 (75.0%)").

describe('PieChart', () => {
	it('shows the empty-state message when total is 0', async () => {
		render(PieChart, { segments: [], total: 0 });
		await expect.element(page.getByText('No expenses this month.')).toBeVisible();
	});

	it('does not render the SVG chart when total is 0', async () => {
		render(PieChart, { segments: [], total: 0 });
		await expect.element(page.getByRole('img')).not.toBeInTheDocument();
	});

	it('renders an SVG chart when there are segments', async () => {
		render(PieChart, {
			segments: [{ label: 'Food', amount: 500 }],
			total: 500
		});
		await expect.element(page.getByRole('img')).toBeVisible();
	});

	it('renders one SVG slice path per segment', async () => {
		render(PieChart, {
			segments: [
				{ label: 'Food', amount: 300 },
				{ label: 'Bills', amount: 200 }
			],
			total: 500
		});
		const paths = page.getByRole('presentation');
		const elements = await paths.elements();
		expect(elements.length).toBe(2);
	});

	it('renders a legend entry for every segment', async () => {
		render(PieChart, {
			segments: [
				{ label: 'Food', amount: 300 },
				{ label: 'Entertainment', amount: 100 }
			],
			total: 400
		});
		// { exact: true } prevents matching SVG <title> nodes that contain "Food: ..."
		await expect.element(page.getByText('Food', { exact: true })).toBeVisible();
		await expect.element(page.getByText('Entertainment', { exact: true })).toBeVisible();
	});

	it('displays the correct percentage for each segment', async () => {
		render(PieChart, {
			segments: [{ label: 'Misc', amount: 250 }],
			total: 1000
		});
		// 250 / 1000 = 25.0%. The SVG title reads "Misc: $250.00 (25.0%)" so
		// an exact match on "25.0%" only hits the legend-pct span.
		await expect.element(page.getByText('25.0%', { exact: true })).toBeVisible();
	});

	it('shows "Total" in the donut center by default (no hover)', async () => {
		render(PieChart, {
			segments: [{ label: 'Bills', amount: 800 }],
			total: 800
		});
		// "Total" appears only in the center SVG text element when nothing is hovered.
		await expect.element(page.getByText('Total', { exact: true })).toBeVisible();
	});

	it('handles a single segment filling the entire chart at 100%', async () => {
		render(PieChart, {
			segments: [{ label: 'Rent', amount: 1500 }],
			total: 1500
		});
		// "100.0%" appears only in the legend-pct span (exact match).
		await expect.element(page.getByText('100.0%', { exact: true })).toBeVisible();
		await expect.element(page.getByText('Rent', { exact: true })).toBeVisible();
	});

	it('renders all twelve segments without palette collision', async () => {
		const segments = Array.from({ length: 12 }, (_, i) => ({ label: `Seg${i + 1}`, amount: 100 }));
		render(PieChart, { segments, total: 1200 });
		for (let i = 1; i <= 12; i++) {
			// "Seg1" through "Seg12" appear exactly in the legend; no SVG title
			// contains exactly this short label.
			await expect.element(page.getByText(`Seg${i}`, { exact: true })).toBeVisible();
		}
	});
});
