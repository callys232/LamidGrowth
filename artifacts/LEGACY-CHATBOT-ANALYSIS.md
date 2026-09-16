# LamidOne and LamidPortal: chatbot and agent analysis

Reviewed 15 September 2026. Sources: `C:/Users/TechBuddy/Desktop/LamidOne` and `C:/Users/TechBuddy/Desktop/LamidPortal/lamid-portal`. Source inspection plus six executions of LamidOne's pure intent router. No applications started, no databases accessed, no live model calls, and neither source project was edited. Findings about deployment behavior remain subject to integration testing.

## Main conclusion

LamidPortal supplies a visual prototype of a multi-agent experience. Its mounted floating chatbot uses canned responses and keyword referrals. LamidOne has a real model-backed chatbot, content-grounded personas, authenticated agent execution, deterministic calculation/matching, and points metering. Neither inspected chat path implements a durable team of agents planning and executing a shared goal.

## 1. LamidPortal

### Mounted widget

`src/app/layout.tsx` mounts `component/Agent/Onboarding.tsx`. It provides a floating button, expanded/minimized panel, message timestamps, simulated thinking, manual agent switching, and browser speech recognition. The displayed user is hardcoded as Caleb.

Message execution: append user text → wait one second → `checkReferral()` → change `activeAgent` or choose a canned reply → append bot text. There is no model request in this flow. History lives in component state and disappears on reload.

`checker.tsx` recognizes onboarding words such as “start” and “overview”, and support words such as “help” and “issue”. Referral announces a switch and returns without answering the original request. Substring rules can misroute ordinary sentences. They are not semantic intent understanding.

### Agent surfaces

| Surface | Actual implementation |
| --- | --- |
| Onboarding/learning/support/shopping/creative/productivity | Named modes with fixed replies in the widget |
| Project | Local React forms append milestones and consultants; no save call in `projectAgent.tsx` |
| AnalyticsAgent used by AgentShell | Hardcoded efficiency, progress, workload and profitability figures |
| Separate analytics/Analytics component | Fetches project analytics; falls back to mock figures on error |
| Communication | Fetches `/api/client/${clientId}`; the discovered route directory is `/api/clients`, plural; mock fallback can hide failure |
| Outreach | Fetches stored project campaigns/keywords; client and server include mock fallback |

`agentShell.tsx` is a sidebar component switcher with hardcoded `client1` and `project1`. It has its own active-agent state, separate from the onboarding widget. I found the floating widget mounted in the root layout, but did not find a page mounting AgentShell in the inspected app tree. The shell's existence therefore does not establish that users reach it.

### Risks

- `isSignedIn = false` makes the manual lock a placeholder. Keyword referral directly sets the active agent, bypassing that UI check. This is a UI inconsistency, not proof of access to privileged backend actions.
- Voice recognition installs its callback once and captures the initial message handler/agent state. No recognition cleanup/error handler is present in the inspected setup.
- Dynamic Tailwind strings such as `hover:border-${agent.color}` may not produce styles unless safelisted.
- Mock analytics/outreach can look like genuine results when a request fails. The outreach GET route returns `success: true` with mock data on exceptions.
- The inspected outreach GET/PATCH/POST handlers do not authenticate the caller or check project ownership. No middleware file was discovered in that project. Verify deployment-level protection, then add route-level ownership enforcement before exposing writes.
- Creating a campaign record is not sending a campaign. No delivery worker was found in the inspected outreach flow.

Useful inheritance: widget presentation, explicit specialist choices, project step forms, and visible handoff language. Do not inherit mock results or client-only access decisions as production behavior.

## 2. LamidOne

### Aide: public widget

`components/layout/AssistantWidget.tsx` is mounted in the root layout and hidden on dashboard routes. It offers quick navigation, suggested questions, a manual persona selector, scrolling history, busy/error feedback, and an automatic opening after 26 seconds using a sessionStorage flag.

