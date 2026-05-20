import { mkdirSync } from 'fs';
import { dirname } from 'path';
import Database from 'better-sqlite3';
import { building } from '$app/environment';
import { registerHealthCheck } from '$lib/server/health.js';

/** @type {import('better-sqlite3').Database | null} */
let _db = null;

/** @returns {import('better-sqlite3').Database} */
export function getDb() {
    if (building) {
        throw new Error('getDb() should not be called during build');
    }
    if (!_db) {
        const path = process.env.DATABASE_PATH ?? './storage/penny_earned.db';
        mkdirSync(dirname(path), { recursive: true });
        _db = new Database(path);
        _db.pragma('journal_mode = WAL');
        _db.pragma('foreign_keys = ON');
    }
    return _db;
}

if (!building) {
    registerHealthCheck('database', () => getDb().prepare('SELECT 1').get());
}
