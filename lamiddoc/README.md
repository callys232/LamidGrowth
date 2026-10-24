# LAMID ONE

This folder contains development notes, audit reports, deployment guides, product indexes and source-study material. Original repository paths are preserved beneath `lamiddoc/`. These files are not required to build or run the application. Content-regeneration commands may read the archived source study, so run those commands from a full developer checkout.

The VPS deployment script excludes `/lamiddoc/` using Git sparse checkout. New VPS clones also use partial cloning to avoid downloading unused document blobs. Existing Git history is not erased or compacted. Git archives exclude this folder, and `.vercelignore` excludes it from Vercel CLI uploads; Vercel's published frontend already consists only of `dist/`.

Deployment instructions: [VPS setup](deploy/README.md) and [Vercel with a VPS API](docs/vercel-vps-deployment.md). To restore the documentation in a sparse checkout, run `git sparse-checkout disable`.

**Current handover:** The six updated Markdown/PDF documents and generated source inventory are stored outside this repository in `Downloads/lamidGrowth`. Regenerate there with `node lamiddoc/scripts/build-handover-docs.mjs`; `LAMID_HANDOVER_DIR` can override the destination. The builder uses the editable Markdown already present in that destination.

Historical source-review snapshots now live in `lamiddoc/data/`. Generated test reports live in `lamiddoc/test-results/`; both directories remain Git-ignored and are local archives, not new uploads to GitHub. Report assembly is available at `node lamiddoc/scripts/build-full-ui-review.mjs`. Executable tests stay in `tests/` because VPS release checks require them. Runtime logs and the local PostgreSQL directory remain in `data/`; do not relocate a database while its service may be using it.

The VPS deploy script removes generated reports after successful release checks. Failed-check reports remain available for diagnosis. Moving local files does not reclaim space on an existing server or shrink Git history; deploy the updated script to apply this policy there.

**Backend routes:** The Express composition root is `src/app/app.mjs`; cohesive route groups live in `src/app/*.mjs`. Shared request/response schemas live in `src/contracts/`. PostgreSQL connection, schema, and versioned migrations live in `server/`; see [migration guidance](../server/migrations.md).

**Frontend editing:** Pages now live in named [product folders](src/products/README.md), with reusable slides, local components and state hooks. Start with the [page/component editing guide](docs/PAGE_COMPONENT_GUIDE.md). The homepage has its own [composition and styles](src/products/website/pages/home/README.md).

**Implementation update:** The working application now includes persistent approved workflows, member administration, commercial screens, knowledge records, progress history, review reminders, and an optional consent-based AI review adapter. See [current implementation status](docs/IMPLEMENTATION_STATUS.md) for verified behavior, configuration, and the remaining enterprise workstreams. The original foundation notes below are historical where they differ from that ledger.

A working first implementation of the Continuous Human–AI Growth Operating System, based on the three supplied specifications and the 98-page visual reference set.

**Current release: 0.1.0 — local development foundation.** This is an implemented operating cycle, not the completed enterprise program or a claim of production readiness.

## Run locally

Requires Node.js 22.13+ and npm. The current environment uses Node.js 22.17.1.

```sh
npm ci
npm run dev
```

Open **http://localhost:3000**. Choose **Explore the workspace** for an isolated, editable sample, or **Find your starting point** to create an account with an empty workspace. No seed password or third-party account is required.

Each sample session gets separate data. Creating another sample creates another workspace. A sample session is retained in an HttpOnly cookie for seven days; it is not a production account. Use an account to sign back into your work.

```sh
npm run build        # TypeScript checks and production assets
npm start            # Serves built assets and API on localhost:3000
npm test             # API authorization and behavior tests
npm run test:e2e     # Standard browser journeys; install Chromium first if required
npm run format:check
```

`npm test` and `npm run test:e2e` are the fast checks and are what CI runs. Five longer, exploratory Playwright suites (regional usability, paid specialist demos, deep marketplace coverage, a human-paced first visit, and a full public-page link/button sweep) are excluded from `test:e2e`'s default config and are not run in CI. Run them with `npm run test:exploratory`, or everything (build, unit/API tests, standard browser tests, exploratory suites, and formatting) with `npm run test:full`. Both require a real local Postgres reachable via `TEST_DATABASE_URL` — see [`audit-results/environment.cjs`](../audit-results/environment.cjs) for a disposable-container example — and the exploratory suites must run sequentially (as the script does), since the paid-path and deep-coverage configs share a fixed schema.

