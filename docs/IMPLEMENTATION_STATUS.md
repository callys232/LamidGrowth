# Enterprise implementation status

This is the current implementation ledger for the four supplied LAMID ONE specifications. It supersedes older feature-status statements in the original delivery notes. The complete enterprise program is **not finished**; implemented features below have executable code rather than roadmap placeholders.

Frontend update, 2026-09-09: the 98 document pages and interactive screens are now organized into named product folders with reusable slides, local components and page-state hooks. The homepage has a dedicated responsive design and interactive product preview. See the [editing guide](./PAGE_COMPONENT_GUIDE.md) and [homepage UI study](./HOMEPAGE_UI_STUDY.md). Combined validation passed the production build, 36 automated tests and 17 browser tests.

## Delivered in this implementation pass

| Area                   | Implemented behavior                                                                                                                                                             | Main evidence                                                                                      |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Tenant authority       | Owner/member permissions; owner-only settings, export and approval; membership suspension leaves other workspaces and account login usable                                       | `src/app/policy.mjs`, `tests/foundation.test.mjs`                                                  |
| Account lifecycle      | Atomic deletion across draft commercial dependencies and workflow runs; surviving users keep their point history; independent administration audit                               | `src/app/app.mjs`, populated deletion tests                                                        |
| Domain invariants      | Completed objectives reject new unfinished work; review decisions must match their transition                                                                                    | API and foundation tests                                                                           |
| Client tenancy         | Workspace changes remount feature state, discard open forms, guard mutation scope, and ignore stale refresh results                                                              | Workspace switching browser test                                                                   |
| Membership UI          | View members, add existing accounts, disable/restore membership                                                                                                                  | `/os/admin`, `/os/settings/members`                                                                |
| Commercial UI          | Workspace posts, searchable open opportunities, point balance, bid review and client/freelancer proposal drafts                                                                  | `/os/commercial`, API and browser tests                                                            |
| Commercial consistency | Idempotency keys for posts/bids/proposals; charges and audit share transactions; duplicate-bid database constraint                                                               | Foundation tests including failed-audit rollback                                                   |
| Workflows              | Persistent ordered dependency graphs, scheduling, versioned commands, expiry, owner authorization, approval, pause/resume, cancellation and bounded manual retry                 | `src/app/workflows.mjs`, workflow API/runtime and browser tests                                    |
| Local Tool Fabric      | Five executable, versioned, schema-validated local tools across the four engine labels                                                                                           | `/api/tools`; context snapshot, capability review, action preparation, progress snapshot, reminder |
| Evidence and rhythm    | Persisted progress snapshots with source versions and action evidence; separate progress history; personal review reminders                                                      | `/os/progress`, `/os/settings/notifications`                                                       |
| Knowledge              | Workspace-scoped notes and UTF-8 text import, source hashes, classification labels, search, versioned edit/delete                                                                | `/os/knowledge`, knowledge API/browser tests                                                       |
| Optional AI            | Configurable OpenAI adapter; workspace opt-in, verified-account checks, explicit selected-source consent, quotas, output/evidence validation, cancellation and revocation checks | `src/app/ai.mjs`, injected-provider tests; `/os/insights`, `/os/settings/ai`                       |
| Export                 | Versioned workspace export with full audit history, memberships, commercial records, workflows, invocations, knowledge, progress, reminders and AI records                       | Foundation export tests                                                                            |
| Persistence            | Transactional schema initialization and migrations 3–6; enterprise capacity no longer overwritten on restart                                                                     | Restart/migration tests                                                                            |
| Recovery               | Verified SQLite snapshot backup and a reopen/restore test using WAL-backed data                                                                                                  | `scripts/backup.mjs`, `tests/backup.test.mjs`                                                      |
| Browser isolation      | Dedicated test server and in-memory database; tests cannot reuse the ordinary development server                                                                                 | `scripts/e2e-server.mjs`, Playwright configuration                                                 |
| CI                     | Build/API/runtime checks plus Chromium browser journeys in a GitHub Actions definition                                                                                           | `.github/workflows/ci.yml`; hosted execution not yet observed                                      |
| Copy coverage          | Recovery/reset/verification now use the same canonical copy shell as other authentication pages                                                                                  | 98-route browser copy test                                                                         |

