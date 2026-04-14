PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
    user_id  INTEGER PRIMARY KEY AUTOINCREMENT,
    email    TEXT    NOT NULL UNIQUE,
    password TEXT    NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
    token    TEXT    PRIMARY KEY,
    user_id  INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    expires  TEXT    NOT NULL
);

CREATE TABLE IF NOT EXISTS accounts (
    account_id      INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id         INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    name            TEXT    NOT NULL,
    type            TEXT    NOT NULL CHECK(type IN ('checking', 'savings')),
    interest_rate   REAL    NOT NULL DEFAULT 0,
    starting_amount REAL    NOT NULL DEFAULT 0,
    starting_date   TEXT    NOT NULL
);

CREATE TABLE IF NOT EXISTS transactions (
    transaction_id      INTEGER PRIMARY KEY AUTOINCREMENT,
    account_id          INTEGER NOT NULL REFERENCES accounts(account_id) ON DELETE CASCADE,
    "order"             INTEGER NOT NULL,
    name                TEXT    NOT NULL,
    amount              REAL    NOT NULL,
    debit               INTEGER NOT NULL CHECK(debit IN (0, 1)),
    date                TEXT    NOT NULL,
    series              TEXT,
    recurring_frequency TEXT    CHECK(recurring_frequency IN (
                            'daily', 'weekly', 'bi-weekly', 'monthly',
                            '1st-and-15th', 'quarterly'
                        )),
    total               REAL    NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_transactions_account_date ON transactions(account_id, date);
CREATE INDEX IF NOT EXISTS idx_transactions_series ON transactions(series) WHERE series IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires);
