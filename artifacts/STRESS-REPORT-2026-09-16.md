# Stress assessment — 16 September 2026

## Verdict

The current build and focused UI checks pass, but two real concurrency failures block a reliable launch: duplicate recovery refunds and welcome-reward IP-cap bypass. Adding more agents should follow these fixes, not precede them.

## Scope and evidence

All database probes used the dedicated TEST_DATABASE_URL and synthetic data. No real AI requests, email delivery, payments or production load were generated.

| Check | Result |
| --- | --- |
| TypeScript/Vite production build | Passed; large-bundle warning remains |
| Companion browser checks | 2 passed after updating a stale selector to match the current free-text widget |
| Focused backend suites: coordination, account/AI hardening, request concurrency | 15 passed in 605.6 seconds |
| Recovery refund race: two independent PostgreSQL pools | Failed 5/5 rounds: two refunds for one debit |
| Scheduler ownership race: two pools | Passed 5/5 rounds: one winner |
| Email message claim race: two pools | Passed 5/5 rounds: one mock delivery |
| Last available balance: 10 simultaneous agent requests, repeated 3 times | Passed: one 65-point charge, nine insufficient-balance responses, final balance zero |
| Shared retry key: 10 simultaneous agent requests, repeated 3 times | Passed: one charge/run, nine in-progress responses, final balance zero |
| Final IP reward slot: 3 simultaneous real OTP HTTP requests, repeated 3 times | Failed 2/3 rounds: total five grants where the configured cap was three |

The 60 direct-runtime spending requests took approximately 5.2–6.1 seconds for the slowest individual request in each round; round elapsed time, including final invariant queries, was 6.1–6.9 seconds. These measurements include the remote test database and simultaneous test activity. They are **not production HTTP throughput or an LLM latency benchmark**.

Separate backend suite results are recorded in `artifacts/stress-september16.log` (coordination, launch-hardening and concurrency suites). Full OS-process kill/restart, sustained high-volume soak, live provider delivery, payment settlement and backup restoration remain outside this run.

## P1: duplicate refunds — reproduced

Location: `src/app/agents.mjs`, `createAgentRuntime().reconcile()`.

Two recovery workers read the same stale run and both observe no refund. Each credits the wallet and inserts a refund row with a different random ID. Every tested round produced:

```
Original balance: 100
After one debit: 99
Expected recovery balance: 100
Actual recovery balance: 101
Refund rows: 2
```

The existing sequential reconciliation test passes because it runs recovery twice in order. That does not exercise competing transactions.

Fix: atomically claim the stale run or lock it before evaluating its state; make the refund business key unique; update the wallet and refund ledger together only for the transaction that inserts the refund. Coordinate the normal failure/refund path and crash-recovery path using the same ownership rule. Check existing duplicate ledger entries before applying a unique index; do not silently rewrite balances.

## P1: signup IP cap can be exceeded — reproduced

Location: `src/app/accounts.mjs`, `award()`.

Each test network already had two grants. Three different users/devices then verified simultaneously. In two rounds all three received 100 points, producing five grants against a cap of three. All HTTP responses were successful, so error monitoring alone would miss this.

Fix: serialize eligibility calculation and insertion on a stable hashed-IP lock, or reserve a slot atomically in a dedicated allowance table. Keep shared-network accounts usable with rewards held for review. Preserve email/device uniqueness separately; an IP limit is not proof of one person.

The reward is still 100 points, despite the earlier request for 50. Treat the intended reward amount as a product decision and align server constants, UI and tests.

## P1: conflicting milestone decisions are currently accepted — observed test behavior

Location: `src/app/projects.mjs`, `/api/verification-cases/:id/decisions`; `tests/stress-concurrency.test.mjs`.

The test titled “cannot both approve ... twice” actually expects approval and dispute requests to both return 201, records both decisions, and accepts whichever milestone state wins last. Thus its green result is not evidence of exclusive decision handling. An open dispute can coexist with an approved status depending on ordering.

