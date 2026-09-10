# LAMID ONE

**Backend routes:** Express route modules are in [`src/app`](src/app/README.md). Server startup and SQLite persistence remain in `server/`.

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
npm run test:e2e     # Browser journeys; install Chromium first if required
npm run format:check
```

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

| Location                                | Responsibility                                               |
| --------------------------------------- | ------------------------------------------------------------ |
| `src/pages/Marketing.tsx`               | Public home, navigation, footer                              |
| `src/pages/Auth.tsx`                    | Context selection and account journey                        |
| `src/pages/ContentPage.tsx`             | Source-based editorial and availability surfaces             |
| `src/pages/workspace/`                  | Separate operating-cycle feature screens                     |
| `src/components/WorkspaceParts.tsx`     | Shared objective/action display and review controls          |
| `src/components/WorkspaceShell.tsx`     | Workspace loading, navigation, dialogs, search               |
| `src/components/ObjectiveEditor.tsx`    | Versioned objective editing                                  |
| `src/components/ui.tsx`                 | Shared controls and native modal behavior                    |
| `src/styles.css`, `src/readability.css` | Responsive visual system and legibility overrides            |
| `src/app/app.mjs`                       | Session, validation, authorization, and API behavior         |
| `server/store.mjs`                      | SQLite schema, transactions, audit records, sample seed      |
| `scripts/generate-content.mjs`          | Reproducible extraction from the studied website copy        |
| `tests/`                                | API and browser verification                                 |
| `document-study/`                       | Original study and source traceability                       |
| `docs/`                                 | Architecture, delivery status, and implementation boundaries |
| `artifacts/`                            | Desktop/mobile screenshots and accessibility review          |

## Data and security boundaries

The local SQLite database is `data/lamid.db`, excluded from version control. Do not share it: it contains account and workspace data. `DATABASE_PATH` selects an alternative file. `PORT` selects the local HTTP port.

Passwords use scrypt with a random salt. Session and recovery tokens are random; only token hashes are stored. Recovery tokens expire, are single-use, and reset invalidates existing sessions. In local development, the recovery token is returned as a test-only continuation because no email provider is configured. Production still requires an email delivery adapter before recovery is deployable. Cookies are HttpOnly and SameSite=Lax. Mutations require JSON and reject cross-site requests. Workspace scope is derived from the server session, never from a client-supplied workspace ID. Authentication attempts are rate limited per process/IP. Mutations and corresponding audit entries share database transactions.

The server binds to loopback intentionally. New accounts receive 100 development points; job posts cost 10 points and bid submissions cost 2 points. Points are an internal ledger, not money, credits, stored value, or a payment balance. Enterprise workspaces support 50–200 active members; the default is 200 and `ENTERPRISE_MEMBER_LIMIT` can set a value within that range. Members can switch between their active workspace memberships, and all workspace services resolve through the selected tenant. Current enrollment adds existing accounts; production invitation delivery is still required. Permanent account deletion is restricted to emails configured in `ECOSYSTEM_ADMIN_EMAILS`; enterprise workspace owners can only disable non-owner members in their own workspace, never delete accounts. Production deployment requires a dedicated deployment design: HTTPS, secure cookies (`COOKIE_SECURE=true`), trusted-proxy configuration, secret management, hardened storage, backups, migrations, distributed abuse controls, observability, and operational acceptance. Node's SQLite API is experimental on the installed runtime. The stored audit history is application-managed and is not tamper-proof storage.

No email verification/recovery, MFA/SSO, shared membership, RBAC, AI execution, connectors, file processing, billing, payments, or background progression is implemented. Do not expose this build as a production service. All HTML is noindex while content and deployment remain under development.

## Validation

The initial implementation was checked with:

- Production build and strict TypeScript compilation.
- Ten API tests: unauthenticated access, tenant isolation, review bypass attempts, stale versions, pause/resume, authentication, strict input validation, cross-origin rejection, atomic plan saving, objective revisions, and scoped exports.
- Five browser tests: desktop operating cycle, mobile account creation and Companion planning, keyboard search/modal behavior with a dashboard accessibility scan, Three.js rendering/fallback, and reduced-motion behavior.
- Additional automated accessibility scans on the mobile home, start, login, how-it-works, and governance preview pages.

Automated accessibility checks do not constitute complete accessibility conformance. Manual assistive-technology and broader device testing remain part of release acceptance.

See [delivery status](docs/DELIVERY_STATUS.md) and [architecture decisions](docs/ARCHITECTURE.md) for the next implementation boundaries.
