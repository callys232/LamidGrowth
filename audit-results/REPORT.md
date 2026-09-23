# Full suite audit — 22 September 2026

The current suite is **not green**. The production build succeeds. The complete first run produced **243 passing and 38 failing tests out of 281**, across backend, standard browser, and exploratory browser suites. These are test results, not a code-coverage percentage. Most failures are stale fixtures or UI expectations; the accessibility failures expose actual product defects.

## Results

| Check | Passed | Failed | Notes |
| --- | ---: | ---: | --- |
| Production TypeScript/Vite build | Yes | — | Large bundle warnings; no compile errors |
| Backend: 50 files | 209 | 22 | 231 tests, no skips/cancellations; 192.7 seconds on local PostgreSQL |
| Standard browser: 19 files | 24 | 9 | 33 tests; 10.4 minutes |
| Regional usability | 9 | 1 | 10 simulated locale/viewport profiles |
| Paid specialist demonstrations | 0 | 3 | All blocked by an outdated AI-settings checkbox label |
| Deep marketplace studies | 0 | 2 | Same outdated AI-settings checkbox label |
| Human-paced first visit | 0 | 1 | Ambiguous Companion link selector |
| Public link/button sweep | 1 | 0 | 25 pages; generated summary has no broken links, failed buttons, or console errors |
| Worker race probes | 15 | 0 | Refunds, scheduler ownership, and mail claims |
| Welcome-reward race probes | 3 | 0 | Concurrent OTP verification/reward grants |
| Spending race probes | 0 | 6 | Every request gets 403 before any deduction; concurrency behavior remains untested by this probe |
| Repository formatting | — | Failed | 239 files reported before audit artifacts were added |

Race probes are counted separately from the 281 test cases. A passing mock-provider test does not demonstrate a live provider connection.

### Targeted reruns

Original totals above are retained rather than replacing failures with later passes.

- **All-context onboarding:** passed in isolation (39.2 seconds), after timing out at 120 seconds in the full run. Intermittent failure; root cause not established.
- **Sao Paulo regional onboarding:** passed on a fresh server (18.4 seconds), after the original run remained on `/start`. Intermittent failure; this is not evidence of a locale-specific defect.
- **Consulting project:** failed again. The first run exhausted its 30-second budget during action creation; the isolated run progressed farther and waited for the obsolete `Choose the next step` button.
- **Mobile onboarding/Companion:** failed again at the same obsolete button. Current UI says `Explore a pathway`.

## What works in the tested conditions

- **Goals and the connected flow:** preview without writing; save chosen pathway actions exactly once; reload and progress; confirmed goal deletion with linked actions; workspace isolation; versioned objective revisions. Both dedicated goal-pathway browser tests pass.
- **Human AI control:** persisted settings, feature and source-type restrictions, bounded points, opt-in/consent, rejection after rules change, cancellation, evidence validation, and shared quota enforcement pass their dedicated tests. The browser test confirms settings persist and blocked requests are rejected at the API.
- **Database failure handling:** all seven regression cases pass, including rollback cleanup, broken-client disposal, bounded connection acquisition retries, startup pool cleanup, healthy connection reuse, and no replay of an uncertain commit. The API outage test returns 503 while liveness remains healthy. These use injected failures; they are not a live network-partition test.
- **Accounts and authorization:** dedicated authentication/session, verification, password recovery, cross-origin protection, workspace separation, account-deletion authority, and member-disable tests pass.
- **Commercial operations with fixtures:** dedicated mocked payment/webhook, escrow/refund, billing-assignment, points purchase, entitlement, document export/signing, and project tests pass, except the individual failures listed below. The full acceptance journeys do not complete.
- **Engines:** catalog access/filtering, financial arithmetic, and invalid-assessment validation pass. This verifies the tested financial calculations, not every possible FinancialForm input.
- **Workflow execution:** approvals, blocked unauthorized writes, reminders, workspace switching, pause/resume, and recovery after reopening the database pass their dedicated tests.
- **Frontend:** standard account recovery, restricted administrator controls, commercial knowledge editing, Companion task persistence, learning, core connected journey, homepage interactions, reduced motion, theme preference persistence, and route/copy checks pass.
- **Concurrency:** stale-run refunds happen once; scheduler/mail claims have one winner; welcome-reward grants remain bounded in the executed probes.

The complete per-test pass/fail inventory is in [test-inventory.md](test-inventory.md). Exact backend assertion details are in [backend-failures.json](backend-failures.json).

## Backend failures and what they mean