Fix: define explicit transitions and require the reviewed version. One competing decision should win; a later change should require an explicit reopen/review action. Test milestone state, dispute state, ledger/payment consequences and conflict responses together.

## P1: shared AI quota uses different lock names — code review

Both `src/app/ai.mjs` and `src/app/aiPolicy.mjs` count rows in `ai_usage`, but one locks `ai_review_quota:...:<date>` and the other locks `ai_usage_quota:...:<epoch>`. These locks do not serialize the two entry points against each other. Both can see the final available slot.

Fix: one shared quota-reservation helper, one lock-key format and one UTC boundary calculation for every AI entry point. Add a test racing Deep Review against Companion for the last global/workspace slot. This cross-entry-point failure was identified in code, not reproduced by the current runtime probes.

## P2: completed work can be reported as failed — code review

The agent runtime commits its result and then writes the “responded” audit event outside that transaction. If that later audit write fails, the caller can receive an error even though work and charging already completed. The task coordinator marks most errors failed and increments the attempt key on the next approval, which can repeat completed work.

Fix: commit the completion audit atomically with the result, or handle audit-delivery failure independently. Represent uncertain completion separately from confirmed failure, and consult the original run/idempotency record before issuing a new attempt.

## What to add next, in priority order

1. **Ledger reconciliation and alerts:** flag duplicate refunds, unexpected negative balances, missing debit/refund pairs and balance/ledger mismatches. An alert should link to the exact run and ledger rows.
2. **Worker recovery dashboard:** show stuck runs, failed/expired mail, retry count, lease owner and last progress. Provide audited retry/review actions.
3. **Shared concurrency primitives:** refund-once, claim-once and quota reservation used by every relevant endpoint and worker.
4. **Database time limits and pressure controls:** explicit connection/query/lock timeouts, bounded queues and measured fleet-wide pool limits. The inspected pool configuration does not set those timeouts; database-side settings need separate verification.
5. **Performance tracing:** measure authentication, pool waiting, SQL duration, model duration and total request time separately. Reduce repeated database round trips before selecting a larger host.
6. **Paginated task/history APIs:** task listing currently loads all workspace tasks then filters ownership in application memory. Query owner/workspace directly and add an appropriate index and pagination.
7. **Durable task controls:** cancel, distinguish confirmed failure from uncertain completion, restore exact run state, and display costs/results from persisted evidence.
8. **Continuous stress gates:** run the new invariant probes against an isolated database in CI; test process death after debit, after provider response, during refund and during task result persistence.
9. **A tested PostgreSQL restore procedure:** demonstrate recovery to a separate database and verify users, goals, ledger and queued work before claiming disaster recovery.

## Test infrastructure findings and changes

- Browser port 3107 was already occupied. E2E_PORT now selects a separate test port and HMR port; the existing server was left alone.
- The visitor widget test still clicked removed topic buttons. It now submits a support question through the actual composer; both browser checks pass.
- Most existing fixture cleanup closes pools without dropping schemas. This remains a storage-growth issue even with a separate test database. The new diagnostic scripts now explicitly drop only their own disposable schema on normal completion.
- The three schemas retained by the first diagnostic runs were identified by their complete synthetic-user populations, reviewed by exact schema name, and removed successfully. Other schemas and the occupied browser server were left untouched.
- Several integration tests lack bounded waits, and some provider tests poll indefinitely for a mock callback. Add per-test timeouts and failure-aware waits.

## Reproduction

```
node scripts/stress-worker-races.mjs
node scripts/stress-spending.mjs
node scripts/stress-reward-claims.mjs
node --test --test-concurrency=1 tests/stress-concurrency.test.mjs tests/launch-hardening.test.mjs tests/companion-coordination.test.mjs
```

The diagnostic commands exit nonzero when a business invariant fails. Logs are `artifacts/stress-*-september16*.log`. Production business behavior was not modified in this stress-review turn; changes are diagnostic scripts and test configuration/selectors.
