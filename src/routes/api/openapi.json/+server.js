import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { join, dirname } from 'path';

const spec = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '../../../lib/server/openapi.json'), 'utf-8');

/** @type {import('./$types').RequestHandler} */
export function GET() {
    return new Response(spec, { headers: { 'Content-Type': 'application/json' } });
}
