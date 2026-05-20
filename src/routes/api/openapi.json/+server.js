import spec from '$lib/server/openapi.json?raw';

/** @type {import('./$types').RequestHandler} */
export function GET() {
    return new Response(spec, { headers: { 'Content-Type': 'application/json' } });
}
