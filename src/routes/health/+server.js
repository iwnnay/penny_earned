import { json } from '@sveltejs/kit';
import { runHealthChecks } from '$lib/server/health.js';

export async function GET() {
	const report = await runHealthChecks();
	return json(report, { status: report.status === 'ok' ? 200 : 503 });
}
