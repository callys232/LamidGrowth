# Demo fixes and release readiness

## Working demo learning

Learning now supports path creation, author-owned module creation, enrollment, module completion, self-reported assessment scores, progress, feedback updates and sample certificates. State lives in the existing encrypted demo snapshot and resumes with the visitor's profile and tier. Existing snapshots initialize learning on first use without resetting other work.

The UI prevents duplicate enrollment, hides completed demo modules and already-issued sample certificate controls, and prevents enrollment in an empty demo path. Demo modules are added before enrollment so adding a module cannot silently invalidate a completed path. Invalid scores, invalid costs/hours, missing records, unauthorized module authorship and out-of-order operations are rejected. Feedback is updated rather than counted twice.

Demo certificates are explicitly samples. They do not create expert credentials, and demo enrollment never deducts real points. Live AI execution and external transactions remain outside the demo. All supported and preview capabilities are described in `src/shared/demoCapabilities.json`; both the API and frontend consume this policy. Engine access is derived from the actual plan seats on the server rather than a separate hardcoded engine count. Demo coverage figures now come from the current API, replacing the stale snapshot.

The public catalog route is matched before individual engine details, preventing `catalog` from being mistaken for an engine code. Billable-tool previews also derive their list from the current tier's API catalog. The sandbox no longer imports the old engine catalog snapshot.

The strict one-registration-per-IP rule remains. The registration page explains that it includes shared networks, and the existing personal link resumes the same demo. Production must configure the actual trusted proxy hop count; otherwise every visitor may appear to share the proxy address.

## Reference and browser checks

Every current engine now has at least one explicit reference case across `tests/tool-catalog.test.mjs` and `tests/engine-reference.test.mjs`. Cases check arithmetic, counting, graph relationships, thresholds or classifications as appropriate. The 1,943-case robustness audit remains separate. A reference case checks specific outputs; it does not prove every formula, establish scientific validity or replace human method review. Method-review and task-evaluation states remain unset.

`tests/demo-learning.test.mjs` executes the actual TypeScript learning handlers and router with in-memory serialized storage. It covers lifecycle persistence, duplicate protection, author restrictions, invalid assessment scores and demo isolation from real points and credentials. Browser checks exercise the actual shipped UI and sample handlers, with identity/progress/mail network boundaries substituted. Postgres integration tests use isolated schemas in a separate test database; loopback-only CI databases use local connections and remote test databases retain verified TLS.

`npm run release:check` requires a dedicated `TEST_DATABASE_URL` distinct from production and runs:

`npm run test:full` invokes this same gate. The former end-to-end and exploratory commands referenced missing Playwright configs; they now invoke the browser suites that exist in this repository.

1. Production TypeScript and Vite build.
2. Engine robustness audit and all Node test suites, including real database integration.
3. Registration/account handoff browser journey.
4. All 63 engine forms, learning lifecycle and 252 demo page checks.
5. Public page smoke checks and a mobile check that the decorative WebGL bundle is not downloaded.

The GitHub Actions `Release checks` workflow provisions an isolated Postgres service, installs Chromium, runs the gate and uploads JSON results. Configure the `Release checks / check` job as a required branch status in repository settings. That repository setting cannot be enforced by a workflow file alone. Vercel automatic deployment settings must also honor the chosen release workflow; adding this job does not itself block an independently configured Vercel deployment.

`deploy/deploy.sh` runs production configuration validation and the release gate before restarting the API. Supply a dedicated test database and install Chromium and its operating-system dependencies on that machine, or run the gate in CI and deploy the exact tested commit through your controlled deployment process. The old API remains running if pre-restart checks fail.

## Deployment verification

```sh
npm run deployment:check
npm run deployment:smoke
```

Configuration validation checks required secrets without printing them, HTTPS origins, frontend/demo allowlist consistency, secure cookies and proxy configuration syntax. The smoke script uses `PUBLIC_ORIGIN` for the API and `DEMO_PUBLIC_ORIGIN` or the first `FRONTEND_ORIGINS` entry for the frontend. Same-origin deployments fall back to `PUBLIC_ORIGIN`. Set `DEPLOY_API_ORIGIN` and `DEPLOY_FRONTEND_ORIGIN` to override these smoke targets.

Smoke checks cover API health/readiness, credentialed CORS, demo preflight, invalid-session rejection, cache protection, frontend deep links and the entry JavaScript asset. They create no registrations, accounts, emails or purchases. Request timeouts are bounded and diagnostics omit raw URLs, tokens, request bodies and network exception text.

Local production configuration validation passed. The attempted live `/api/health` check failed with `UND_ERR_CONNECT_TIMEOUT`. Live routing, database readiness and inbox delivery therefore remain unverified. These code changes have not been deployed. After deploying the tested commit, rerun the smoke checks and verify a welcome email and its return link in a real inbox. No real email was sent during this work.

## Diagnostics and performance

The Demo leads table now shows failure counts and failed queued deliveries. Per-lead activity includes failed operations, save failures, revision conflicts and browser failures. Events store categories and page paths, not calculator inputs, exception messages or personal access links. Server engine errors log engine code, tier, status and request ID through the existing structured logger. Registration rejections and mail-worker failures remain available through the existing request/error logs.

The generated public document registry now imports page compositions on demand. A generated metadata index supplies SEO, navigation and workspace headings without importing every page's body copy. The main entry bundle decreased from approximately 557 KB (136 KB gzip) to 147 KB (40 KB gzip) in the production build. These are bundle measurements, not measured improvements in user-perceived load time. The three.js bundle remains large but deferred; small screens and reduced-motion preferences use the existing CSS visual. Regenerating content preserves this loading strategy.

A production bundle regression check caps the main entry at 200 KB before compression and 60 KB gzip. It runs after the build in the release gate. These limits apply to the main entry, not the sum of vendor chunks, fonts, styles and route assets.

Removing the stale catalog snapshot also reduced the deferred demo session bundle from approximately 146 KB to 80 KB before compression.

## Completed verification

- Production build: passed, including the final catalog-route changes.
- Node tests: all 91 passed together with no skips, including delivery-event correlation, suppression, retry-window protection and retention safeguards.
- Calculator robustness: 1,943 checks passed across all 63 engines.
- Full demo browser audit: all 63 engine forms, 252 page checks and four action/lifecycle checks passed, with no uncaught JavaScript errors or unexpected API requests.
- Final focused browser audit after the catalog fix: all 44 page checks and all four action/lifecycle checks passed.
- Registration, cross-device save/retry and account-prefill browser journey: passed.
- Public browser audit: all 67 public routes passed with no caught/uncaught runtime errors or unexpected API requests; mobile did not request the decorative WebGL bundles.
- Production configuration and changed-file formatting checks: passed.
- Live API smoke check: connection timed out at `/api/health`; production readiness is not established.

The full `npm run release:check` passed on 17 October 2026 after the fixture corrections and email-reliability implementation. A read-only check against the configured database confirmed the new mail tables are not yet deployed. Follow [Manual deployment and Resend activation](mail-deployment-2026-10-17.md) to apply the schema through normal startup, configure the signed webhook, monitor the worker and verify a real inbox journey.

Results are recorded under ignored `test-results/`; tests and this document preserve the reproducible evidence. The original audit report describes the initial failures; the learning failures in that report are superseded by these fixes.
