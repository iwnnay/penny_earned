/** @typedef {() => unknown | Promise<unknown>} HealthCheck */
/** @typedef {{ status: 'ok' | 'error', checks?: Record<string, unknown> }} HealthReport */

const checks = new Map();

/** @param {string} name @param {HealthCheck} check */
export function registerHealthCheck(name, check) {
	checks.set(name, check);
}

/** @param {string} name */
export function unregisterHealthCheck(name) {
	checks.delete(name);
}

/** @returns {Promise<HealthReport>} */
export async function runHealthChecks() {
	if (checks.size === 0) {
		return { status: 'ok' };
	}

	const entries = await Promise.all(
		Array.from(checks, async ([name, check]) => {
			try {
				return [name, await check(), false];
			} catch (err) {
				const message = err instanceof Error ? err.message : String(err);
				return [name, { error: message }, true];
			}
		})
	);

	/** @type {Record<string, unknown>} */
	const results = {};
	let failed = false;
	for (const [name, value, isError] of entries) {
		results[name] = value;
		if (isError) failed = true;
	}

	return { status: failed ? 'error' : 'ok', checks: results };
}