| File / failed cases | Observed failure | Diagnosis / necessary follow-up |
| --- | --- | --- |
| `activity.test.mjs` — 1 | Companion returns 403 instead of 201 | Demo fixture does not provide the required specialist entitlement. The feed assertions are never reached. Use an explicitly authorized fixture or a free event producer. |
| `billing.test.mjs` — 1 | Expected 65 points spent, got 0 | Companion request has no configured AI provider; test ignores its response and then checks billing. Assert successful setup and supply a mock provider with explicit permissions. |
| `enterprise.test.mjs` — 1 | Expected 403, got 409 | Test claims to use an individual workspace, but the shared funded helper promotes all workspaces to Enterprise. Make tier an explicit fixture parameter; preserve the negative permission test. |
| `expertNetworkExtensions.test.mjs` — 1 | Companion returns 503 instead of 201 | No configured AI provider. Automatic handoff assertions are not reached. Supply an appropriate mock and authorized fixture. |
| `launch-hardening.test.mjs` — 2 | 403 before mock provider starts | Opt-in/consent/idempotency and in-flight revocation scenarios lack the specialist entitlement needed to reach their mock. Do not remove the real permission gate. |
| `models.test.mjs` — 3 | Registry list mismatch; 403 instead of 201/503 | Expected registry omits `experiment-builder` and `opportunity-signals`. Two execution cases are blocked by entitlement before registry behavior can be asserted. |
| `ratelimit.test.mjs` — 1 | Expected 201, got 503 | Missing provider prevents the spend-limit scenario from reaching its intended successful request. |
| `security-points.test.mjs` — 1 | Expected cached 201, got 503 | Missing provider prevents a successful result from being cached; this test does not currently prove paid-request replay. |
| `stress-concurrency.test.mjs` — 1 | Not all ten requests return 201 | Missing provider blocks the Companion requests. Dedicated successful debit/refund tests pass, but this burst test does not reach deductions. |
| `system-sweep.test.mjs` — 3 | Proposal calls return 503; routing returns 422/503; adversarial message gets 503 | Provider fixtures are missing; document requests also omit required job/proposal context. The sweep labels an intentional provider-unavailable response a “crash.” Distinguish routing from valid execution and distinguish service unavailability from an unhandled exception. |
| `task-recovery.test.mjs` — 1 | Expected one charge, got zero | It now creates the default **free starter** task. Earlier assertions verify recovered completion and a single execution; the later ledger expectation is stale. Keep a free no-charge case and add a separately authorized paid recovery case. |
| `user-acceptance.test.mjs` — 6 | Five industry journeys stop at Companion 503; aggregate summary fails | Manufacturing, wedding planning, software, marketing, and legal scenarios have no provider fixture. The sixth failure is the dependent summary, not a sixth independent product defect. Later journey stages remain unverified by these scenarios. |

These diagnoses explain the observed first failure. Correcting fixtures may reveal additional failures farther into a journey; this audit does not assume those unexecuted stages work.

## Browser failures and product defects

| Area | Finding | Next action |
| --- | --- | --- |
| Public-page accessibility | Axe reports insufficient contrast on `.tag` and `.judgment-panel > p` in the keyboard/accessibility journey. | Fix the actual foreground/background combinations and rerun accessibility checks. |
| Pricing, light theme | Text contrast includes 2.02:1, 3.33:1, and 3.01:1 where the executed check requires 4.5:1. | Correct muted text/status colors, including table content. |
| Pricing, dark theme | Red text `#c12129` against `#1a2029` measures 2.74:1 where 4.5:1 is required. | Use a readable dark-theme status color. |
| Expert page | Test assumes `.experts-group-header`; current page still contains group text but uses a different structure. | Assert the intended accessible page structure rather than an obsolete CSS class; confirm semantic headings separately. |
| Expert navigation | Tests require every link to equal `/experts`; current links include section anchors. | Assert the intended anchor targets and that each target exists. |
| Product preview | Mobile test expects a button named `Explore the workspace`; the current preview is a region with that accessible label. | Test the current interactive controls and destination, rather than the removed button. |
| Consulting and mobile Companion | Both expect the old single-action flow and `Choose the next step`. | Update to the pathway preview/edit/select/save flow already exercised by `goal-pathway.spec.ts`. |
| Broad onboarding | All-context and Sao Paulo failures disappear on fresh reruns. | Inspect retained traces; isolate profiles and wait on explicit page/response state. Do not just raise every timeout. |
| Paid/deep exploratory studies | Five tests search for `Allow members to request external AI reviews`; UI now uses `Allow external AI in this workspace`. | Update shared AI-settings helper, then rerun the paid journey. These tests currently prove nothing about later marketplace stages. |
| Human-paced study | `getByRole('link', { name: 'Companion' })` resolves to both sidebar and content links. | Scope to `Workspace navigation` and the intended link. |

Failure screenshots, DOM snapshots, and traces are retained in the corresponding `*-artifacts` folders. For example, open a trace with `npx playwright show-trace <path-to-trace.zip>`.

## What should improve first

