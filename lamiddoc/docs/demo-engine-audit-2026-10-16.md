# Demo and engine audit — 16 October 2026

**Follow-up:** the learning failures described below have since been fixed. See [release readiness](release-readiness.md) for the implementation, expanded engine reference checks, release gate and current deployment limits. The remainder preserves the initial audit findings.

The 63 current engines ran successfully with their supplied examples, and all 63 browser forms produced results. The demo still has unsupported learning actions. Passing page loads does not mean every button on those pages works.

## Failures found

| Area                        | Reproduction                                                             | Result and disposition                                                                                                                                                                               |
| --------------------------- | ------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F01 Financial Health Ratios | Send a string/object instead of financial periods, or a null period row. | Previously threw an internal TypeError (500). Fixed: malformed periods and invalid amounts return a useful validation error (400). Added regression tests.                                           |
| Demo action creation        | Open Consistency, click Add action, fill the title, submit.              | Previously rejected the form because it omitted status. Fixed: the sandbox defaults status to Planned, matching the live API. Browser retest confirmed the dialog closes and the new action appears. |
| Companion AI chat           | Open `/os/companion/chat` in a demo.                                     | Previously displayed “Not available in the demo.” Replaced with an explicit limitation and links to engines and signup. Live AI chat and background AI tasks remain unavailable in the demo.         |
| Learning enrollment         | Open Learning and click Enroll.                                          | **Still fails:** sandbox has no enrollment write handler; returns “Not available in the demo.”                                                                                                       |
| Learning path creation      | Enter a path title on Learning and click Create path.                    | **Still fails:** sandbox has no path creation handler; returns “Not available in the demo.”                                                                                                          |
| Demo test command           | Run the former `npm run test:demo`.                                      | Referenced a missing Playwright config. Updated to invoke the existing demo browser test. Added explicit audit commands.                                                                             |

Learning currently contains sample paths and enrollment data. Module completion, feedback and certificates are also not implemented in the sandbox. These findings come from route inspection; only enrollment and path creation were reproduced through browser clicks. The demo cannot yet be described as supporting every action shown in the workspace.

## Coverage and evidence

- **63 engines:** supplied examples execute, results contain finite numbers, input is not mutated, summary figures repeat consistently.
- **1,943 calculator checks:** required fields, types, numeric boundaries, NaN/Infinity, large values, invalid dates/enums, table sizes, malformed rows, questionnaire levels/evidence and unusual text. Expected validation rejections count as successful checks; this count is not 1,943 valid business scenarios.
- **12 independent numerical checks:** anchored evidence scoring, downward OKRs, delivery flow, XmR limits, collaboration brokers, RACI accountability, WSJF/waiting costs, Brier scores, eNPS, change readiness, 13-week cash and DCF valuation. Other engines have example and robustness coverage, not independent mathematical certification.
- **Tier enforcement:** Individual exposes 40 engines and locks 23; Team and Enterprise expose all 63. API tests check verified access, locked-engine rejection and zero point charges.
- **248 registered codes:** 207 resolve and have manifests; 41 are explicitly retired. Retired aliases are not counted as broken current engines.
- **63 browser engine submissions:** shipped production frontend forms, real manifests and real calculator implementations. All passed.
- **252 page visits:** 249 desktop visits covering nine profiles and three tiers, plus three mobile engine catalogs. Initial sweep passed 251; Companion chat was the sole failing page. The subsequent focused sweep passed all 44 checks: all 41 Founder/Team routes plus three mobile catalogs. Neither sweep recorded an uncaught browser JavaScript error.
- **Visitor browser journey:** gated name/email registration, confirmation, cross-device progress restoration, save retries/conflicts and account signup prefilling pass.
- **Postgres integration:** all three tests passed, with no skips. They exercise email templates, registration, verification, mail retry/consent, progress conflicts/isolation, administrator access/deletion, one-IP claims including concurrent registration, unsubscribe, and account conversion/reminder cancellation.

The browser harness substitutes identity, progress and mail network boundaries. It runs actual frontend sandbox handlers and actual engines. The separate integration tests use real Postgres adapters in isolated schemas of the dedicated test database. Mail is captured by tests; this audit sends no real welcome email. Neither approach proves production routing, inbox placement or deployed VPS/Vercel configuration.

## Reproduce

```sh
npm run test:audit-engines
npm run test:demo-tools
node tests/demo-ip.test.mjs
npm run test:demo-browser
npm run test:audit-demo
node tests/deep-demo-browser.mjs --focused
npm run test:demo-access
```

The deep browser audit intentionally exits with a failure while the two learning actions remain unsupported. Do not suppress those checks to obtain a green result. Database tests require a dedicated `TEST_DATABASE_URL`; they must never target production.

Local JSON artifacts are written to `test-results/deep-engine-audit.json`, `test-results/deep-demo-browser.json`, `test-results/deep-demo-browser-before-fixes.json` and `test-results/deep-demo-browser-focused.json`. Artifacts are ignored by Git. Source tests preserve the reproducible checks.

## Limits

This is a local audit, not a deployment or a production acceptance test. Live email delivery, payments, third-party connectors, AI model execution, every possible workspace mutation, exhaustive security testing and load testing are outside the completed coverage. No independent methodological review or human task evaluation of all 63 engines has been completed. Large frontend bundle warnings remain in the production build.
