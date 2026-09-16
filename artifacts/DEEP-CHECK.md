# Deep check — 15 September 2026

## Verdict

Do not launch this revision yet. The build succeeds, but the configured PostgreSQL database rejects schema creation with SQLSTATE `53100` (`No space left on device`). The integration run was stopped; browser journeys and repeated live worker/restart tests remain blocked. This is not a passing full-system test report.

## Checks completed

| Check | Result |
| --- | --- |
| TypeScript + Vite production build | Passed; large-chunk warning remains |
| Backend regression suite | Started, then stopped after database disk-exhaustion failures; no valid overall pass count |
| Read-only database checks, three repetitions | All succeeded: 1,096,813,715 database bytes, 395 disposable `test_<12 hex>` schemas, 30 legacy path-shaped schemas |
| Scheduler claim interleaving, three simulated workers, ten repetitions | All ten permitted three owners instead of one |
| Mail claim interleaving, three simulated workers, ten repetitions | All ten invoked the mock sender three times for one message |
| Git whitespace check | Passed; line-ending warnings only |

Concurrency probes run the actual lease/mail functions against a small asynchronous in-memory store. They demonstrate the unprotected read/update interleaving, but are **not** actual PostgreSQL multi-process or crash tests. They send no email. Database capacity checks are read-only. No existing schemas or user data were deleted.

## Release blockers and findings

### P0 — database writes currently fail (observed)

`artifacts/deep-backend-1.log` records schema creation failing at `server/store.mjs:769`. Any feature needing database writes is at risk while this condition persists. Read-only checks can still pass, so a simple health/read probe is insufficient to establish readiness.

Test cleanup is a likely contributor: most fixtures call `store.db.close()`, which only ends the pool, whereas schema removal requires `dropSchema()`. Hundreds of disposable schemas remain. The three capacity samples do not establish which schemas consume the most space or the provider's quota. Do not blindly delete matching schemas: establish ownership and active-test status first.

### P1 — scheduler election is not exclusive (reproduced interleaving)

`src/app/operations.mjs:1` reads the lease then unconditionally upserts its owner. Concurrent transactions can all read an absent/expired lease and all return true. Use a conditional atomic claim returning the winning row. `server/index.mjs` also allows its async interval to overlap; a slow tick can overlap its successor even with the same owner.

`src/app/workflows.mjs:297` reads and executes a running workflow without a row lock; its persistence update is not a conditional version claim. Overlapping ticks can repeat a tool action. Validate with separate processes, expired leases, slow steps, and forced worker death after claim and after execution.

### P1 — duplicate mail claims (reproduced interleaving)

`src/app/mail.mjs` selects the next message without a row lock, then updates it unconditionally. Multiple workers can send the same message. Use an atomic claim or a locked selection with skipped locked rows, and a claim token for completion/failure updates. The SendGrid adapter supplies a custom argument, not an application-side deduplication guarantee. Provider idempotency does not correct the queue's ownership or retry-count races.

### P1 — OTP/recovery consumption is not atomic (code review)

`src/app/accounts.mjs:91` reads a usable token and then updates it without an unused-token predicate or lock. Concurrent password resets can both pass the read and both replace the password. The OTP path at line 135 similarly reads attempts/used state before an unconditional update; concurrent guesses can pass the attempt-limit snapshot and simultaneous correct submissions can both be accepted. Lock/atomically consume tokens, serialize issuance and consumption per account, and test resend racing verification as well as duplicate verification.

### P1 — refunds and AI budgets have concurrent read/write gaps (code review)

`src/app/agents.mjs:694` reads stale runs and checks for a previous refund before inserting a new refund with a random ID. Two reconcilers can both decide to refund. A unique business key and atomic run-state claim are needed; scheduler election alone is insufficient during failover.

`src/app/aiPolicy.mjs:15` counts usage before inserting its reservation. Parallel transactions can each see capacity and exceed the workspace/global budget. Test the final remaining slot through both AI entry points at once.

### P1 — duplicate Companion requests can produce 500 (code review)

`src/app/agents.mjs:575` checks then inserts an idempotency key. The unique key protects against two committed reservations, but a simultaneous loser can receive an unhandled PostgreSQL unique violation rather than the intended in-progress/replay response. This finding does not imply two provider calls for the same key; the reservation occurs before provider execution.

### P1 — tests are not ready for repeated PostgreSQL runs (observed/code review)

- `tests/launch-hardening.test.mjs` compares async `acquireServiceLease(...)` results directly to booleans without `await`; this test will fail even if lease behavior is correct.
- `tests/ratelimit.test.mjs` closes HTTP servers without closing their database pools. Two older test runs were still alive in this test when process inspection ran. They were not stopped because ownership was not established.
- Several teardown hooks assume setup succeeded and throw secondary errors after database initialization fails, obscuring the original failure.
- Most fixtures leave schemas behind; initialization failure also leaves the newly created schema.
- `tests/support/funded-app.mjs` gives domain fixtures 100,000 points and swallows funding errors. These tests cannot establish new-user affordability or reliably expose fixture failures.
- `scripts/e2e-server.mjs` raises the shared-IP reward limit to 10,000. Browser passes therefore do not validate the production abuse threshold.

### P2 — configuration and product gaps (code review)

- Signup currently grants **100** points, whereas the earlier request specified **50**. Tests also expect 100; a passing test would not catch this requirement mismatch.
- Device protection is a signed browser cookie plus hashed IP/email identity, not a persistent machine signature. Clearing browser state and changing network can evade it; shared-network false positives need review handling.
- `server/store.mjs` explicitly disables PostgreSQL certificate verification. Configure a trusted certificate chain before production.
- Every test imports the store that loads `.env` and uses its `DATABASE_URL`. Require a dedicated test database configuration and production-target guard before further load testing.
- Schema initialization is not protected by a migration lock. Simultaneous first-time workers can race table/seed creation.
- PostgreSQL migration removed the old backup scripts/tests. A verified PostgreSQL backup and restore drill is still needed; absence of repository scripts alone does not prove the hosting provider lacks backups.

## Next execution gate

First provide database capacity and an isolated test target. Then fix schema lifecycle and async test failures before repeating the suite. Run at least three full backend/browser passes, plus separate-process concurrency tests against one shared disposable schema. Cover signup/OTP/resend/reset, reward claims on identical devices and IPs, low-balance goal/Companion flows, AI quota boundaries, duplicate requests, workflow approval races, and forced worker termination with ledger reconciliation. Include a backup restoration drill and real transactional email delivery in staging.

The live multi-instance and browser checks cannot be honestly marked complete until this gate is cleared.

## Reproduction artifacts

- `artifacts/deep-build.log`
- `artifacts/deep-backend-1.log`
- `artifacts/deep-db-readonly.log` — produced by `node scripts/deep-db-readonly.mjs`
- `artifacts/deep-concurrency-probes.json` — produced by `node scripts/deep-concurrency-probes.mjs` (exits 1 when invariants fail)

Application code was not changed during this check. Two diagnostic scripts and this report were added.