1. **Repair coverage of money and authority.** Explicitly provision tier/bundle, verified account, policy, consent, balance, and mock provider for the scenario under test. Keep negative entitlement tests separate. Restore spending-race, paid retry, and paid recovery coverage before trusting a release.
2. **Fix real contrast defects.** Keep the accessibility checks enabled; do not suppress the violations to obtain a green run.
3. **Update old journeys to the current product.** Consolidate shared signup, AI-settings, and pathway helpers. Scope selectors by accessible role and region. Assert setup responses before making downstream claims.
4. **Make the complete check discoverable.** `npm test` only runs backend files. `npm run check` only builds and runs backend tests. Default Playwright excludes five exploratory files, which have separate configs. CI runs backend, three stress scripts, and standard browser tests; it does not run those exploratory configs or formatting. Add an explicit documented full-audit command and separate fast checks from longer studies.
5. **Use an isolated local database for repeatable development tests.** `:memory:` is actually PostgreSQL schema isolation. The partial remote run took 40–90 seconds for individual tests; the full local backend run took about 193 seconds. Local PostgreSQL matches CI and avoids confusing remote latency with application behavior.
6. **Strengthen cleanup and environment isolation.** Many fixtures call `store.db.close()` without awaiting it and leave schemas behind; the browser server also closes its pool rather than dropping its disposable schema. Prefer awaited teardown and unique per-run schemas. The paid study has a `TEST_DATABASE_URL || DATABASE_URL` fallback; remove that fallback. Its fixed `paid_demo` schema also prevents safe concurrent runs. This audit used local TEST_DATABASE_URL throughout the complete runs.
7. **Improve failure signals.** The public click sweep only asserts that at least one page was visited; it can pass even if its generated report lists broken links/buttons. Assert the report's error collections are empty. Preserve structured JSON/JUnit reports and upload backend/stress logs as well as browser artifacts in CI.
8. **Extend the database reliability tests to deployment boundaries.** Existing cleanup tests inject errors. Add real connection termination/recovery and saturated-pool probes, and an actual multi-process worker-budget test. Current stress probes use two pools in one process; they do not prove OS-worker crash recovery or a fleet-wide connection budget.
9. **Reduce frontend delivery size.** The build emits roughly 921 kB main JS (249 kB gzip), 512 kB Three.js scene JS (129 kB gzip), and 243 kB CSS (41 kB gzip). Review route splitting and when the scene loads; measure real browser performance before attributing timeout failures to bundle size.
10. **Establish a formatting baseline.** 239 files fail the existing formatting check. Handle formatting separately from behavioral fixes to keep reviewable diffs.

## Method and limits

- Windows; Node 22.17.1; installed Playwright 1.63.0; PostgreSQL 16 in a disposable Docker container on loopback port 55432. CI also uses PostgreSQL 16, but runs on Linux.
- Started with the configured remote test database, preserved that partial log, stopped the audit test process, and restarted the complete suite locally. The partial run is not included in totals.
- The audit-only [environment.cjs](environment.cjs) preloads local test-database configuration and blanks live AI/payment/email credentials. Explicit mocks supplied by tests still operate. Application source and existing tests were not changed during this audit.
- Backend ran with its configured concurrency of 3. Standard browser tests and the exploratory sequence overlapped on separate local test servers/schemas; the local database supports substantially more connections than the remote test budget. The three timeout cases and the regional failure were then rerun on fresh servers. Thus the first browser run is useful evidence of flakiness under load, not an isolated browser performance benchmark.
- All 24 browser spec files were attempted through their respective configs. These are Chromium runs; no cross-browser/device-network matrix was executed. Regional profiles simulate locale, viewport, and timezone, not real geographic network conditions.
- No live payment, external AI response quality, email deliverability, production deployment, or real production-database outage was verified. No line/branch coverage instrumentation was run.
- The disposable local database container and its volume were removed after testing. Test-generated tracked artifacts are archived under `generated/` and restored to their pre-audit repository versions; current audit traces/results remain here.

## Reproduction

```powershell
docker run --detach --name lamid-suite-audit-20260922 --publish 127.0.0.1:55432:5432 --env POSTGRES_USER=lamid_test --env POSTGRES_PASSWORD=local_audit_only --env POSTGRES_DB=lamid_test postgres:16
docker exec lamid-suite-audit-20260922 pg_isready -U lamid_test -d lamid_test
$env:NODE_OPTIONS='--require=./audit-results/environment.cjs'
npm run build
npm test
npx playwright test --output=audit-results/browser-artifacts
node scripts/stress-worker-races.mjs
node scripts/stress-reward-claims.mjs
node scripts/stress-spending.mjs
# Run the exploratory configs sequentially because paid studies share a schema.
npx playwright test --config=usability.config.ts
npx playwright test --config=paid-path.config.ts
npx playwright test --config=deep-coverage.config.ts
npx playwright test --config=human-pace.config.ts
npx playwright test --config=click-everything.config.ts
npm run format:check
docker stop lamid-suite-audit-20260922
docker rm -v lamid-suite-audit-20260922
```

Wait until `pg_isready` reports accepting connections before starting tests. The password above is solely for the disposable loopback-only test container. Exploratory studies write fixed paths under `artifacts/`; archive or isolate those outputs when rerunning.
