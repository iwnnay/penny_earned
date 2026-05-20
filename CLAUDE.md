# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # dev server on port 5400
npm run build        # production build
npm run lint         # prettier --check + eslint
npm run format       # prettier --write
npm run test         # run all tests once
npm run test:unit    # run tests in watch mode
```

Run a single test file:
```bash
npx vitest run src/lib/server/transactions.test.js
```

## Architecture

SvelteKit app using Svelte 5 (runes mode enforced globally via `svelte.config.js`). SQLite database via `better-sqlite3` (synchronous, file-based). No ORM — raw SQL throughout.

### Request lifecycle

`src/hooks.server.js` runs on every request: it calls `migrate()` (idempotent, one-time), reads the session cookie, and sets `event.locals.user`. All route `load` functions and API handlers gate on `locals.user`.

### Data layer (`src/lib/server/`)

- **`db/client.js`** — singleton `getDb()`. Uses `DATABASE_PATH` env var (default `./storage/penny_earned.db`; the parent directory is created on first run).
- **`db/migrate.js`** — applies `schema.sql` then runs numbered migrations from the `MIGRATIONS` array. Safe to call on every startup.
- **`db/schema.sql`** — baseline schema. Altering this file without a matching migration will not automatically update existing databases.
- **`transactions.js`** — core financial logic. Every mutation (create/update/delete) ends with a `recalculateFromMonth()` call that recomputes the `order` and `total` columns from the affected month forward. This is the only place running balances are maintained.
- **`categories.js`** — two-tier category system: global main categories (`account_id IS NULL`) and account-specific subcategories (`account_id = <id>`). The `is_main` flag on a category is derived at read time as `account_id === null`.
- **`import.js`** — Chase CSV parser + fingerprint-based dedup. Fingerprints are `date|amount|direction|description[:ordinal]`.
- **`session.js`**, **`auth.js`**, **`mfa.js`**, **`password-reset.js`**, **`rate-limit.js`** — auth subsystem. `rate-limit.js` is in-process memory (resets on server restart).

### Key domain invariants

- `debit = true` means **income / credit** (adds to balance). `debit = false` means **expense / withdrawal**. The naming follows the bank ledger convention where a debit to your account increases it.
- The `order` column is an account-scoped monotonically increasing integer used to determine running-total order. It is not stable across recalculates — never store it externally.
- Recurring series are UUID-keyed. `ensureHorizonForAccount()` extends series to 24 months out and is called on every account page load via a cookie-based horizon check.
- Within the same day, withdrawals (debit=0) sort before debits (debit=1) in the ledger order.

### Shared utilities (`src/lib/shared/`)

- **`types.js`** — JSDoc typedefs only (no runtime code). `Transaction`, `Account`, `User`, `RecurringFrequency`.
- **`constants.js`** — `RECURRING_FREQUENCIES`, `HORIZON_MONTHS`, `MAX_CATEGORIES_PER_TRANSACTION`, `MONTH_NAMES`.
- **`formatters.js`** — `formatCurrency`, `formatDate`, `formatPercent`. Safe to use in both server and client code.

### REST API (`src/routes/api/`)

Thin wrappers over the server modules. OpenAPI spec lives in `src/lib/server/openapi.json`; served at `/api/openapi.json` and rendered by Swagger UI at `/api/swagger`.

## Testing

Vitest runs in a node environment and includes `*.test.js` / `*.spec.js`. Server tests use in-memory SQLite: tests `vi.mock('$lib/server/db/client.js', () => ({ getDb: () => testDb }))` and create a fresh `freshDb()` in `beforeEach`.

The `vi.mock()` pattern must import the module under test **after** the mock registrations (dynamic `await import(...)` at module level, outside `describe`/`it` blocks).

## Environment

`DATABASE_PATH` — path to the SQLite file. Defaults to `./storage/penny_earned.db`; the parent directory is created on first run.

Email sending in `src/lib/server/email.js` is a no-op stub in dev (logs to console) and throws in production until an email provider is wired in.
