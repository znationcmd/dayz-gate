# DayZ Gate database

Railway uses PostgreSQL when `DATABASE_URL` is present. Set this variable on the `dayz-gate` service to `${{Postgres.DATABASE_URL}}`. Startup initializes the schema before connecting Discord or accepting dashboard requests. An unavailable PostgreSQL database fails startup rather than silently writing into temporary SQLite storage. `/health` checks the database and reports `database: "postgres"`.

Whitelist requests, founder accounts and invitations, dashboard sessions, guild settings and encrypted Nitrado connections all use this database. The existing local SQLite backend remains available when `DATABASE_URL` is absent.

On the first PostgreSQL startup, an existing SQLite database at `DB_PATH` (default `../data/dayzgate.db`) is imported in a transaction. Its file is kept, conflicting target records are kept, IDs are preserved, and account/request sequences are advanced. A migration marker prevents importing it twice. This can only import a SQLite file actually present in the new container: it cannot recover files already lost from an older Railway deployment without a persistent volume. Existing PostgreSQL records are never cleared during startup.

Run `npm ci` and `npm test` with Node 22.13 or newer. Tests execute PostgreSQL SQL and transactions with PGlite, replace the network transport, and use Node's SQLite engine for migration fixtures. Discord and Nitrado services are simulated; no real messages or game-server changes are sent by tests.