## Exact execution boundaries

The five registered tools are local deterministic operations. Their engine labels organize capability; they do not establish that the document's four complete intelligent engines or all 202 capabilities have been implemented. The 30-agent catalog has not been implemented as 30 agents. No unavailable capability is represented as an executable stub.

Workflow definitions are immutable after creation. Dependencies must reference earlier unique step IDs, which makes the graph acyclic. A workflow has at most 20 steps, expires within 30 days, and allows at most three attempts per failing step. Every data-changing step needs approval. Approval records both the workflow version and reviewed objective version; an objective revision invalidates approval. Only the authorizing active owner can control the run. All current tool mutations, result records and audit entries commit in one SQLite transaction. These guarantees do not extend to future external tools, which will need outbox, provider idempotency and compensation contracts.

The server checks due work every second while running. After restart, persisted unfinished work resumes its existing state. No work runs while the server is stopped. Cancellation stops future steps and does not silently undo already-completed changes. The current worker is part of a local single-server deployment, not a distributed orchestration service.

Knowledge classification is metadata, not a separate permission layer. Imported content is UTF-8 TXT/MD/CSV text, limited to 20 KB in the interface and validated as text in the API; there is no executable/binary upload processing. Deleting knowledge also removes stored AI reviews derived from it. Usage reservations remain, so deletion does not reset quotas. Existing backups require their own retention policy.

AI reviews require both operator configuration and an opted-in workspace. The endpoint sends only the selected objective, question and up to five selected knowledge records. Server quotas reserve attempts before the asynchronous provider call; failed attempts count. Output has a bounded schema and may reference only supplied source IDs. Responses are discarded if source versions or workspace authority change during the request. Model text is displayed as text and never executed. Creating a suggested action remains a separate human form submission. Cancellation attempts to abort the request and prevents acceptance of a late response; it cannot retract data already transmitted.