Execution: message → browser `routeIntent()` → optional handoff announcement → `/api/chat` → server identity/rate checks → content-generated system prompt → configured model → reply. The widget sends ordinary JSON, not a streaming request.

Six public personas: general assistant, support, pricing, solutions, expert programme and learning. These use the same model adapter with different instructions. Routing scores phrases at 2 and keywords at 1, with a minimum score of 2. It does not inspect the whole conversation or plan multiple tasks.

Executed router examples:

| Input/current persona | Actual result |
| --- | --- |
| “How much does it cost?” / assistant | pricing |
| “pricing” / assistant | assistant; one keyword is below threshold |
| “Help me create a goal and assign an expert” / assistant | assistant |
| “I want courses and certification” / assistant | learning |
| “error problem billing pricing” / pricing | support; equal scores use rule order, contrary to the comment promising retention of the current persona |

Widget implementation gaps: handoff notices are excluded from the first outbound payload but stored in the same `messages` array, so they re-enter later requests. Closing manually does not set the proactive session flag, allowing reopening if closed before the timer. Widths of 340/360px plus a 24px right offset need small-screen handling. Dialog labeling exists, but no explicit focus management or Escape handling appears in these widgets.

### Model/context boundary

`lib/ai.ts` builds facts from website content for suites, plans, agents and tools. This is useful grounding in current local product content, not retrieval of a user's private workspace. Some persona instructions still hardcode facts, including an enterprise price, so comments claiming facts cannot drift overstate the guarantee.

`/api/chat` keeps the last 12 messages, caps each at 2,000 characters, normalizes user-supplied roles, and rate-limits requests. Anonymous answers have a 300-token cap; signed-in requests use points metering at 10 points per request. The displayed unit “per conversation” is ambiguous because each send is billed separately. Anonymous access has no points debit; its observed limiter uses the same AI rate category, despite comments describing a tighter anonymous allowance.

Model transport prefers OpenRouter when its key is configured, otherwise the direct provider. The adapter accepts an AbortSignal but these chat callers supply no timeout/cancellation signal. Prompt instructions alone do not validate factual claims or establish safe tool permissions. Current chat cannot execute tools because no tool-call dispatcher is connected to it.

### Onboarding

`components/dashboard/OnboardingWidget.tsx` sends conversation plus current pathname to `/api/onboarding`. The server derives the account role and adapts help to client, expert, enterprise, concierge or operator. It limits history to 8 messages of 1,200 characters. This path is free but rate limited.

Signup mode can extract name, email and organisation from a model-generated `FIELDS:` object; password extraction is prohibited and parsed keys are restricted. This still requires user review and independent signup validation. A prompt prohibiting password extraction does not itself stop a user from typing a password into chat and transmitting it upstream.

### Executable agents

`/api/agents/[id]/run` checks identity, tier/admin access and rate limits; checks available points; reserves a hold; executes one branch; settles on success or releases on failure.

| Agent | Inspected execution branch |
| --- | --- |
| Catalyst / diagnostic | Runs the supplied engine when specified; otherwise reaches generic language generation |
| Horizon / growth-pathways | Defaults to G03 with required candidate pathways |
| Compass / matching | Deterministic expert scoring using project skills or supplied skills and stored experts |
| Scout / project-match | Deterministic reverse matching using the user's profile and open projects |
| Steward | Finds relevant upcoming events, identifies learning questions, composes a reply, and provides a deterministic fallback if the model fails |
| Scribe, Cadence, Sentry, Arbiter, Vantage, Blueprint | Generic endpoint normally supplies agent description/input to a model and returns prose |
| Beacon, Herald | Admin-only catalog entries; this generic endpoint is still not a demonstrated autonomous analytics/outreach service |

This describes this endpoint, not every possible domain-specific action elsewhere in the repository. An Arbiter text response is not evidence that a dispute was resolved; a Cadence plan is not evidence milestones were saved. Steward's fallback says a human will follow up, but `resolveTicket()` itself does not create that follow-up task.

