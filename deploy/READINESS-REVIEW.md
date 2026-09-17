# Deployment readiness review — 17 September 2026

## Scope

Read-only review of deployment scripts, server startup/shutdown, browser API access, account configuration, payment adapters, CI and local configuration presence. Secret values were not logged. No live payment, email, database stress or VPS changes were performed. This is not a fresh full test run or confirmation of the hosted environment.

## P0 — credential rotation

Live email/payment secrets and database credentials were included in the conversation. Rotate them in their provider consoles, update the deployments securely and review provider activity. The local `.env` is ignored by Git and is not tracked in the current index; that does not reverse exposure outside Git or establish anything about older history.

## P1 — production configuration is incomplete locally

The local `.env` has no values for ACCOUNT_SECURITY_KEY, PUBLIC_ORIGIN, FRONTEND_ORIGINS, TRUST_PROXY_HOPS, OPENAI_API_KEY, OPENAI_MODEL, ECOSYSTEM_ADMIN_EMAILS, PG_POOL_MAX, WEB_CONCURRENCY or VITE_API_BASE_URL. These may exist in hosting environments, which were not inspected.

- `validateProductionConfig` rejects production startup without the account security key and HTTPS public origin.
- The documented split deployment needs a frontend origin allowlist and a frontend API base URL at build time.
- Without the nginx proxy trust setting, IP limits can see the proxy address and group unrelated customers together.
- Without both AI key and model, `openAIProvider()` returns null. Guided/deterministic behavior remains, but external AI is unavailable.

## P1 — split-origin browser requests are incomplete

1. **Custom headers are absent from CORS preflight.** `src/app/app.mjs` allows only Content-Type. `src/api.ts` sends X-Workspace-Id and Idempotency-Key on applicable mutations. The browser will reject those cross-origin requests unless both headers are explicitly allowed for trusted origins.
2. **Downloads bypass the configured API base.** Companion PDF links and workspace exports use `/api/...` directly in anchor hrefs. On Vercel these target the frontend host. Use a shared API URL builder or a deliberate same-origin API proxy.
3. **Cookie compatibility needs real-browser coverage.** Production session/device cookies use SameSite=None and Secure. This does not override browser third-party-cookie restrictions when the frontend is on vercel.app and the API is on a different site. Prefer the documented custom frontend domain and API subdomain, or a same-origin proxy, and test the chosen arrangement.
4. **No checked-in Vercel SPA rewrite.** There is no root vercel.json. Direct visits and refreshes on `/os/...`, `/verify` and `/reset-password` need SPA fallback routing. Hosting settings may provide it, but the repository does not establish that.
5. **Canonical email destination is unclear.** Deployment instructions set PUBLIC_ORIGIN to the API host; account emails append frontend routes to it. The backend also serves dist, so links may open a second copy of the frontend rather than necessarily 404. Choose one canonical frontend destination and document the distinction between API and frontend origins.

Sources: [MDN CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS), [Vercel Vite deployment](https://vercel.com/docs/frameworks/frontend/vite).

## P1 — process lifecycle and database pressure

- **Connection budget can be exceeded:** server/index.mjs computes max(1, floor(budget/workers)). With 16 workers and a total budget of 10, this permits 16 pooled connections, before considering startup/other services. Cap worker count against the available connection budget and allow headroom for operational connections.
- **Shutdown does not drain all work:** cluster primary signals workers then immediately exits. Worker shutdown awaits mail delivery but not the current scheduler `ticking` promise before closing the database. Drain HTTP, scheduler and mail work with a bounded deadline, then close pools and wait for workers.
- **PM2 settings do not match long requests:** no kill_timeout or explicit ready handshake is configured. PM2 documents a default forced-kill timeout of 1.6 seconds, shorter than database/provider operations. A restart can therefore interrupt active work. Configure and test startup/drain deadlines. Source: [PM2 graceful shutdown](https://pm2.keymetrics.io/docs/usage/signals-clean-restart/).
- **Crash loop backoff is absent in the internal cluster:** every worker exit immediately forks a replacement. A persistent startup/database failure can repeatedly hammer the database while PM2 still sees a running primary.

## P1 — health probes are behind database rate limiting

`app.use('/api', apiLimiter)` runs before both `/api/health` and `/api/ready`. That limiter writes to PostgreSQL. Consequently liveness is database-dependent; readiness can fail or wait in middleware before reaching its five-second bounded check, and probes share the API rate limit. Mount probes before this limiter and use independent infrastructure-level protection if required. The deployment README currently checks only liveness; add readiness checks to rollout validation.

## P1 — payment timeouts and operational validation

The four Paystack adapter fetch calls have no explicit AbortSignal deadline. nginx has a 60-second read timeout, which does not resolve the underlying payment's status. Add bounded requests and reconcile uncertain transfers/refunds by their stable reference instead of blindly retrying. Webhook signature verification exists. Confirm the deployed webhook URL, callback behavior, settlement and duplicate/out-of-order delivery using the provider's test environment before live acceptance testing.

## P2 — test isolation and deployment workflow

- TEST_DATABASE_URL uses a different database name but the same host and credentials as DATABASE_URL. This separates database names, not server capacity or credential authority. Database existence and role grants were not tested. Use a restricted test role and preferably separate staging infrastructure before load tests. The CI workflow already provisions a separate temporary PostgreSQL service.
- deploy/deploy.sh pulls and builds in the active checkout, then restarts. It has no pinned release, post-restart readiness gate, rollback or full test gate. Use validated release artifacts/directories, check readiness and retain a known-good version for rollback.
- Add protected environment-file permissions, log rotation, certificate-renewal checks and external alert delivery to the VPS runbook. Their current live configuration is unknown.
- Backups/restore drills, hosted CI results, real mail delivery and process-crash/soak evidence remain unverified.

## Cleanup impact

No files were deleted during this review. Application runtime imports inspected do not depend on the tests or artifacts folders. Deleting tests normally would not stop the deployed app, but would break current test commands/CI and remove regression coverage. Deleting artifacts removes diagnostic results, screenshots and operational notes; documentation references would need updating. Keep active tests and relocate useful deployment notes before deleting generated output.

## Recommended order

1. Rotate exposed credentials and verify the host's production settings.
2. Correct CORS, download URLs, canonical origins and Vercel routing; test the actual split deployment in browsers.
3. Correct health middleware ordering, process shutdown, connection budgets and payment deadlines.
4. Add gated releases/rollback, alerts and a restore drill.
5. Run the full staging journey and bounded crash/load tests with isolated credentials.
