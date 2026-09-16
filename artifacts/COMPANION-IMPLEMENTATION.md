# Companion widget and coordination

## Available surfaces

- **Ask Companion** floats on public and workspace pages. It uses a native dialog for keyboard focus, Escape handling and mobile containment.
- Public visitors get free onboarding, account-access and pricing guidance. Public text is classified locally into a topic; only the topic is sent to the server. No public model usage or private workspace context is involved.
- Signed-in users can use the specialist chat in the widget or at `/os/companion/chat`.
- The selector offers Auto plus the existing specialists and three new free guidance agents. All execution paths check the current database membership and required authority.
- Auto routing considers specific message intent, the previous agent for follow-up questions, current page and workspace context. Generic action words no longer capture document requests. This is deterministic routing, not a learned intent model.

## Persistent state

The latest 50 agent runs for the current user/workspace restore chat history. Historical errors/running states are visible. Public guidance is not stored. This release provides one recent-history stream rather than named conversation threads.

Coordinated tasks use the existing `records` table with kind `companion_task`. They store the owner, objective text, specialist sequence, price preview, attempts, step results and summary. The new guidance manifests are registered idempotently on database initialization, including existing schemas.

## Coordinated execution

Open **Coordinate a task across specialists**, describe an outcome and preview a free plan. The coordinator chooses one of three bounded sequences for project documents, business growth or general goals. Each step requires explicit approval at its displayed point cost. Prior results become context for the next specialist. Completed results remain available after reload; a combined summary is stored when all steps finish.

These sequences use existing advisory/document specialists. They do not autonomously publish campaigns, settle disputes, hire experts or write project milestones. Completed planning links to the existing Guided Planning flow to review and save the goal/next action.

The next-step endpoint uses optimistic version checks to reject simultaneous approvals. Stable per-task/step/attempt idempotency keys support resuming a lost response without repeating a completed run. Consent is fixed while an attempt is in progress. Changed specialist pricing requires a new preview. A failed attempt can be retried explicitly; previous completed steps remain saved.

## Validation

Tests added:

- Routing regressions, follow-up context, workflow-command boundaries and free guidance.
- Public guidance, manual specialist selection, private history, cross-account isolation, simultaneous step approval, three-step completion and completed-step replay.
- Browser mobile light/dark containment, keyboard focus restoration, manual selection, history restoration and task restoration.

External models are disabled in these tests. Database tests use the repository's dedicated `TEST_DATABASE_URL`; this work does not change production credentials.

The browser test server now prevents overlapping workflow polls and waits for the current poll and database cleanup during shutdown.