On Windows, an installed Edge browser can be used instead of downloading Chromium:

```powershell
$env:BROWSER_CHANNEL = 'msedge'
npm run test:e2e
```

Otherwise run `npx playwright install chromium` once. Vite's documented runtime requirements are available in the [official setup guide](https://vite.dev/guide/).

## Working features

- Responsive public home, navigation, editorial layouts, help-topic filtering, and onboarding.
- Canonical Midnight/Graphite/Sandstone palette, locally hosted sans/serif typography, Motion transitions, and a demand-rendered Three.js ONE diagram with reduced-motion and WebGL fallback support.
- Signup, login, logout, local password recovery, per-account workspaces, enterprise memberships, tenant switching, and isolated sample workspaces.
- Categorized job posts, point-charged posting and bidding, bid review, and client/freelancer proposal drafts.
- Create and revise objectives, priorities, dates, constraints, success criteria, and status.
- Connected actions, list and board views, due-action view, pause/resume, submission, and explicit review.
- Optimistic version checks and server-enforced action transitions. Review-gated actions cannot bypass approval; completed actions remain in history.
- Guided Companion planning. An objective and optional first action save in one database transaction.
- Weekly reflections, derived completion counts, and recorded activity.
- Workspace configuration, searchable objectives/actions/pages, and workspace-scoped JSON export.
- All 98 specified routes inventoried; 60 public editorial records retain source paragraph references. Gated public areas display availability information. Unimplemented OS routes display an explicit roadmap state.

The Companion is a structured planning flow, **not a connected AI model**. It does not fabricate model answers or perform external actions. Demo objectives and activity are labeled as sample data.

## Project map

| Location                    | Responsibility                                                 |
| --------------------------- | -------------------------------------------------------------- |
| `src/products/website/`     | Public site and editorial surfaces                             |
| `src/products/accounts/`    | Account journeys and account UI                                |
| `src/products/workspace/`   | Workspace shell, operating cycle, and demo sandbox             |
| `src/shared/`               | Reusable UI, navigation, content, and domain helpers           |
| `src/contracts/`            | Shared Zod request and response contracts                      |
| `src/app/app.mjs`           | HTTP composition, authentication, and middleware               |
| `src/app/*.mjs`             | Cohesive API route modules and policies                        |
| `server/store.mjs`          | PostgreSQL store, transactions, and schema bootstrap           |
| `server/migrations.mjs`     | Ordered transactional schema migrations                        |
| `tests/`                    | Unit, API, database-upgrade, browser, and release verification |
| `scripts/release-check.mjs` | Required sequential release-check pipeline                     |
| `lamiddoc/`                 | Development notes, archived studies, and deployment guidance   |

## Data and security boundaries

The application uses PostgreSQL, configured with `DATABASE_URL`; `TEST_DATABASE_URL` must point at a separate test database. Schema changes are applied through ordered, transactional migrations. Never share database credentials or account data.

Passwords use scrypt with a random salt. Session and recovery tokens are random; only token hashes are stored. Recovery tokens expire, are single-use, and reset invalidates existing sessions. Cookies are HttpOnly and SameSite=Lax. Mutations require JSON and reject cross-site requests. Workspace scope is derived from the server session and active membership, never trusted from a client-supplied workspace ID. API state is validated against the shared frontend/backend contract. Authentication and mutation rate limits use the database-backed limiter. Mutations and corresponding audit entries share database transactions.

The server binds to loopback intentionally. Points are represented by a relational ledger; identity, membership, commerce, payment, and other cross-record invariants use relational tables. Bounded workspace objects such as objectives, actions, and reviews use the generic `records` table with workspace scoping and version checks. This is a deliberate boundary, not a rule that all future data should be JSON. See [migration and storage guidance](../server/migrations.md). Production still requires deployment-specific HTTPS, secure-cookie, trusted-proxy, secret-management, backup, observability, and operational acceptance checks.

For current implementation boundaries and deployment requirements, consult the implementation status and deployment guides rather than the historical foundation notes below.

## Validation

The release pipeline requires a dedicated `TEST_DATABASE_URL` distinct from `DATABASE_URL`, builds the production assets, runs the database-backed Node test suite, and executes the sequential browser and accessibility audits. Run `npm run format:check` separately; the repository currently has pre-existing formatting failures outside the files touched here.

Automated accessibility checks do not constitute complete accessibility conformance. Manual assistive-technology and broader device testing remain part of release acceptance.
