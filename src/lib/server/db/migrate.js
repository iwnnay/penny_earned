import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { join, dirname } from 'path';
import { getDb } from './client.js';

let migrated = false;

export function migrate() {
    if (migrated) {
        return;
    }
    const db = getDb();
    const schemaPath = join(dirname(fileURLToPath(import.meta.url)), 'schema.sql');
    const schema = readFileSync(schemaPath, 'utf-8');
    db.exec(schema);
    migrated = true;
}
