import { describe, it, expect } from 'vitest';
import { formatCurrency, formatDate, formatPercent } from './formatters.js';

describe('formatCurrency', () => {
	it('formats a positive amount with dollar sign and two decimal places', () => {
		expect(formatCurrency(1234.56)).toBe('$1,234.56');
	});

	it('formats zero as $0.00', () => {
		expect(formatCurrency(0)).toBe('$0.00');
	});

	it('formats a negative amount with a leading minus sign', () => {
		expect(formatCurrency(-500)).toBe('-$500.00');
	});

	it('rounds to two decimal places', () => {
		expect(formatCurrency(9.999)).toBe('$10.00');
	});

	it('formats a large amount with comma separators', () => {
		expect(formatCurrency(1000000)).toBe('$1,000,000.00');
	});
});

describe('formatDate', () => {
	it('formats a mid-month ISO date', () => {
		expect(formatDate('2026-04-14')).toBe('Apr 14, 2026');
	});

	it('formats the first day of a month', () => {
		expect(formatDate('2026-01-01')).toBe('Jan 1, 2026');
	});

	it('formats the last day of February in a leap year', () => {
		expect(formatDate('2024-02-29')).toBe('Feb 29, 2024');
	});

	it('formats a December date correctly', () => {
		expect(formatDate('2025-12-31')).toBe('Dec 31, 2025');
	});

	it('does not shift the day due to timezone (treats date as local)', () => {
		// Constructing via `new Date(year, month-1, day)` avoids UTC midnight rollback.
		const result = formatDate('2026-03-01');
		expect(result).toBe('Mar 1, 2026');
	});
});

describe('formatPercent', () => {
	it('formats an integer rate with three decimal places', () => {
		expect(formatPercent(1)).toBe('1.000%');
	});

	it('formats zero as 0.000%', () => {
		expect(formatPercent(0)).toBe('0.000%');
	});

	it('formats a fractional rate preserving three decimal places', () => {
		expect(formatPercent(4.125)).toBe('4.125%');
	});

	it('rounds to three decimal places', () => {
		expect(formatPercent(1.2349)).toBe('1.235%');
	});
});
