# Database migrations

`openStore()` applies ordered PostgreSQL migrations while holding a schema-scoped advisory lock
and a database transaction. The `migrations` table records each completed version. If a migration
fails, the transaction rolls back and startup fails; a database with a version newer than the
application supports is rejected explicitly.

Versions 1–3 establish the initial schema and record the additive changes previously applied on
every startup. Existing databases that recorded version 1 are upgraded by versions 2 and 3;
fresh databases run all three in order. The tool-catalog and seat-bundle reconciliation remains a
startup task because it reflects the current application catalog and pricing configuration, not
a one-time schema change.

## Adding a migration

1. Append a migration with a new, higher integer version in the `applyMigrations()` call in
   `server/store.mjs`. Never edit an already-released migration: deployed databases record its
   version and will not run its changed contents.
2. Keep the migration safe for the production data it will encounter. Make data transformations
   explicit, preserve existing records, and use database constraints where they express durable
   invariants.
3. Keep schema changes and their version record in the same transaction. Do not add
   application schema changes or data backfills as unversioned startup work. The schema and
   migration-ledger bootstrap are the only intentional exceptions.
4. Add coverage for a fresh schema, an upgrade from the previous version, and a second startup
   that confirms already-applied migrations do not run again.
5. Run tests only with a dedicated `TEST_DATABASE_URL`, never the production `DATABASE_URL`.

PostgreSQL DDL in these migrations is transactional. If a future change needs an operation that
cannot run in a transaction, design and document its recovery behavior separately rather than
silently weakening migration atomicity.

## Choosing storage for new data

The `records` table is for bounded, workspace-owned domain objects whose attributes evolve with
the application, such as objectives, actions, and reviews. Reads and writes must always include
the authenticated `workspace_id`; validate these payloads at the API boundary and retain the
existing version checks where records are edited.

Use relational tables when data participates in durable cross-record invariants, joins, uniqueness,
accounting, authorization, or operational queries. The identity, membership, session, job, bid,
proposal, payment, and ledger data already follow this model. Do not move an entire domain out of
`records` just for consistency: first show that a specific access pattern or invariant needs a
database constraint, then add a versioned migration, preserve old data, and test both upgrade and
rollback-safe failure behavior.
