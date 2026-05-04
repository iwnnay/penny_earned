const store = new Map(); // key -> { count, resetAt }
const WINDOW = 15 * 60 * 1000; // 15 minutes
const MAX = 10;

/** Returns true if the key is rate-limited. Increments the counter otherwise. */
export function isRateLimited(key) {
	const now = Date.now();
	const entry = store.get(key);

	if (!entry || entry.resetAt <= now) {
		store.set(key, { count: 1, resetAt: now + WINDOW });
		return false;
	}

	if (entry.count >= MAX) return true;

	entry.count++;
	return false;
}

export function clearRateLimit(key) {
	store.delete(key);
}

// Purge stale entries every 5 minutes to avoid unbounded memory growth
setInterval(() => {
	const now = Date.now();
	for (const [key, entry] of store) {
		if (entry.resetAt <= now) store.delete(key);
	}
}, 5 * 60 * 1000);
