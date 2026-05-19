import { describe, it, expect } from 'vitest';
import { isRateLimited, clearRateLimit } from './rate-limit.js';

// Each test uses a unique key so module-level Map state doesn't bleed between tests.
let keyCounter = 0;
const key = () => `test-rl-${keyCounter++}`;

describe('isRateLimited', () => {
	it('returns false on the very first call for a key', () => {
		expect(isRateLimited(key())).toBe(false);
	});

	it('returns false for the first 10 requests within the window', () => {
		const k = key();
		for (let i = 0; i < 10; i++) {
			expect(isRateLimited(k)).toBe(false);
		}
	});

	it('returns true on the 11th request (exceeds MAX of 10)', () => {
		const k = key();
		for (let i = 0; i < 10; i++) isRateLimited(k);
		expect(isRateLimited(k)).toBe(true);
	});

	it('continues returning true on subsequent calls once limited', () => {
		const k = key();
		for (let i = 0; i < 10; i++) isRateLimited(k);
		expect(isRateLimited(k)).toBe(true);
		expect(isRateLimited(k)).toBe(true);
	});

	it('tracks separate counters for different keys', () => {
		const k1 = key();
		const k2 = key();
		for (let i = 0; i < 10; i++) isRateLimited(k1);
		expect(isRateLimited(k1)).toBe(true);
		expect(isRateLimited(k2)).toBe(false);
	});
});

describe('clearRateLimit', () => {
	it('allows requests again immediately after clearing', () => {
		const k = key();
		for (let i = 0; i < 10; i++) isRateLimited(k);
		expect(isRateLimited(k)).toBe(true);

		clearRateLimit(k);

		expect(isRateLimited(k)).toBe(false);
	});

	it('is a no-op for an unknown key', () => {
		expect(() => clearRateLimit(key())).not.toThrow();
	});
});