The provider adapter is implemented against the [official Responses structured-output contract](https://developers.openai.com/api/docs/guides/structured-outputs). Adapter and policy behavior are tested with an injected provider. A live provider call, model-quality evaluation, spend reconciliation and external-service acceptance have **not** been performed.

## Remaining master-document workstreams

Every row below remains partial or unimplemented as a complete enterprise specification. The list records outstanding work rather than implying the corresponding chapter is complete.

| Master chapter                    | Still required                                                                                                                |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| 1. System architecture            | Shared Continuous Intelligence Core, coordinated intelligent engines, broader service boundaries and architecture acceptance  |
| 2. Domain/data architecture       | Full normalized domain catalog, production database adapter, comprehensive provenance/policy fields and migration coverage    |
| 3. Identity/authority             | Production verification/recovery delivery, MFA/SSO/SCIM, richer roles, delegation, authority bands and dual approval          |
| 4. Persistent progression         | Signal-driven context/intelligence updates, full return-state contracts, distributed execution and operational acceptance     |
| 5. Agents/workflows               | Full bounded agent runtime/catalog, remaining Tool Fabric capabilities, external-tool contracts and compensation              |
| 6. APIs/events/integrations       | Stable versioned public API, event outbox, signed webhooks, replay protection, connector credential lifecycle                 |
| 7. Security/trust                 | Deployment threat model, distributed abuse controls, prompt-injection red-team evaluation, complete security acceptance pack  |
| 8. Context/memory/evidence        | Context graph, memory classes/consent, permission-aware retrieval beyond text search, freshness and evidence lineage          |
| 9. Commercial execution           | Agreements, milestones, acceptance/disputes, deliverable verification, payment-provider integration and reconciliation        |
| 10. Design system                 | Consolidate stylesheet ownership and complete manual accessibility/device review                                              |
| 11. Website                       | Public publication gates, remaining functional conversion flows, approved content/claims and production navigation acceptance |
| 12. OS experience                 | Remaining finance, talent, business, organization, analytics and settings surfaces                                            |
| 13. Enterprise governance         | Teams, organization hierarchy, policy inheritance, delegated administrators and enterprise audit review                       |
| 14. AI/evaluations                | Live-provider verification, approved model registry, benchmark/red-team datasets, model routing and ongoing quality gates     |
| 15. Notifications/return-state    | Preference-driven delivery, digests, external channels and complete progressed/changed/reassessed/blocked summaries           |
| 16. Files/search                  | Secure document/binary processing, scanning/quarantine, object storage, collections and broader retrieval                     |
| 17. Reliability/operations        | Monitoring, trace correlation, SLOs, incident response, off-host backup retention and disaster-recovery drills                |
| 18. DevSecOps                     | Actual deployment infrastructure, environments, secret management, supply-chain controls and hosted CI evidence               |
| 19. QA/UAT                        | Full acceptance traceability, adversarial testing, performance/load tests and stakeholder UAT                                 |
| 20. Analytics                     | Product event taxonomy, KPI computation, experimentation and reporting                                                        |
| 21. SEO/accessibility/performance | Production metadata/indexing approval, route/content bundle splitting, performance budgets and WCAG acceptance                |
| 22. Delivery program              | Accepted milestones, operational ownership, external integrations, controlled releases and final program acceptance           |

The pithy document remains a studied alternative copy source; this pass preserves the existing long-form rendering rather than silently replacing it. No production certification, legal-policy approval, payment capability, or full enterprise completion is implied.

## Configuration and verification

Validation completed on 2026-09-08: `npm run check` passed the TypeScript/production build and all 35 API, runtime, adapter, backup and copy tests. `BROWSER_CHANNEL=msedge npm run test:e2e` passed all 15 browser tests, including copy coverage across 98 routes, workflow approval/execution, workspace switching, commercial posting and knowledge editing. The production build still reports a large main JavaScript chunk; bundle splitting remains outstanding. Hosted CI, production deployment and live AI calls were not tested.

Use `npm run check` for build and API/runtime tests. Use `npm run test:e2e` for the isolated browser suite; set `BROWSER_CHANNEL=msedge` to use installed Edge. Tests for AI inject a provider and send no live requests.

Optional AI configuration is read only from the server environment:

- `OPENAI_API_KEY`: server-side provider credential; never put it in frontend code or a Vite-prefixed variable.
- `OPENAI_MODEL`: explicit model ID supporting Responses structured outputs. There is no automatic model selection.
- `AI_GLOBAL_DAILY_LIMIT`: server-wide daily attempt cap, default 100, bounded to 1–1000. Each workspace also has a 1–100 request cap. These are request limits, not monetary guarantees.

After configuring and restarting the server, verify an account, open `/os/settings/ai`, and explicitly enable reviews. `/os/insights` lets the user select context and consent to an individual request. The local verification route provides a local continuation; production email delivery still needs an adapter and operational configuration.

Create a verified backup with `npm run backup -- data/backups/checkpoint.db`. The destination must be new. The command creates a consistent SQLite snapshot plus a SHA-256 manifest, checks integrity and foreign keys, and never overwrites an existing backup. Test recovery into a separate file and run validation before selecting that file with `DATABASE_PATH`. Backup storage is not encrypted by this utility; production encryption/retention belongs to the deployment design.

Existing global account suspensions from the previous implementation are not automatically cleared: there is insufficient provenance to distinguish membership-induced suspension from intentional account suspension. Review those records under the appropriate account administration policy.

Before this pass, source files were archived to `artifacts/source-before-enterprise-implementation.zip`. The archive contains source, tests and configuration, not account database contents or environment secrets. The workspace is not currently a Git checkout, so no commit, PR or deployment has been made.