### Engines

`lib/engines.ts` dispatches registered configurations to calculation families including assessment, decision quality, growth pathways, roadmaps, financials, selection and budgets. These computations can return working and warnings, a better basis for verifiable numbers than unconstrained prose. Many module configurations can share a compute family; module count is not a count of independent reasoning agents.

Important dispatch issue: caller-supplied `input.engine` is handled before specialized agent branches. That can override Horizon's supposed G03 pinning, bypass matching/support behavior, and run an engine under another agent's price/tier gate. The generic agent route does not apply the engine-specific entitlement check. Engine codes accept any letter plus two digits and unknown configurations fall back, so unsupported codes need explicit rejection or clear labeling.

### Metering and reliability gaps

- Non-streaming execution uses Mongo-aware async reserve/settle/release helpers. Streaming chat instead calls synchronous in-memory helpers. Real Mongo balances may pass the initial read but fail the streaming reservation or diverge across instances.
- Streaming parsing splits each network chunk into lines without retaining incomplete frames. Valid events spanning chunks can be lost. A thrown upstream fetch occurs outside the stream cleanup block after a hold is reserved. Cancellation releases a hold but does not explicitly abort upstream generation.
- Mongo reservation conditionally increments held points, then separately inserts a hold record. A crash between writes can strand held funds. Settlement deletes the hold, reads a balance, updates it and writes a ledger entry separately. This is not an atomic multi-document accounting operation.
- Concurrent settlements of different holds can calculate their allowance/purchased split from the same old balance. Single-document reservation atomicity does not prove the full accounting lifecycle safe.
- The inspected agent/chat endpoints do not accept a stable run idempotency key. Retrying a completed request can execute and charge again.
- Input typing is largely casting rather than strict runtime schemas. Body-size checks rely on Content-Length, and malformed null objects/message entries can fall into generic server errors.
- No durable chat memory, persisted handoff protocol, multi-step agent planner, or shared goal execution loop is wired into the inspected widget/agent endpoint paths.

## 3. How to use these findings for LamidGrowth

Use Portal as interaction inspiration and LamidOne as a source of reusable designs: role-aware onboarding, shared product facts, deterministic computation, visible handoffs, and reserve/settle semantics. Reimplement accounting and authorization against LamidGrowth's database; do not splice together Mongo and PostgreSQL wallets.

A goal-capable system needs one server-side coordinator with a persisted goal/run, authorized context selection, explicit specialist tools, validated outputs, user approval for consequential writes, and durable completion evidence. A practical sequence is: clarify goal → assess inputs → compute options → propose a plan → obtain approval → save milestones/matches → monitor progress. Every step needs a state, cost, retry key and accountable result.

The next useful validation is an end-to-end goal scenario, not adding more agent names: can a user request a goal, inspect its evidence and cost, approve a plan, see it saved, interrupt execution, and resume without duplicate actions or charges?

## Key source locations

- Portal widget: `src/component/Agent/Onboarding.tsx`
- Portal routing: `src/component/Agent/checker.tsx`
- Portal shell: `src/component/Agent/agentShell.tsx`
- Portal mock-backed API: `src/app/api/projects/[id]/outreach/route.ts`
- One public widget: `src/components/layout/AssistantWidget.tsx`
- One dashboard widget: `src/components/dashboard/OnboardingWidget.tsx`
- One routing/model: `src/lib/intentRouter.ts`, `src/lib/ai.ts`
- One endpoints: `src/app/api/chat/route.ts`, `src/app/api/onboarding/route.ts`, `src/app/api/agents/[id]/run/route.ts`
- One engines/support/metering: `src/lib/engines.ts`, `src/lib/supportAgent.ts`, `src/lib/points.ts`
- Local router reproduction: `node scripts/analyze-legacy-router.mjs`
