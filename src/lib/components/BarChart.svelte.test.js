import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import BarChart from './BarChart.svelte';

describe('BarChart', () => {
	it('shows the empty-state message when both income and expenses are 0', async () => {
		render(BarChart, { income: 0, expenses: 0 });
		await expect.element(page.getByText('No transactions this month.')).toBeVisible();
	});

	it('does not render the SVG chart when both values are 0', async () => {
		render(BarChart, { income: 0, expenses: 0 });
		await expect.element(page.getByRole('img')).not.toBeInTheDocument();
	});

	it('renders the SVG chart when there is income', async () => {
		render(BarChart, { income: 1000, expenses: 0 });
		await expect.element(page.getByRole('img')).toBeVisible();
	});

	it('renders the SVG chart when there are expenses', async () => {
		render(BarChart, { income: 0, expenses: 500 });
		await expect.element(page.getByRole('img')).toBeVisible();
	});

	it('renders the SVG chart when both income and expenses are non-zero', async () => {
		render(BarChart, { income: 1000, expenses: 500 });
		await expect.element(page.getByRole('img')).toBeVisible();
	});

	it('displays the income amount', async () => {
		render(BarChart, { income: 1200, expenses: 800 });
		await expect.element(page.getByText('$1,200.00', { exact: true })).toBeVisible();
	});

	it('displays the expenses amount', async () => {
		render(BarChart, { income: 1200, expenses: 800 });
		await expect.element(page.getByText('$800.00', { exact: true })).toBeVisible();
	});

	it('shows a positive net with a + prefix', async () => {
		render(BarChart, { income: 1000, expenses: 400 });
		await expect.element(page.getByText('+$600.00')).toBeVisible();
	});

	it('shows a negative net (no + prefix) when expenses exceed income', async () => {
		render(BarChart, { income: 400, expenses: 1000 });
		await expect.element(page.getByText('-$600.00')).toBeVisible();
	});

	it('shows +$0.00 when income equals expenses', async () => {
		render(BarChart, { income: 500, expenses: 500 });
		await expect.element(page.getByText('+$0.00')).toBeVisible();
	});

	it('shows the "Income" bar label', async () => {
		render(BarChart, { income: 1000, expenses: 500 });
		await expect.element(page.getByText('Income', { exact: true })).toBeVisible();
	});

	it('shows the "Expenses" bar label', async () => {
		render(BarChart, { income: 1000, expenses: 500 });
		await expect.element(page.getByText('Expenses', { exact: true })).toBeVisible();
	});
});
