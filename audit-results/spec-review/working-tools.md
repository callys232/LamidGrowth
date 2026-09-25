# Verified working tool duties

Fresh frozen backend run: **317 tests; 317 passed; 0 failed; 0 skipped; 0 cancelled**. [Full log](working-tools-full-backend.log), [source hashes](working-tools-manifest.json). Tests ran on local disposable PostgreSQL schemas, with external AI/payment/email providers disabled or replaced by test doubles. Some fixtures deliberately fund workspaces and grant entitlements. Browser access, real-provider quality/settlement and production operation were not verified by this run.

The table contains 45 working duties with matching passing tests. It is deliberately more precise than calling entire products “fully working.” Related checks can establish persistence/authorization while leaving reasoning quality, concurrency, privacy or the full specification incomplete. Services not listed here are **not automatically broken**; they lack the same reviewed duty-level evidence in this inventory.

| Tool / component | Verified duty | Test evidence | Boundary |
|---|---|---|---|
| Financial Visibility (F01) | Calculates financial summaries from supplied figures; the API test independently checks gross margin and point charging. | PASS for stated duty; [tests/engines.test.mjs](../../data/working-tools-review-20260924/tests/engines.test.mjs#L93); tests 98 | Does not establish real-time bank integration or every financial metric’s correctness. |
| Assessment scoring (tested through S01) | Accepts declared dimensions, rejects unknown dimensions and charges only an accepted run. | PASS for stated duty; [tests/engines.test.mjs](../../data/working-tools-review-20260924/tests/engines.test.mjs#L126); tests 99 | Does not establish the accuracy of the business diagnosis or the full Strategic Identity Statement promise. |
| Quote Generator | Computes a quote from the recorded job budget range. | PASS for stated duty; [tests/agents.test.mjs](../../data/working-tools-review-20260924/tests/agents.test.mjs#L616); tests 20 | Deterministic budget arithmetic; not market-price validation. |
| Estimate Generator | Returns the recorded lower/upper budget range for the job. | PASS for stated duty; [tests/agents.test.mjs](../../data/working-tools-review-20260924/tests/agents.test.mjs#L616); tests 20 | Not a verified delivery-cost forecast. |
| Invoice Generator | Invoices approved milestones using the exact recorded amount. | PASS for stated duty; [tests/projects.test.mjs](../../data/working-tools-review-20260924/tests/projects.test.mjs#L327); tests 231 | Actual payment collection is a separate provider-dependent operation. |
| Indicative FX Converter | Converts using the stored rate; handles same currency and rejects missing pairs. | PASS for stated duty; [tests/fx.test.mjs](../../data/working-tools-review-20260924/tests/fx.test.mjs#L51); tests 153 | Display-only indicative conversion; no claim of live exchange-rate freshness. |
| Creation Asset Manager | Persists a generated asset, lists it, creates revisions and removes the version chain. | PASS for stated duty; [tests/creation-studio.test.mjs](../../data/working-tools-review-20260924/tests/creation-studio.test.mjs#L105); tests 81 | Concurrent editing and immutable retention are separate acceptance concerns. |
| Document PDF Export | Exports a completed document as a PDF and rejects another workspace’s access. | PASS for stated duty; [tests/documents.test.mjs](../../data/working-tools-review-20260924/tests/documents.test.mjs#L83); tests 90 | Tests verify valid PDF header/access; not visual layout of every possible document. |
| Document Attestation | Records a signer and a content-hash-bound attestation. | PASS for stated duty; [tests/documents.test.mjs](../../data/working-tools-review-20260924/tests/documents.test.mjs#L105); tests 92 | An in-app attestation; not a qualified electronic signature. |
| Workflow Runtime | Applies block/ask/allow rules, version-bound approval, tenant/principal checks, pause/expiry, bounded retry and restart recovery. | PASS for stated duty; [tests/workflows.test.mjs](../../data/working-tools-review-20260924/tests/workflows.test.mjs#L63); tests 312 | Verified built-in runtime behavior; not every canonical workflow/connector/compensation capability. |
| Task Manager | Creates, lists, updates and deletes tasks for project parties. | PASS for stated duty; [tests/tasks.test.mjs](../../data/working-tools-review-20260924/tests/tasks.test.mjs#L113); tests 300 | This does not independently certify all assignment/edit concurrency edge cases. |
| Deadline / Blocker Attention | Surfaces overdue or blocked open tasks and excludes completed tasks. | PASS for stated duty; [tests/tasks.test.mjs](../../data/working-tools-review-20260924/tests/tasks.test.mjs#L146); tests 301 | Computed attention feed; not continuous external notifications. |
| Change Request Manager | Allows parties to request changes and only the owner to decide them; rejects a repeated decision. | PASS for stated duty; [tests/tasks.test.mjs](../../data/working-tools-review-20260924/tests/tasks.test.mjs#L185); tests 302 | Approval recording does not itself prove every downstream scope/money effect. |
| Milestone / Deliverable Workflow | Persists the project–milestone–deliverable–submission–review–approval sequence and checks client/freelancer roles. | PASS for stated duty; [tests/projects.test.mjs](../../data/working-tools-review-20260924/tests/projects.test.mjs#L100); tests 227 | Content verification in this test does not certify actual external artifact quality. |
| Dispute Record Manager | Creates a dispute record and changes the milestone to disputed. | PASS for stated duty; [tests/projects.test.mjs](../../data/working-tools-review-20260924/tests/projects.test.mjs#L292); tests 230 | Resolution fairness and actual funds recovery require separate validation. |
| Project Closeout / Completion Certificate | Requires fully paid milestones before closing and issuing the completion certificate. | PASS for stated duty; [tests/tasks.test.mjs](../../data/working-tools-review-20260924/tests/tasks.test.mjs#L235); tests 303 | Uses test-controlled payment state; not evidence of live settlement. |
| Project Messaging | Stores ordered messages between project parties and rejects unrelated accounts. | PASS for stated duty; [tests/messaging.test.mjs](../../data/working-tools-review-20260924/tests/messaging.test.mjs#L85); tests 195 | No claim of delivery to external chat/email providers. |
| Goal Pathway Templates | Produces family-appropriate steps while retaining supplied success conditions and constraints. | PASS for stated duty; [tests/goal-pathways.test.mjs](../../data/working-tools-review-20260924/tests/goal-pathways.test.mjs#L5); tests 157 | Template behavior; not validation of live AI advice. |
| Goal Lifecycle Manager | Starts a goal at captured and enforces allowed lifecycle transitions and terminal states. | PASS for stated duty; [tests/goals.test.mjs](../../data/working-tools-review-20260924/tests/goals.test.mjs#L112); tests 160 | The broader dependency/change-propagation contract is separate. |
| Goal Subscription Manager | Creates, lists and removes goal subscriptions. | PASS for stated duty; [tests/goals.test.mjs](../../data/working-tools-review-20260924/tests/goals.test.mjs#L145); tests 161 | This does not certify matching relevance, constraint enforcement or continuous scanning. |
| Intelligence Result Retrieval | Reads fresh stored results and excludes expired results; rejects other-workspace access. | PASS for stated duty; [tests/intelligence.test.mjs](../../data/working-tools-review-20260924/tests/intelligence.test.mjs#L54); tests 169 | Not certification of the full typed result/lineage fabric. |
| Intelligence Conflict Flagging | Flags different conclusions for the same subject for human review. | PASS for stated duty; [tests/intelligence.test.mjs](../../data/working-tools-review-20260924/tests/intelligence.test.mjs#L86); tests 170 | A conflict flag is not automatic evidence reconciliation. |
| Recommendation Tracking | Persists an advisor recommendation and accepts it; stage changes invalidate linked stale results/recommendations. | PASS for stated duty; [tests/recommendations.test.mjs](../../data/working-tools-review-20260924/tests/recommendations.test.mjs#L93); tests 236 | Execution scheduling, causal validity and ordinary edit/delete propagation need their own proof. |
| Scoping Draft Manager | Starts a saved scope from an objective without requiring all fields first. | PASS for stated duty; [tests/scoping.test.mjs](../../data/working-tools-review-20260924/tests/scoping.test.mjs#L51); tests 247 | Qualified review/publication and resume UX are separate. |
| Field Guidance | Returns Explain, Example, Suggest and Help-me-decide responses and rejects unsupported fields/strangers. | PASS for stated duty; [tests/field-guidance.test.mjs](../../data/working-tools-review-20260924/tests/field-guidance.test.mjs#L49); tests 138 | Tests prove the contract and non-destructive suggestions, not expert-quality reasoning. |
| Scope Version History | Stores distinct attributed snapshots on successive saves. | PASS for stated duty; [tests/scope-versions.test.mjs](../../data/working-tools-review-20260924/tests/scope-versions.test.mjs#L49); tests 246 | Does not certify simultaneous edits or expert proposal reconciliation. |
| Reviewer Response-Window Calculation | Computes an SLA from declared availability and leaves it absent when none is declared. | PASS for stated duty; [tests/reviewer-sla.test.mjs](../../data/working-tools-review-20260924/tests/reviewer-sla.test.mjs#L65); tests 241 | This does not prove qualification, deadline monitoring or delivery within that SLA. |
| Expert Profile Manager | Creates and updates a profile. | PASS for stated duty; [tests/talent.test.mjs](../../data/working-tools-review-20260924/tests/talent.test.mjs#L56); tests 292 | Profile persistence does not verify credentials or eligibility. |
| Skills Assessment Grader | Grades the supported quiz banks deterministically and rejects unsupported skills. | PASS for stated duty; [tests/talent.test.mjs](../../data/working-tools-review-20260924/tests/talent.test.mjs#L117); tests 294 | Limited to supported assessments, not all professions. |
| Scoped Expert Context Package | Grants a package to the engaged expert, resolves it, rejects foreign objects and blocks resolution after revocation. | PASS for stated duty; [tests/expert-context-package.test.mjs](../../data/working-tools-review-20260924/tests/expert-context-package.test.mjs#L81); tests 125 | Expiry, purpose and broader delegation semantics are separate. |
| Explicit Context Transfer | Copies records or grants revocable reference/promote pointers between permitted workspaces. | PASS for stated duty; [tests/context-transfer.test.mjs](../../data/working-tools-review-20260924/tests/context-transfer.test.mjs#L61); tests 76 | The anonymize operation is not certified to remove identifying information. |
| Learning Path / Enrollment Manager | Creates paths/modules, tracks module completion and blocks enrollment until prerequisites are met. | PASS for stated duty; [tests/learning.test.mjs](../../data/working-tools-review-20260924/tests/learning.test.mjs#L143); tests 188 | Completion/score tracking is not independently verified mastery. |
| Learning Assignment / Compliance Tracker | Assigns paths with due dates and restricts compliance requirement creation to administrators. | PASS for stated duty; [tests/learning.test.mjs](../../data/working-tools-review-20260924/tests/learning.test.mjs#L166); tests 189 | Does not establish organization-wide compliance certification. |
| KPI Observation Tracker | Creates KPI definitions, records observations, lists and deletes them. | PASS for stated duty; [tests/growth.test.mjs](../../data/working-tools-review-20260924/tests/growth.test.mjs#L73); tests 163 | Does not certify metric source quality or causal impact. |
| Opportunity Pipeline Tracker | Creates, changes pipeline status and deletes opportunities. | PASS for stated duty; [tests/growth.test.mjs](../../data/working-tools-review-20260924/tests/growth.test.mjs#L95); tests 164 | Not certification of goal-aware opportunity discovery. |
| Experiment Tracker | Enforces draft → running → complete transitions. | PASS for stated duty; [tests/growth.test.mjs](../../data/working-tools-review-20260924/tests/growth.test.mjs#L112); tests 165 | Not validation of experiment design/statistical conclusions. |
| Experiment Builder — persistence duty | Creates a persisted draft experiment. | PASS for stated duty; [tests/growth.test.mjs](../../data/working-tools-review-20260924/tests/growth.test.mjs#L161); tests 168 | AI-generated hypothesis quality is not certified. |
| Performance Analytics — data retrieval duty | Includes actual stored KPI data in the analytics context. | PASS for stated duty; [tests/growth.test.mjs](../../data/working-tools-review-20260924/tests/growth.test.mjs#L140); tests 166 | Not independent validation of live model conclusions. |
| Opportunity Signals — pipeline retrieval duty | Includes actual stored opportunity pipeline data. | PASS for stated duty; [tests/growth.test.mjs](../../data/working-tools-review-20260924/tests/growth.test.mjs#L152); tests 167 | Not validation of continuous external signal monitoring. |
| Human AI Rules | Rejects unknown permissions, bounds feature/cost/source access and rejects an AI result when policy changes during the request. | PASS for stated duty; [tests/ai-rules.test.mjs](../../data/working-tools-review-20260924/tests/ai-rules.test.mjs#L41); tests 30 | Tests use controlled providers; full cross-service lane governance is separate. |
| Agent Points Charging / Refunds | Debits successful runs, refunds failed runs and rejects insufficient balance. | PASS for stated duty; [tests/agents.test.mjs](../../data/working-tools-review-20260924/tests/agents.test.mjs#L280); tests 13 | Not certification of fiat ledger retention or settlement. |
| Proposal Drafter — integration duty | Grounds its input in the real job, rejects unrelated users and persists the resulting draft. | PASS for stated duty; [tests/agents.test.mjs](../../data/working-tools-review-20260924/tests/agents.test.mjs#L428); tests 16 | Provider-controlled tests do not establish live writing or commercial quality. |
| Scope Builder — integration duty | Uses the real job and rejects unrelated users. | PASS for stated duty; [tests/agents.test.mjs](../../data/working-tools-review-20260924/tests/agents.test.mjs#L506); tests 18 | Complete scoping/review requirements are broader. |
| Contract Builder — integration duty | Uses the real job and rejects unrelated users. | PASS for stated duty; [tests/agents.test.mjs](../../data/working-tools-review-20260924/tests/agents.test.mjs#L561); tests 19 | No legal correctness or enforceability certification. |
| Change Order Generator — integration duty | Uses the real proposal and rejects unrelated users. | PASS for stated duty; [tests/agents.test.mjs](../../data/working-tools-review-20260924/tests/agents.test.mjs#L655); tests 21 | No live drafting-quality or downstream commitment certification. |

## Registered engines are not independently certified tools

The [248-entry engine register](registered-engines.csv) lists every current configured engine name, input kind and purpose. Catalog presence and shared computation do not prove that each module fulfils its advertised purpose. Only F01 financial calculations and S01 assessment input/charging behavior receive the specific fresh API assertions described above. Other engine families need independent expected-output and duty-acceptance cases before joining a verified list.

## Incomplete / excluded claims

Do not infer from the passing rows that continuous goal-aware matching, verified causal attribution, credential-qualified expert ranking, red-band specialist reconciliation, true anonymization, live AI advice quality, live payment settlement, or all 202 canonical capabilities are complete. Each needs its own acceptance evidence. The older [specification audit](REPORT.md) remains tied to its earlier frozen baseline; later fixes require current tests and code review.

No backend assertions failed in this run. This does not establish untested properties or full production readiness.

## Complete executed behavior index

Every backend assertion, including supporting account/security/billing services, is listed below so the selected product-tool table does not hide failures or omit the wider test evidence.

- PASS 1: activity feed requires authentication
- PASS 2: activity feed merges jobs, workflows, and agent runs, sorted by recency
- PASS 3: stored records without a kind remain usable under human data-sharing rules
- PASS 4: an empty workspace can request suggestions without falsely reporting blocked data
- PASS 5: companion messages require authentication
- PASS 6: companion agent catalog lists the seeded agents
- PASS 7: a signal, capability, analytics, or market question routes to its specialist agent
- PASS 8: a generic question routes to the read-only context curator agent
- PASS 9: a diagnostic-style question routes to the diagnostic intelligence agent
- PASS 10: a workflow command routes to the orchestration agent and never bypasses approval
- PASS 11: a workspace member cannot use the mutating workflow-orchestration agent
- PASS 12: a successful agent run debits points and reports the new balance
- PASS 13: a failed agent run refunds the points it charged
- PASS 14: an agent is rejected before it runs if the workspace has too few points
- PASS 15: the consultant matcher ranks bids and is only visible to the job owner
- PASS 16: the proposal drafter grounds its draft in the real job and rejects unrelated users
- PASS 17: the 9 new commercial document tools reject a missing job/proposal before charging, without completing
- PASS 18: the scope builder grounds its draft in the real job and rejects unrelated users
- PASS 19: the contract builder grounds its draft in the real job and rejects unrelated users
- PASS 20: quote and estimate generators compute from the real budget range without calling AI
- PASS 21: the change order generator grounds in the real proposal and rejects unrelated users
- PASS 22: sends a message to the AI model and receives a valid return reply with structured logs
- PASS 23: OpenAI provider AI connectivity check records successful request and usage logs
- PASS 24: Anthropic provider AI connectivity check records successful response logs
- PASS 25: MultiProvider AI connectivity failover logs primary failure and fallback success
- PASS 26: AI connectivity check handles and logs network failure when all providers fail
- PASS 27: Unconfigured AI provider returns unconfigured status and logs error
- PASS 28: human rules reject unknown powers, enforce features and bound points
- PASS 29: only user-allowed source types leave the workspace
- PASS 30: external AI rejects a response when the human changes rules mid-request
- PASS 31: AI goal pathways follow human data and feature rules without creating work
- PASS 32: Deep Review and Companion share the final workspace and global quota slots
- PASS 33: OpenAI adapter uses bounded structured responses without tool execution and rejects refusals
- PASS 34: AI reviews require opt-in and consent, enforce source scope and cannot execute actions
- PASS 35: AI output cannot cite another source or survive revocation during an in-flight request
- PASS 36: out-of-scope model evidence fails validation and leaves no accepted review
- PASS 37: a cancelled AI review cannot accept a late provider response
- PASS 38: private APIs reject unauthenticated requests
- PASS 39: database outages return 503 while liveness remains healthy
- PASS 40: isolated sample workspaces cannot read or change each other’s work
- PASS 41: review cannot be bypassed and stale approvals fail atomically
- PASS 42: state transitions support pause and resume while preserving completed history
- PASS 43: signup, session, logout, login and data persistence
- PASS 44: only an ecosystem administrator can permanently delete an account
- PASS 45: enterprise administrators disable workspace membership without disabling accounts
- PASS 46: points are charged once for job posts and bids
- PASS 47: job posts support client and freelancer proposal drafts
- PASS 48: password recovery is privacy-safe, single-use, and revokes sessions
- PASS 49: account verification uses expiring single-use tokens
- PASS 50: strict validation rejects invalid dates, unknown fields, and initial completion
- PASS 51: cross-origin mutations are rejected
- PASS 52: rate limits block bursts and return retry timing
- PASS 53: guided plans save an objective and first action together
- PASS 54: goal pathways preview without writes and save selected steps exactly once
- PASS 55: goal deletion requires confirmation, isolates workspaces and removes linked actions
- PASS 56: objective revisions are isolated, versioned, and cannot conceal unfinished actions
- PASS 57: reflections and exports are workspace scoped
- PASS 58: AU-02: a workspace can create a child workspace it did not previously own, without violating the one-self-owned-workspace-per-user rule
- PASS 59: AU-02: creating and listing children requires workspace:manage permission, not just membership
- PASS 60: AU-02: a child workspace is fully independent — its own owner controls it, unaffected by the parent
- PASS 61: AU-03: selecting "Enterprise" as an audience context does not itself grant enterprise tier
- PASS 62: AU-03: only an ecosystem admin can grant a workspace a higher tier, and it is auditable
- PASS 63: AU-03: an invalid tier value is rejected
- PASS 64: a workspace with no concierge ever assigned has an empty concierge fee history but real points usage
- PASS 65: the ecosystem fee is charged once at assignment; the PM fee recurs every 30-day cycle
- PASS 66: the assigned concierge cannot view the billing statement
- PASS 67: guidance, manual selection, private history and resumable approved specialist tasks
- PASS 68: routing covers common needs and preserves follow-up context
- PASS 69: task plans are bounded and have no repeated specialist
- PASS 70: specific document requests are not captured by generic action verbs
- PASS 71: follow-up routing retains safe context but never repeats a workflow command
- PASS 72: support and signup requests use free guidance; plans contain no write agents
- PASS 73: a user applies, a non-admin cannot approve, an ecosystem admin can
- PASS 74: a duplicate application while pending or approved is rejected
- PASS 75: an owner can only assign an approved provider, and only one active concierge at a time
- PASS 76: promoting a personal goal into an org workspace is explicit, resolvable by org members, and revocable
- PASS 77: a copy transfer produces an independent record that cannot be revoked, and anonymize strips narrative fields
- PASS 78: product-owned pages preserve every original paragraph without clipping or prefix filtering
- PASS 79: every document route resolves to a unique named product page and matching content
- PASS 80: a proposal-drafter run persists a real, listable creation asset instead of returning prose only
- PASS 81: a creation asset can be revised, producing a new version while listing only shows the latest
- PASS 82: deleting a creation asset removes its whole version chain
- PASS 83: rollback failure preserves the original error and discards the broken connection
- PASS 84: failed standalone database calls discard disconnected clients
- PASS 85: acquisition retries are bounded and never retry authentication errors or saturated pools
- PASS 86: database failures return a safe retryable response without masking unrelated errors
- PASS 87: business validation errors roll back but keep a healthy connection reusable
- PASS 88: an uncertain commit is never replayed automatically
- PASS 89: startup failures close both pools even when acquisition or rollback fails
- PASS 90: a completed document run can be exported as a PDF with a valid header
- PASS 91: a stranger in a different workspace cannot export or sign someone else's document
- PASS 92: signing a document records an attestation bound to the current content hash
- PASS 93: the full 248-tool catalog is public at /engines/catalog — the public-facing pages are where a user learns of everything
- PASS 94: the in-app engine catalog requires a session
- PASS 95: running an engine still requires a session even though the public catalog does not
- PASS 96: an enterprise-tier workspace (the funded-test default) sees the full 248-tool catalog in-app
- PASS 97: a workspace's in-app catalog is filtered to its signup context, cumulative by rank, and always includes what it's bought a bundle for
- PASS 98: a financial-kind run returns arithmetically correct figures and appears on the public billables page
- PASS 99: an assessment-kind run refuses a dimension the engine does not declare, without charging points
- PASS 100: an assessment-kind run scores the module's own declared dimensions and charges points
- PASS 101: running an engine is rejected before charging when the workspace has too few points
- PASS 102: an unknown engine code returns 404
- PASS 103: a non-enterprise (individual) workspace cannot add members
- PASS 104: an enterprise workspace rejects new members once member_limit is reached
- PASS 105: a disabled member loses workspace access on their very next request
- PASS 106: an individual-tier workspace with no bundle cannot run a paid engine or a paid chat agent, and is not charged
- PASS 107: the free chat agents remain accessible to an individual-tier workspace with no bundle
- PASS 108: purchasing a bundle grants real access to exactly the tools it includes, confirmed only after the webhook fires
- PASS 109: an enterprise-tier workspace can run any paid tool without any bundle
- PASS 110: daily logger writes structured errors and separates UTC days
- PASS 111: a non-admin is blocked from the escrow overview
- PASS 112: an ecosystem admin sees correctly aggregated totals across multiple workspaces
- PASS 113: a refund is refused before a dispute exists, even with held funds
- PASS 114: a refund is refused with no held funding, even once disputed
- PASS 115: a mocked fund -> dispute -> refund lifecycle only marks refunded after webhook confirmation
- PASS 116: a failed refund API call marks refund_failed, never refunded
- PASS 117: with no provider configured, funding is refused rather than faked
- PASS 118: release is refused before a milestone is funded, even once approved
- PASS 119: a mocked fund -> webhook hold -> release lifecycle marks funding released only after real confirmation
- PASS 120: with no historical data, the estimate is honestly unavailable rather than invented
- PASS 121: once enough real jobs exist in a category, the estimate reflects their actual budgets
- PASS 122: smart tags narrow the estimate to a more specific match within a broad category
- PASS 123: too few tag matches falls back to category-wide history with an honest note, not a fabricated tag estimate
- PASS 124: an invalid category is rejected, matching job-posting validation
- PASS 125: a client can grant a scoped, revocable context package to the engaged expert, who can resolve it until revoked
- PASS 126: a package cannot reference an object outside the workspace
- PASS 127: a non-expert cannot create a job watch
- PASS 128: an expert job watch finds a new matching job by category and does not duplicate on re-scan
- PASS 129: a watch can be deleted
- PASS 130: booking: an expert publishes availability and a client books it
- PASS 131: expert teams: a lead creates a team, adds a member, and only the lead can manage it
- PASS 132: expert teams: a team led by the engaged freelancer can be assigned to their project as a unit
- PASS 133: AI-human handoff: the Companion agent automatically raises a handoff for a regulated-sounding message
- PASS 134: AI-human handoff: an agent-raised handoff can be accepted and completed by an expert
- PASS 135: EX-02: an unrelated account with no expert profile cannot see, accept or decline an unassigned handoff
- PASS 136: return-to-OS: an outcome can be recorded once per project and read back from the workspace feed
- PASS 137: governance: a jurisdiction rule forces a scoping case to red, and the review queue can be claimed
- PASS 138: field guidance exposes Explain, Example, Suggest and Help-me-decide for an empty field
- PASS 139: field guidance returns no suggestion once a field is already filled
- PASS 140: an unknown field or a stranger is rejected
- PASS 141: an HTML upload is rejected outright, regardless of the declared filename
- PASS 142: SVG and other markup/script-capable declared types are rejected
- PASS 143: a text/plain upload whose content is actually markup is rejected even though the extension looks safe
- PASS 144: a declared type whose bytes do not match its signature is rejected
- PASS 145: a genuine allow-listed file is accepted and always served as an attachment, never inline
- PASS 146: member permissions and suspension stay inside the selected enterprise
- PASS 147: completed objectives and mismatched workspace requests reject new work
- PASS 148: charges replay atomically and exports include all workspace domains and audit history
- PASS 149: populated account deletion preserves other accounts and their point ledger
- PASS 150: enterprise capacity survives restart and descriptive context never changes tier
- PASS 151: knowledge is tenant scoped, versioned, searchable, exportable and deletable
- PASS 152: open opportunities exclude samples and bidders can recover their own bid and draft
- PASS 153: converts using the stored indicative rate, for display only
- PASS 154: same-currency conversion is a no-op rate of 1
- PASS 155: an unknown currency pair returns 404 rather than inventing a rate
- PASS 156: only a workspace owner can update an FX rate
- PASS 157: pathways fit goal families and keep success and constraints visible
- PASS 158: suggestion notes remain within action limits for maximum length inputs
- PASS 159: a new goal starts at the "captured" lifecycle stage with no subscriptions
- PASS 160: goal lifecycle stage only moves through allowed transitions, and terminal stages are final
- PASS 161: a goal subscription can be created, listed and removed
- PASS 162: the goal advisor requires an objectiveId before charging points, and assists once given one
- PASS 163: a KPI can be defined, observed, listed and deleted
- PASS 164: an opportunity can be created, updated through its pipeline, and deleted
- PASS 165: an experiment moves through draft -> running -> complete and rejects out-of-order transitions
- PASS 166: performance-analytics reports real KPI data, not just generic records
- PASS 167: opportunity-signals reports real pipeline data
- PASS 168: experiment-builder persists a real draft experiment instead of returning prose only
- PASS 169: a fresh intelligence result is readable by another engine, and an expired one is not
- PASS 170: two agents reaching different conclusions about the same subject raises a conflict for a human to resolve
- PASS 171: a stranger cannot read or resolve another workspace's intelligence results
- PASS 172: inviting, accepting, then creating a project without ever submitting a bid
- PASS 173: rejecting an invitation still leaves project creation blocked without a real bid
- PASS 174: only the job owner can invite; only the invited freelancer can respond; duplicates are rejected
- PASS 175: an accepted/rejected invitation shows up in both parties' activity feeds
- PASS 176: a file can be uploaded, fetched back byte-for-byte, and deleted
- PASS 177: an empty or invalid upload is rejected
- PASS 178: a KYC case moves from pending to verified with attached evidence, and only an admin can decide it
- PASS 179: production signup issues no secrets, grants exactly the welcome reward once after OTP, and retains login without OTP
- PASS 180: same signed device gets no second reward; shared-network velocity waits for review
- PASS 181: OTP expires, locks after five wrong guesses, resends rotate both code and link
- PASS 182: production recovery mail resets password once and revokes existing sessions
- PASS 183: Companion enforces verification, workspace opt-in and consent, with one provider call for concurrent retries
- PASS 184: revocation during a provider request rejects the late result and refunds once
- PASS 185: scheduler lease transfers to a replacement owner and stale agent charges refund once
- PASS 186: production startup requires secure deploy configuration
- PASS 187: a learning path can be created with modules, discovered by taxonomy, and completed module by module
- PASS 188: prerequisites block enrollment until the required path is completed
- PASS 189: assigning a path sets an enrollment on behalf of someone else, with a due date
- PASS 190: a paid path charges points on enrollment and appears in the billables list
- PASS 191: compliance requirements are visible to workspace members and gated to admins to create
- PASS 192: attention distinguishes a stalled enrollment from one that needs you soon
- PASS 193: mail outbox enqueues, decrypts, delivers message, and records logs
- PASS 194: mail outbox captures retry attempts and logs structured delivery errors on failure
- PASS 195: both project parties can post and read messages, in order
- PASS 196: a stranger cannot read or post to a project they are not party to
- PASS 197: the model registry is seeded with approved companion use cases
- PASS 198: companion agent evidence records which registry entry authorized the call
- PASS 199: deprecating a use case blocks the agent instead of silently proceeding
- PASS 200: an outcome can be recorded against a real subject with an honest attribution strength, and listed
- PASS 201: an invalid attribution strength is rejected rather than silently defaulting to a stronger claim
- PASS 202: linking an outcome to a nonexistent recommendation in this workspace is rejected
- PASS 203: an outcome cannot be recorded against a subject that does not exist in the workspace
- PASS 204: a subject belonging to a different workspace cannot be attributed to
- PASS 205: "verified_causal" cannot be asserted as bare caller input, even against a real subject
- PASS 206: "verified_causal" is accepted once backed by a completed recommendation, but not a merely-proposed one
- PASS 207: PAY-01: a provider failure during /fund leaves a reconcilable record instead of nothing at all, and a retry is allowed
- PASS 208: PAY-01: /points/purchase persists the purchase before dispatch, and marks it init_failed rather than losing it on provider failure
- PASS 209: PAY-02: a webhook reporting the wrong amount for a milestone funding is not credited as held
- PASS 210: PAY-02: a webhook reporting the wrong amount for a points purchase does not credit any points
- PASS 211: PAY-02: a definite (4xx) rejection on /release frees the milestone for retry; an ambiguous (5xx) one does not
- PASS 212: with no payment provider configured, accounts record inertly and release never fakes success
- PASS 213: crypto/USDT provider is registered but returns unimplemented for release
- PASS 214: a mocked Paystack happy path: recipient, transfer, then webhook confirms payment
- PASS 215: webhook rejects an invalid signature
- PASS 216: only the milestone client can release payment
- PASS 217: no active concierge means nothing to pay out
- PASS 218: unconfigured provider refuses payout rather than faking success
- PASS 219: a mocked Paystack payout marks only the unpaid pm_fee line items paid, leaving ecosystem_fee untouched
- PASS 220: with no provider configured, purchase is refused rather than faked
- PASS 221: a mocked Paystack checkout, confirmed by webhook, credits exactly the right points once
- PASS 222: billables list every registered tool/engine with its points cost and the points unit price
- PASS 223: a non-admin cannot create, list, or manage bundles
- PASS 224: an admin can create a bundle from real tools, publish it, and it becomes purchasable
- PASS 225: creating a bundle with an unknown tool id is rejected
- PASS 226: an admin can delete a bundle
- PASS 227: the full milestone lifecycle: project, milestone, deliverable, submission, verification, approval
- PASS 228: only the assigned freelancer can submit, and only the client can decide
- PASS 229: a project cannot be created assigning a freelancer with no bid on the job
- PASS 230: disputing a milestone opens a dispute record and moves the milestone to disputed
- PASS 231: the invoice generator only invoices approved milestones, with an exact deterministic amount
- PASS 232: a shared database rate-limit bucket caps the same key across two separate app instances (simulated cluster workers)
- PASS 233: per-account spend limiting tracks independent keys — one user hitting their cap does not affect another
- PASS 234: the window resets after it elapses, and Retry-After is set on a 429
- PASS 235: readiness bounds waiting and shares pending database work across callers
- PASS 236: goal-advisor creates a trackable recommendation when it suggests a stage move, and it can be accepted
- PASS 237: changing a goal stage invalidates stale intelligence results and open recommendations for it (Change Impact Analyzer)
- PASS 238: a review can only be submitted by a real party on an approved milestone, and not twice
- PASS 239: an out-of-range rating is rejected
- PASS 240: a restricted conflict disclosure removes an expert from matching results
- PASS 241: an expert can declare review availability, and claiming computes a real SLA from it
- PASS 242: a reviewer with no declared response window gets no fabricated SLA
- PASS 243: the consolidated migration creates all domain tables
- PASS 244: domain tables enforce foreign-key integrity
- PASS 245: domain tables support a basic insert/select roundtrip
- PASS 246: a scoping case accumulates a version per save, each snapshot distinct and attributed
- PASS 247: a scoping case can start from only an objective, with no scope known yet
- PASS 248: a regulated-sounding objective is flagged red even with everything else filled in
- PASS 249: a fully-specified, non-regulated case becomes green after PATCH
- PASS 250: suggest returns editable suggestions without changing the stored case
- PASS 251: a red-band case cannot publish on self-confirmation alone — it requires a real completed review bound to the current version, and only over a job the user owns
- PASS 252: a material edit after a completed review invalidates that review for publishing
- PASS 253: a job posted directly (skipping the guided scoping pre-flow) is still risk-gated
- PASS 254: SEC-01: a normal login without MFA enrolled works exactly as before
- PASS 255: SEC-01: enrollment requires the correct TOTP code to confirm, then issues one-time recovery codes
- PASS 256: SEC-01: once enrolled, login halts on a step-up challenge instead of issuing a session, and a wrong code is rejected
- PASS 257: SEC-01: a recovery code can complete step-up exactly once
- PASS 258: SEC-01: disabling MFA requires the account password and restores normal login
- PASS 259: SEC-01 step-up: an ecosystem admin with MFA enrolled cannot grant a workspace tier without a valid code
- PASS 260: SEC-02: points_ledger rows cannot be deleted or updated outside an admin account purge
- PASS 261: SEC-02: audit rows cannot be deleted or updated outside an admin account purge
- PASS 262: SEC-02: an ecosystem-admin-initiated account deletion physically purges the ledger and audit trail
- PASS 263: SEC-02: only an ecosystem admin can delete a user account
- PASS 264: SEC-03: a webhook with an invalid signature is rejected outright
- PASS 265: SEC-03: a signed webhook decides exactly the case its reference was issued for, by reference — not by a client-suppliable case id
- PASS 266: SEC-03: a webhook whose reference matches no pending case changes nothing
- PASS 267: SEC-03: replaying the exact same webhook event is deduplicated and cannot flip a case twice
- PASS 268: SEC-03: a webhook cannot re-decide a case that a human admin already decided
- PASS 269: SEC-03: with no KYC provider configured, the webhook is inert rather than silently accepting anything
- PASS 270: mass assignment cannot credit or alter points balance on job/bid/companion requests
- PASS 271: concurrent requests cannot drive the points balance negative (race-condition double spend)
- PASS 272: idempotency key replays the cached result instead of double-charging, and a new key charges again
- PASS 273: the companion agent endpoint replays cached results under the same idempotency key
- PASS 274: a mismatched idempotency-key replay with different input is rejected, not silently accepted
- PASS 275: cross-tenant workspace tampering is rejected before any charge occurs
- PASS 276: the dedicated spend rate limiter enforces a per-account ceiling on points-spending routes
- PASS 277: a jobs subscription scan finds an open job posted after it was created, and re-scanning does not duplicate it
- PASS 278: a subscription to an unsupported signal class reports it honestly instead of fabricating matches
- PASS 279: a training subscription with free-only and language constraints does not match a paid path in another language
- PASS 280: a jobs subscription with a budget ceiling does not match a job priced above it
- PASS 281: a stranger cannot scan or list matches on a subscription they do not own
- PASS 282: two clients cannot both approve the same milestone twice (double-decision race)
- PASS 283: five concurrent bids on the same job are all accepted without corrupting job state
- PASS 284: a request body at exactly the JSON size limit is accepted; over the limit is rejected, not crashed
- PASS 285: tampering with the session cookie is rejected, not treated as a valid session
- PASS 286: a session for a disabled account is rejected on the next request
- PASS 287: ten concurrent Companion messages from the same user never over-deduct points below zero
- PASS 288: full job-to-invoice lifecycle succeeds for every job category
- PASS 289: Companion routes every documented phrase to the correct agent (Shared, Clarity, Capability, Growth, Consistency engines)
- PASS 290: a workspace member is blocked from the Consistency engine (workflow-orchestration, band A2)
- PASS 291: boundary and adversarial inputs do not crash the server (500) — they get a clean 4xx
- PASS 292: a profile can be created and re-saved (upsert)
- PASS 293: Expert Finder ranks a matching profile above a non-matching one
- PASS 294: skills assessments are graded deterministically, and a bogus skill 404s
- PASS 295: vetting requires an ecosystem admin decision; a non-admin cannot approve
- PASS 296: Candidate Screening blends bid score, assessment, vetting, and track record — and only the job owner can view it
- PASS 297: candidate-matches compares freelancer profiles against a project, including non-bidders; only the owner can view it
- PASS 298: job-matches ranks open jobs by fit to the freelancer's own profile
- PASS 299: lost completion recovers without another charge; pagination and cancellation preserve ownership
- PASS 300: a task can be created, listed, updated and deleted by either party
- PASS 301: overdue and blocked tasks surface in the attention feed; done tasks never do
- PASS 302: a change request can be opened by either party and decided only by the project owner
- PASS 303: a project can only be closed once every milestone is fully paid, and only then issues a certificate
- PASS 304: Manufacturing — production line efficiency audit
- PASS 305: Wedding & marriage planning — full-service coordination
- PASS 306: Software engineering — SaaS analytics dashboard build
- PASS 307: Marketing & growth — DTC skincare launch campaign
- PASS 308: Legal & compliance — healthcare data-handling policy review
- PASS 309: acceptance report summary
- PASS 310: prose, negation and malformed output never become positive verdicts
- PASS 311: only explicit validated verdicts are accepted
- PASS 312: human workflow rules block writes and allow only explicitly authorized workflow steps
- PASS 313: workflow changes wait for exact versioned approval and execute once
- PASS 314: workflow authority is bounded by principal, tenant, schedule, pause and expiry
- PASS 315: failed workflow tool mutation rolls back and can be retried only within its budget
- PASS 316: unfinished authorized work survives reopening the database without repeating completed steps
- PASS 317: a workflow can only be deleted once it has actually finished, and only by its own authorizing owner
