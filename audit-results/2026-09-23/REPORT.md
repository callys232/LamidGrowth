# Repeat full-suite audit — 23 September 2026

All configured checks and all five exploratory browser suites completed. The full test run produced **274 passes and 7 failures out of 281 tests**, compared with **243 passes and 38 failures** in the previous audit. The additional concurrency probes produced 18 passes and 6 failures. The suite is improved but not fully green.

| Check | Previous pass / fail | Repeat pass / fail |
| --- | --- | --- |
| Backend, 50 files | 209 / 22 | **231 / 0** |
| Standard browser, 19 files | 24 / 9 | **32 / 1** |
| Regional usability | 9 / 1 | **10 / 0** |
| Paid specialist studies | 0 / 3 | **0 / 3** |
| Deep marketplace studies | 0 / 2 | **0 / 2** |
| Human-paced first visit | 0 / 1 | **0 / 1** |
| Public link/button sweep | 1 / 0 | **1 / 0** |
| Worker race probes | 15 / 0 | **15 / 0** |
| Welcome-reward race probes | 3 / 0 | **3 / 0** |
| Spending race probes | 0 / 6 | **0 / 6** |

The production build passes. Formatting fails: **239 files outside `audit-results/`**, plus **79 audit-generated files**, were reported (318 total). The outside-audit count is unchanged from the previous audit; generated evidence accounts for the increased total.

## Improvements verified

- All 22 previous backend failures are resolved in this run. No backend tests were skipped or cancelled. Runtime: 152.3 seconds.
- All nine previously failing standard browser cases now pass, including consulting, all-context onboarding, mobile Companion, expert page/navigation, product preview, keyboard accessibility, and both light/dark readability checks.
- The dedicated connected goal-pathway and human AI-rule tests pass again.
- All ten regional simulations pass, including Sao Paulo.
- The public sweep covers 25 pages and reports no broken links, failed buttons, or pages with console errors. Its weak final assertion remains a test-design limitation described in the previous report.
- Database cleanup/error-handling regressions remain green. Worker claims, stale refunds, mail claims, and welcome-reward race probes remain green.

## Remaining failures

### 1. Intermittent workspace loading — one standard browser case

`tests/browser/journey.spec.ts:4` failed in the full run while waiting five seconds for the workspace heading after signup. The snapshot showed `Bringing your context together…`; no heading had appeared yet.

**Targeted rerun: passed**, with the test taking 12.4 seconds on a fresh server (16.7 seconds including setup). The original failure remains in the totals above. This is intermittent; the root cause is not established. Investigate the workspace-state request and accumulated suite state rather than simply increasing every timeout.

Evidence: [original browser log](browser.log), [rerun log](journey-recheck.log), and the original `browser-artifacts/journey-public-experience--c2cb5-a-connected-operating-cycle/trace.zip`.

### 2. Paid specialist studies — three cases

Lagos, Berlin, and Mumbai now get past the repaired AI-settings selectors and preview a specialist plan. They fail waiting for the first completed step. The captured Lagos UI shows a 1,500-point balance and a failed Context Curator step with the message that the specialist is not included in the account's plan.

The fixture tops up points but does not provision the required specialist entitlement. Points and plan/bundle access are separate requirements. Supply an explicitly eligible test account or exercise a supported purchase fixture before asserting successful execution; preserve the real permission gate.

There is also a UX improvement to consider: the preview/approval flow allows these accounts to reach an approval that subsequently fails entitlement checks. Show eligibility requirements before approval while retaining backend enforcement.

Evidence: [paid-path log](paid-path.log), `paid-path-artifacts/`, and `generated/paid-path-demo/`.

### 3. Deep marketplace studies — two cases

Amara and Zainab complete signup/verification, goal creation, action creation, knowledge, reflection, a free starter worksheet, and AI-policy enablement. They stop at a paid direct Companion chat: the endpoint returns 403 and the balance remains 500, while the test polls for a deduction for 60 seconds.

These fixtures still need eligible specialist access. Assert the request result before polling for a charge. Later marketplace stages were not reached and are not validated by these two studies.

Evidence: [deep-study log](deep-coverage.log), `deep-coverage-artifacts/`, and `generated/deep-coverage/`.

### 4. Human-paced first visit — one case

The repaired selector successfully opens Companion through the sidebar, which leads to guided planning at `/os/companion`. The test then looks for `Coordinate a task across specialists`, a control on `/os/companion/chat`, and times out scrolling to it.

Update the journey to navigate to the chat surface through the intended UI before interacting with coordinated tasks, or test the guided pathway flow on the page it actually opened. Signup, verification, and the first goal completed before this failure.

Evidence: [human-paced log](human-pace.log), `human-pace-artifacts/`, and `generated/human-pace/`.

### 5. Standalone spending probe — six rounds, counted separately

`scripts/stress-spending.mjs` remains unchanged: it creates a workspace without specialist entitlement and expects successful paid Context Curator work. Every request receives 403, with zero charges. The six failed rounds therefore do not reach the concurrent-spending behavior they intend to test.

Provision the necessary entitlement, verified account/policy/consent where required, and an explicit mock provider. Rerun both last-balance and same-idempotency-key scenarios. This remains a coverage gap despite the green backend suite.

Evidence: [spending probe log](stress-spending.log).

## Warnings and limits

- The build retains its large JavaScript chunk warning.
- The browser server emits a node-postgres deprecation warning for `client.query()` while that client is already executing a query. Tests continue, but review concurrent query use on shared transaction clients before a driver upgrade.
- The corrected task-recovery test verifies a free starter task and expects zero charges; paid recovery remains a separate coverage need.
- Provider calls are mocked. No live AI quality, payments, email delivery, production outage, or distributed deployment behavior was verified.
- This audit reran the existing tests; it did not modify application code or test assertions.

## Method and evidence

- Used a fresh local PostgreSQL 16 container on loopback port 55433, with test-only schemas and live AI/payment/email credentials disabled by [environment.cjs](environment.cjs).
- Build, backend, three stress probes, standard browser, five exploratory configs, and formatting ran sequentially. This differs from the previous audit's overlap of browser suites, so runtime and flakiness comparisons are not controlled performance measurements.
- Complete phase runtimes and exit codes: [status.json](status.json).
- Every test case: [test-inventory.md](test-inventory.md). Machine-readable test counts: [results.json](results.json).
- The previous report and its evidence remain unchanged in the parent audit directory.
- Existing files under `artifacts/`, including the pre-existing untracked homepage screenshot, were preserved. Changed/new captures from this run were archived under `generated/`; `before-artifacts/` holds the starting snapshot.
- Removal of the disposable `lamid-suite-audit-20260923` container and its volume was requested after all tests completed. Docker has not returned from the cleanup/status commands, so removal is **not yet confirmed**. This does not affect the completed test results. If needed, check Docker status and remove only that named audit container with `docker rm -f -v lamid-suite-audit-20260923`.

Recommended next work: fix eligibility setup in the spending and paid-browser fixtures, correct the human-paced navigation, and investigate the intermittent workspace-loading delay. Keep the now-passing contrast and authority checks enabled.
