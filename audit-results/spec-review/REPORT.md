# LAMID ONE specification-to-code audit

The repository implements a substantial application, but it does **not yet implement the complete eight-document architecture or satisfy its production acceptance gates**. The largest gaps concern human-controlled continuity, shared intelligence/evidence, expert authorization, safe payment recovery, secure uploads, enterprise governance and operational proof.

This review read all **8 documents / 12,021 lines**, compared their requirements with the frozen repository, and produced 42 consolidated findings (3 P0, 35 P1, 4 P2). Finding count is not a completion percentage. Several requirements are phased, descriptive, historical or require external evidence; they are not all first-release blockers.

## Scope and evidence discipline

**Historical baseline:** subsequent code changes are not automatically covered by this report. The [context-transfer addendum](context-transfer-addendum.md) credits a later implementation and its two passing tests. For the newer request about working tools, use the separately captured working-tools manifest and test results; do not treat a historical gap as proof that a later implementation still has it.

Baseline: **2026-09-24T03:40:32.890Z**, HEAD **8bc2fbede7df45d3ae2b4897691b82ca3c965bd0**, including the dirty/untracked application files listed in [manifest.json](manifest.json). This is not simply a clean-commit audit. Snapshot code is preserved under [data/spec-review-snapshot/code](../../data/spec-review-snapshot/code). 28 captured files differ or are removed in the working tree at report generation; see [delta](working-tree-delta.json). Findings apply to the frozen snapshot and require revalidation against changed code. New files added after the snapshot are not assessed.

Document instructions were treated as requirements to compare, not commands to execute. No production configuration, customer data, money transfer, deployment or product source was changed by this audit. Synthetic tests used a local disposable PostgreSQL schema and no live AI/payment/email provider. No internet research was necessary for comparing supplied specifications with local code.

**Meaning of labels:** Reproduced = observed with synthetic requests; Static = a concrete code path demonstrates a gap/risk, without runtime reproduction; Partial = useful implementation falls short of the full contract; Missing contract = not represented in the inspected schema/services/routes; External evidence required = cannot be decided from repository contents. P0 denotes a release-blocking security/payment boundary in this assessment, not a claim of actual exploitation or loss. P1 is core correctness/acceptance work; P2 is experience/documentation work. These audit priorities do not override the suite’s contracted severity process.

The [coverage matrix](coverage.md) and [exact source-line ledger](source-line-ledger.jsonl) account for every source line. They map lines to reviewed topics and evidence-backed findings; they do not pretend that 12,021 source lines equal 12,021 independent test assertions or that every application code line received exhaustive security review.

## What is already implemented

- AI Settings is visible in the user sidebar; source-kind/feature/points controls and workflow block/ask/allow choices exist. External AI calls have consent/policy checks and bounded usage. See F-AU-01.
- Users can create, edit and delete goals; the goal API has lifecycle stages and subscriptions. Goal stage changes invalidate direct results. Edit/delete propagation remains incomplete. See F-SI-02.
- Workflows are persisted and executed with locking, principal and policy rechecks, approval-version binding, pause/cancel/expiry and bounded retry. See F-WF-01.
- Commercial projects, tasks, deliverables, criteria, submissions, human approvals/disputes, funding and transfer records exist. Payment signatures, deduplication and an atomic release claim are valuable existing controls. See F-COMM-01 and F-PAY-01/02.
- Expert profiles/taxonomy, credential records, matching, watches, teams, availability, scoping drafts/guidance/versions and reviewer queues exist. Explicit expert packages enforce the named recipient and revocation. See F-EX-01/03/04 and F-SC-03.
- Learning paths, enrollment/prerequisites, progress/certificates, KPI observations, experiments, recommendations and outcomes have real persistence. Their evidence and continuity contracts need strengthening.
- Canonical colors, reduced-motion handling, restrained transitions and orbit fallback/settling controls exist. Existing public copy is largely preserved.

## Highest-priority corrections

1. Close cross-account handoff read/decline and qualified-review disclosure boundaries (F-EX-02, F-SC-02).
2. Prevent retries of unknown-outcome payments until provider reconciliation; persist dispatch references first (F-PAY-01/02).
3. Add secure upload quarantine/type/scanning/download controls (F-FILE-01).
4. Enforce red-band qualified review; stop self-asserted verified-causal evidence and untrusted assessment mastery (F-SC-01, F-SI-03, F-LEARN-01).
5. Preserve consequential audit/ledger history and add privileged assurance/step-up (F-SEC-01/02).
6. Make goal constraints, source permissions, lifecycle invalidation and return-state real end-to-end behavior (F-SI-01/02/04/05/06, F-AU-01, F-CORE-02).

## Tests performed for this audit

[Focused regression log](focused-tests-executed.log): **29 passed, 0 failed, 0 skipped** across intelligence, signals, goals, scoping, field guidance, reviewer SLA, scope versions, recommendations, attribution and expert context packages. The initial sandbox launch failed with spawn EPERM before tests executed; that environment failure is kept separately in focused-tests.log. It is not counted as a product test failure.

| Boundary probe | HTTP / observation |
|---|---|
| Unrelated account without expert profile reads unassigned handoff | 200; observed=true |
| Unrelated account declines another workspace handoff | 200; observed=true |
| HTML MIME accepted without quarantine | 201; observed=true |
| Uploaded HTML served inline on application origin | 200; observed=true; text/html |
| Free-only language-constrained subscription matches paid unrelated-language learning | 200; observed=true |
| Verified causal outcome accepted without evidence or existing subject | 201; observed=true |

The six observations above reproduce four defect categories, not six independent suites. [Probe source](boundary-probes.mjs) and [results](boundary-probes-results.json) are retained. The HTML sample was inert; no script exploit or malware execution was attempted. The financial timeout/claim races were inspected statically, not exercised against a live provider.

This was **not another full-suite run**. Earlier full-suite results in [2026-09-23-run2](../2026-09-23-run2/results.json) apply to that earlier code state and retain their failures. They are not superseded by 29 passing focused tests. Browser/a11y/manual visual checks, live AI evaluations, staging SLOs, backup restore and external security review were not performed in this audit.

## Document-by-document assessment

| Document | Lines | Principal assessment |
|---|---|---|
| [CAN:1](../../data/spec-review-snapshot/documents/CAN.md#L1) | 1986 | Core doctrine partially implemented; authority, interoperability and security gaps. |
| [INT:1](../../data/spec-review-snapshot/documents/INT.md#L1) | 191 | Foundational CRUD exists; continuity, relevance, lineage and evidence semantics incomplete. |
| [EXP:1](../../data/spec-review-snapshot/documents/EXP.md#L1) | 98 | Expert records exist; qualification, confidentiality and delegated engagement gaps. |
| [AGT:1](../../data/spec-review-snapshot/documents/AGT.md#L1) | 1110 | Real calculators/runtime exist; canonical role/tool contracts and registry mapping incomplete. |
| [ENT:1](../../data/spec-review-snapshot/documents/ENT.md#L1) | 3219 | Partial application implementation; enterprise/security/operations acceptance unproven. |
| [DEL:1](../../data/spec-review-snapshot/documents/DEL.md#L1) | 1948 | Delivery/acceptance obligations substantially unfulfilled or require external evidence. |
| [BRAND:1](../../data/spec-review-snapshot/documents/BRAND.md#L1) | 603 | Palette/motion foundations exist; stillness/attention/manual acceptance incomplete. |
| [COPY:1](../../data/spec-review-snapshot/documents/COPY.md#L1) | 2866 | 99 content entries; 13 planned OS route fallbacks; four expert page consolidations. |

## Inventory and traceability artifacts

- [Every source-line/topic mapping](coverage.md) and [machine-readable line ledger](source-line-ledger.jsonl).
- [202 canonical capabilities](capabilities-202.md), preserving Foundation/Expansion and named requirements. Related legacy functionality is not certified equivalence.
- [30 canonical agent roles](agents-30.md), compared with the 31 runtime manifests.
- [40 mandatory security acceptance cases](security-40.md), explicitly distinguishing controls from executed tests.
- [32 EX/SI/PS extension delivery packages](extension-delivery.md).
- [103-page route/copy inventory](route-audit.md) and [raw route data](route-audit.json).
- [Runtime inventory](runtime-inventory.json), [snapshot hashes](manifest.json), [working-tree delta](working-tree-delta.json).

## Route gaps

These 13 specified OS URLs fall through to PlannedModule in App.tsx:

- `/os/business`
- `/os/opportunities`
- `/os/organization`
- `/os/teams`
- `/os/organization/rhythm`
- `/os/analytics`
- `/os/integrations`
- `/os/profile`
- `/os/settings/privacy`
- `/os/notifications`
- `/os/settings/workspace`
- `/os/settings/billing`
- `/os/settings/plan`

Some controls exist elsewhere: notifications at /os/settings/notifications, privacy/export within other settings flows, and commercial billing/finance routes. The finding concerns the prescribed destination and complete flow, not an assertion that no related implementation exists. Expert pages 100–103 are consolidated into /experts; the content test explicitly treats that consolidation as acceptable, while the supplied 103-page specification still presents them separately. Resolve this as a documented route/product decision rather than silently changing the acceptance count.

## Detailed findings

<a id="f-ex-02"></a>

### F-EX-02 — Unassigned expert handoffs cross the account boundary

**P0 · Reproduced**

Requirement: [ENT:3000](../../data/spec-review-snapshot/documents/ENT.md#L3000), [ENT:3046](../../data/spec-review-snapshot/documents/ENT.md#L3046), [CAN:1739](../../data/spec-review-snapshot/documents/CAN.md#L1739), [DEL:1859](../../data/spec-review-snapshot/documents/DEL.md#L1859).

Code evidence: [src/app/handoff.mjs:65](../../data/spec-review-snapshot/code/src/app/handoff.mjs#L65), [src/app/handoff.mjs:91](../../data/spec-review-snapshot/code/src/app/handoff.mjs#L91), [src/app/agents.mjs:1129](../../data/spec-review-snapshot/code/src/app/agents.mjs#L1129).

An unrelated signed-in account with no expert profile received another workspace’s unassigned context snapshot and declined its handoff (both HTTP 200). The inbox filters only pending/unassigned or assigned-to-me; decline has no ownership, target, or workspace check. Agent-created handoffs can contain the user message and response.

**Needed:** Enforce eligible reviewer/recipient access, consent-scoped context projection, and authorized atomic claim/decline transitions. Add negative tests for unrelated users, unqualified experts, and revoked access.

<a id="f-pay-01"></a>

### F-PAY-01 — Ambiguous transfer failures can reopen a paid-out operation for retry

**P0 · Static**

Requirement: [ENT:1179](../../data/spec-review-snapshot/documents/ENT.md#L1179), [ENT:1797](../../data/spec-review-snapshot/documents/ENT.md#L1797), [ENT:2699](../../data/spec-review-snapshot/documents/ENT.md#L2699), [DEL:514](../../data/spec-review-snapshot/documents/DEL.md#L514).

Code evidence: [src/app/payments.mjs:343](../../data/spec-review-snapshot/code/src/app/payments.mjs#L343), [src/app/payments.mjs:432](../../data/spec-review-snapshot/code/src/app/payments.mjs#L432), [src/app/payments.mjs:7](../../data/spec-review-snapshot/code/src/app/payments.mjs#L7).

Release has an atomic approved-to-releasing claim, which prevents ordinary concurrent release. However, the catch path treats every provider exception as failure and resets the milestone to approved. A transport failure can occur after the provider accepted payment. A later attempt creates a new reference. Provider fetches also lack an explicit deadline. This is a static failure-path finding, not a reproduced double payout.

**Needed:** Persist a stable provider reference before dispatch; distinguish rejected from unknown outcome; reconcile unknown and interrupted transfers before allowing retry; set request deadlines and test acceptance-followed-by-timeout and crash windows.

<a id="f-file-01"></a>

### F-FILE-01 — Uploads bypass the specified content-security lifecycle

**P0 · Reproduced**

Requirement: [ENT:1713](../../data/spec-review-snapshot/documents/ENT.md#L1713), [ENT:1726](../../data/spec-review-snapshot/documents/ENT.md#L1726), [ENT:2688](../../data/spec-review-snapshot/documents/ENT.md#L2688), [ENT:2689](../../data/spec-review-snapshot/documents/ENT.md#L2689), [CAN:862](../../data/spec-review-snapshot/documents/CAN.md#L862).

Code evidence: [src/app/files.mjs:1](../../data/spec-review-snapshot/code/src/app/files.mjs#L1), [src/app/files.mjs:50](../../data/spec-review-snapshot/code/src/app/files.mjs#L50).

An inert HTML file was accepted with HTTP 201 and downloaded as text/html with inline Content-Disposition on the application origin. The handler trusts the supplied MIME type and stores bytes directly; no format detection, quarantine, or malware scanning step exists. This demonstrates unsafe format handling, not a successful script exploit. Existing CSP may constrain execution.

**Needed:** Introduce a pending/quarantined/clean/rejected lifecycle, byte-based type checks and processing limits, malware scanning, authorized private downloads and safe attachment handling. Use synthetic scanner fixtures, never live malware.

<a id="f-sc-01"></a>

### F-SC-01 — Red scoping can proceed without the required qualified review

**P1 · Static**

Requirement: [INT:140](../../data/spec-review-snapshot/documents/INT.md#L140), [CAN:1923](../../data/spec-review-snapshot/documents/CAN.md#L1923), [DEL:1925](../../data/spec-review-snapshot/documents/DEL.md#L1925).

Code evidence: [src/app/scoping.mjs:130](../../data/spec-review-snapshot/code/src/app/scoping.mjs#L130), [src/app/scoping.mjs:370](../../data/spec-review-snapshot/code/src/app/scoping.mjs#L370), [src/app/app.mjs:675](../../data/spec-review-snapshot/code/src/app/app.mjs#L675).

Red-band publication accepts a user confirmation flag without requiring a completed qualified review. Quick posting has a similar riskConfirmed escape. Risk detection relies on a small text/jurisdiction check and does not cover all scope fields. Confirmation is not the red-band review gate specified by the documents.

**Needed:** Separate acknowledgement from approval; require current qualified review where red policy demands it, bind approval to scope version, and invalidate approval after material edits.

<a id="f-sc-02"></a>

### F-SC-02 — Scoping reviewer selection is neither qualification-gated nor atomic

**P1 · Static**

Requirement: [EXP:65](../../data/spec-review-snapshot/documents/EXP.md#L65), [ENT:3184](../../data/spec-review-snapshot/documents/ENT.md#L3184), [DEL:1931](../../data/spec-review-snapshot/documents/DEL.md#L1931).

Code evidence: [src/app/scoping.mjs:457](../../data/spec-review-snapshot/code/src/app/scoping.mjs#L457), [src/app/scoping.mjs:471](../../data/spec-review-snapshot/code/src/app/scoping.mjs#L471).

Any talent profile can see the pending queue’s objective/category/jurisdiction and claim a case. These handlers do not check licensing, credential expiry, jurisdiction eligibility, conflicts, or availability. Claim reads state then updates without a compare-and-swap/row lock, permitting a concurrent claim race. No race reproduction was performed.

**Needed:** Filter before disclosure; bind qualification and consent to review assignment; claim atomically; publish a realistic queue ETA and add reassignment/escalation for expired claims.

<a id="f-sc-03"></a>

### F-SC-03 — Guided scoping lacks reviewer proposals and user reconciliation

**P1 · Partial**

Requirement: [INT:116](../../data/spec-review-snapshot/documents/INT.md#L116), [INT:150](../../data/spec-review-snapshot/documents/INT.md#L150), [CAN:1909](../../data/spec-review-snapshot/documents/CAN.md#L1909), [ENT:3194](../../data/spec-review-snapshot/documents/ENT.md#L3194).

Code evidence: [src/app/scoping.mjs:41](../../data/spec-review-snapshot/code/src/app/scoping.mjs#L41), [src/app/scoping.mjs:165](../../data/spec-review-snapshot/code/src/app/scoping.mjs#L165), [src/app/scoping.mjs:334](../../data/spec-review-snapshot/code/src/app/scoping.mjs#L334), [src/app/scoping.mjs:497](../../data/spec-review-snapshot/code/src/app/scoping.mjs#L497).

Quick drafting, unknown fields, four guidance responses, saved user versions, and a review queue exist. Many suggestions are static templates or null. Review completion stores notes/status, not proposed field changes with reviewer provenance, version diff, user acceptance/rejection, and reconciled scope. Response-hour data is optional, with no monitored SLA worker.

**Needed:** Persist suggested field changes as proposals; show provenance and a diff; let the user reconcile each change; implement deadline monitoring and absence/escalation states.

<a id="f-sc-04"></a>

### F-SC-04 — Budget guidance combines incompatible currencies

**P1 · Static**

Requirement: [CAN:1909](../../data/spec-review-snapshot/documents/CAN.md#L1909), [BRAND:562](../../data/spec-review-snapshot/documents/BRAND.md#L562), [ENT:3194](../../data/spec-review-snapshot/documents/ENT.md#L3194).

Code evidence: [src/app/scoping.mjs:323](../../data/spec-review-snapshot/code/src/app/scoping.mjs#L323).

The category budget average reads job budget values without filtering or converting currencies or selecting comparable completed work, then labels the answer USD. It cannot support the advertised grounded estimate.

**Needed:** Use comparable evidence with explicit original currency, dated FX conversion where appropriate, sample size, range, freshness and uncertainty; decline to estimate with insufficient evidence.

<a id="f-sc-05"></a>

### F-SC-05 — The scoping UI does not restore saved cases and publication crosses two requests

**P1 · Static**

Requirement: [CAN:1931](../../data/spec-review-snapshot/documents/CAN.md#L1931), [INT:154](../../data/spec-review-snapshot/documents/INT.md#L154), [DEL:1918](../../data/spec-review-snapshot/documents/DEL.md#L1918), [DEL:1922](../../data/spec-review-snapshot/documents/DEL.md#L1922).

Code evidence: [src/products/scoping/hooks/useScopingPage.ts:46](../../data/spec-review-snapshot/code/src/products/scoping/hooks/useScopingPage.ts#L46), [src/products/scoping/hooks/useScopingPage.ts:156](../../data/spec-review-snapshot/code/src/products/scoping/hooks/useScopingPage.ts#L156).

The hook starts with a null case and loads options/admin jurisdiction rules, but does not load a saved case or review on return. Data remains in the database, yet the wizard has no resume path here. Publication first creates a job, then marks the case published in another request, so a failure can leave the job created with an unpublished case. The first request omits riskConfirmed, so regulated jobs can be rejected before the later case confirmation is sent.

**Needed:** Add stable case URLs and saved-case/review restoration; preserve shared draft data across quick/guided modes; publish through an idempotent server transition that enforces review policy and links the created job atomically.

<a id="f-si-01"></a>

### F-SI-01 — The shared result fabric is a latest-result cache, not the specified result graph

**P1 · Partial**

Requirement: [INT:68](../../data/spec-review-snapshot/documents/INT.md#L68), [INT:88](../../data/spec-review-snapshot/documents/INT.md#L88), [CAN:1789](../../data/spec-review-snapshot/documents/CAN.md#L1789), [CAN:1811](../../data/spec-review-snapshot/documents/CAN.md#L1811), [ENT:3084](../../data/spec-review-snapshot/documents/ENT.md#L3084).

Code evidence: [src/app/intelligence.mjs:10](../../data/spec-review-snapshot/code/src/app/intelligence.mjs#L10), [src/app/intelligence.mjs:78](../../data/spec-review-snapshot/code/src/app/intelligence.mjs#L78), [src/app/agents.mjs:304](../../data/spec-review-snapshot/code/src/app/agents.mjs#L304).

Results are upserted per workspace/subject/agent, overwriting prior result content. The schema/envelope lacks source versions, complete lineage, purpose/permission envelope, typed reusable payloads, confidence/uncertainty and model/prompt provenance. Only performance-analytics and goal-advisor publish through this helper in the snapshot. No general cross-engine consumer contract or dependency graph is implemented.

**Needed:** Define versioned typed results and immutable source/version edges; enforce scope/purpose on production and consumption; migrate each producer and consumer with contract and privacy tests.

<a id="f-si-02"></a>

### F-SI-02 — Goal edits and deletion leave dependent intelligence and subscriptions behind

**P1 · Static**

Requirement: [INT:88](../../data/spec-review-snapshot/documents/INT.md#L88), [CAN:1829](../../data/spec-review-snapshot/documents/CAN.md#L1829), [DEL:1896](../../data/spec-review-snapshot/documents/DEL.md#L1896).

Code evidence: [src/app/goals.mjs:130](../../data/spec-review-snapshot/code/src/app/goals.mjs#L130), [src/app/app.mjs:1447](../../data/spec-review-snapshot/code/src/app/app.mjs#L1447), [src/app/app.mjs:1502](../../data/spec-review-snapshot/code/src/app/app.mjs#L1502), [src/app/signals.mjs:105](../../data/spec-review-snapshot/code/src/app/signals.mjs#L105).

Goal stage transitions invalidate direct results and recommendations. Ordinary objective edits do not call that invalidation; deletion soft-deletes the objective/actions and cancels workflows but does not remove subscriptions or invalidate intelligence/recommendations. Scanning checks the subscription without revalidating a live goal. Objective editing also checks a version before a non-CAS write, leaving a race window.

**Needed:** Use one transactional goal mutation service with optimistic concurrency and change events; cascade dependency invalidation, disable deleted/completed-goal monitoring, and show stale/degraded results rather than silently reusing or hiding them.

<a id="f-si-03"></a>

### F-SI-03 — Causal certainty is accepted as an unsupported user assertion

**P1 · Reproduced**

Requirement: [CAN:1865](../../data/spec-review-snapshot/documents/CAN.md#L1865), [INT:164](../../data/spec-review-snapshot/documents/INT.md#L164), [ENT:3150](../../data/spec-review-snapshot/documents/ENT.md#L3150).

Code evidence: [src/app/outcomeAttribution.mjs:11](../../data/spec-review-snapshot/code/src/app/outcomeAttribution.mjs#L11), [src/app/outcomeAttribution.mjs:42](../../data/spec-review-snapshot/code/src/app/outcomeAttribution.mjs#L42).

The API accepted verified_causal with an arbitrary nonexistent subject and no experiment/evidence (HTTP 201). The schema exposes causal strength as caller input without a verification gate.

**Needed:** Validate subject ownership/existence and evidence provenance; reserve verified causal status for an authorized evidence-backed transition; distinguish observation, contribution and causality in storage and UI.

<a id="f-si-04"></a>

### F-SI-04 — Goal monitoring ignores stored constraints and is not continuous

**P1 · Reproduced**

Requirement: [INT:96](../../data/spec-review-snapshot/documents/INT.md#L96), [CAN:1819](../../data/spec-review-snapshot/documents/CAN.md#L1819), [CAN:1847](../../data/spec-review-snapshot/documents/CAN.md#L1847), [DEL:1902](../../data/spec-review-snapshot/documents/DEL.md#L1902), [COPY:2607](../../data/spec-review-snapshot/documents/COPY.md#L2607).

Code evidence: [src/app/goals.mjs:62](../../data/spec-review-snapshot/code/src/app/goals.mjs#L62), [src/app/signals.mjs:11](../../data/spec-review-snapshot/code/src/app/signals.mjs#L11), [src/app/signals.mjs:73](../../data/spec-review-snapshot/code/src/app/signals.mjs#L73), [src/app/signals.mjs:105](../../data/spec-review-snapshot/code/src/app/signals.mjs#L105), [server/index.mjs:103](../../data/spec-review-snapshot/code/server/index.mjs#L103).

A free-only, zero-budget, language-constrained subscription matched a paid path in another language. Scanning uses signal class/date, not the goal text, budget, language, geography, time or attention policy. Only jobs, training/certifications, internal progress and experts have finders, each with small recent-record limits. Scans are endpoint-triggered; the server worker schedules workflows/reconciliation/mail, not goal subscriptions. Expert job watches are also manually scanned.

**Needed:** Build permissioned scheduled/event-driven monitoring; enforce all constraints, eligibility and readiness before ranking; explain match and why-now; deduplicate, expire and digest according to user attention settings.

<a id="f-si-05"></a>

### F-SI-05 — Conflict and recommendation states are not linked to execution and reconciliation

**P1 · Partial**

Requirement: [CAN:1839](../../data/spec-review-snapshot/documents/CAN.md#L1839), [CAN:1855](../../data/spec-review-snapshot/documents/CAN.md#L1855), [ENT:3118](../../data/spec-review-snapshot/documents/ENT.md#L3118).

Code evidence: [src/app/intelligence.mjs:151](../../data/spec-review-snapshot/code/src/app/intelligence.mjs#L151), [src/app/recommendations.mjs:8](../../data/spec-review-snapshot/code/src/app/recommendations.mjs#L8), [src/app/recommendations.mjs:35](../../data/spec-review-snapshot/code/src/app/recommendations.mjs#L35), [src/app/recommendations.mjs:80](../../data/spec-review-snapshot/code/src/app/recommendations.mjs#L80).

Conflict resolution stores a resolved flag and note without selecting/recomputing a reconciled result. Recommendation states exist, but scheduled_for is only read, there is no scheduling input or execution binding in the module, and state writes are not compare-and-swap. Invalidation includes completed recommendations despite the comment saying otherwise.

**Needed:** Bind decisions to result versions, sources and reconciled outputs; schedule actual owned work through the authorized runtime; enforce atomic transitions and preserve completed historical evidence.

<a id="f-si-06"></a>

### F-SI-06 — Context transfer, personal privacy and multi-person intelligence are incomplete

**P1 · Missing contract**

Requirement: [CAN:1873](../../data/spec-review-snapshot/documents/CAN.md#L1873), [CAN:1881](../../data/spec-review-snapshot/documents/CAN.md#L1881), [INT:90](../../data/spec-review-snapshot/documents/INT.md#L90), [ENT:3140](../../data/spec-review-snapshot/documents/ENT.md#L3140).

Code evidence: [src/app/agentSources.mjs:1](../../data/spec-review-snapshot/code/src/app/agentSources.mjs#L1), [src/app/knowledge.mjs:1](../../data/spec-review-snapshot/code/src/app/knowledge.mjs#L1), [src/app/expertContextPackage.mjs:8](../../data/spec-review-snapshot/code/src/app/expertContextPackage.mjs#L8), [src/app/people.mjs:1](../../data/spec-review-snapshot/code/src/app/people.mjs#L1).

Workspace records and explicit expert packages exist. The full typed seven-operation context-transfer contract, scenario isolation, per-purpose personal-to-organization consent, dependency propagation after revocation, and multi-person readiness/escalation model are not represented by these handlers/schema. A workspace-wide source-kind filter is not field-level personal-career confidentiality.

**Needed:** Implement typed transfer operations and per-object/field/purpose controls; cover copy/link/refresh/revoke semantics and personal-to-team leakage with negative tests.

<a id="f-ex-01"></a>

### F-EX-01 — Expert context packages enforce recipient/revocation but omit other required boundaries

**P1 · Partial**

Requirement: [CAN:1739](../../data/spec-review-snapshot/documents/CAN.md#L1739), [EXP:81](../../data/spec-review-snapshot/documents/EXP.md#L81), [ENT:3000](../../data/spec-review-snapshot/documents/ENT.md#L3000).

Code evidence: [src/app/expertContextPackage.mjs:8](../../data/spec-review-snapshot/code/src/app/expertContextPackage.mjs#L8), [src/app/expertContextPackage.mjs:83](../../data/spec-review-snapshot/code/src/app/expertContextPackage.mjs#L83).

Only the project client can grant supported objective/knowledge references, and resolving checks the designated expert and revoked state. Missing fields/guards include expiry, declared purpose, redaction, source version snapshot, current project-assignment recheck, and governed evidence return.

**Needed:** Retain the existing checks while adding expiry/purpose/redaction/version controls, assignment revalidation, read audit and approved evidence-return flow.

<a id="f-ex-03"></a>

### F-EX-03 — Expert ranking does not implement the eligibility and credibility contract

**P1 · Partial**

Requirement: [EXP:11](../../data/spec-review-snapshot/documents/EXP.md#L11), [CAN:1686](../../data/spec-review-snapshot/documents/CAN.md#L1686), [CAN:1727](../../data/spec-review-snapshot/documents/CAN.md#L1727), [ENT:3010](../../data/spec-review-snapshot/documents/ENT.md#L3010).

Code evidence: [src/app/talent.mjs:33](../../data/spec-review-snapshot/code/src/app/talent.mjs#L33), [src/app/talent.mjs:479](../../data/spec-review-snapshot/code/src/app/talent.mjs#L479), [src/app/expertiseTaxonomy.mjs:1](../../data/spec-review-snapshot/code/src/app/expertiseTaxonomy.mjs#L1), [src/app/reputation.mjs:39](../../data/spec-review-snapshot/code/src/app/reputation.mjs#L39).

Cross-domain taxonomy and multidimensional profiles exist. Ranking uses keyword/rate/verification/reputation signals; verified-credential counts ignore expiry. Credentials lack scoped licensing/jurisdiction and revoked/expired lifecycle. No immutable match-reason/version snapshot or demonstrated fairness evaluation exists. Reputation submission requires exactly approved milestone status, so paid milestones are excluded even though aggregate statistics count paid work.

**Needed:** Gate eligibility before scoring; verify scoped credentials and expiry/revocation; preserve match evidence; add contextual reputation, appeal/abuse controls and permit legitimate post-payment feedback.

<a id="f-ex-04"></a>

### F-EX-04 — Expert pods and booking are not a complete engagement model

**P1 · Partial**

Requirement: [CAN:1705](../../data/spec-review-snapshot/documents/CAN.md#L1705), [EXP:43](../../data/spec-review-snapshot/documents/EXP.md#L43), [ENT:3022](../../data/spec-review-snapshot/documents/ENT.md#L3022).

Code evidence: [src/app/expertTeams.mjs:1](../../data/spec-review-snapshot/code/src/app/expertTeams.mjs#L1), [src/app/projects.mjs:68](../../data/spec-review-snapshot/code/src/app/projects.mjs#L68), [src/app/booking.mjs:101](../../data/spec-review-snapshot/code/src/app/booking.mjs#L101), [server/store.mjs:659](../../data/spec-review-snapshot/code/server/store.mjs#L659).

Team membership/accessScope is stored, while project authorization still admits only client and one freelancer; pod members do not obtain the specified scoped work access. Booking selects an open slot before an unconditional update and has no unique active-slot constraint, leaving a double-booking race. projectId is accepted without proving the caller’s relationship to that project in the booking handler. These are static observations.

**Needed:** Implement per-engagement scoped delegation for pod roles; validate project association; atomically reserve slots with database-enforced uniqueness and test concurrent booking/cancellation.

<a id="f-au-01"></a>

### F-AU-01 — Human AI controls exist, but not all three independent progression lanes

**P1 · Partial**

Requirement: [CAN:21](../../data/spec-review-snapshot/documents/CAN.md#L21), [CAN:29](../../data/spec-review-snapshot/documents/CAN.md#L29), [AGT:133](../../data/spec-review-snapshot/documents/AGT.md#L133), [ENT:482](../../data/spec-review-snapshot/documents/ENT.md#L482).

Code evidence: [src/app/aiRules.mjs:18](../../data/spec-review-snapshot/code/src/app/aiRules.mjs#L18), [src/app/aiPolicy.mjs:1](../../data/spec-review-snapshot/code/src/app/aiPolicy.mjs#L1), [src/app/workflows.mjs:183](../../data/spec-review-snapshot/code/src/app/workflows.mjs#L183), [src/products/workspace/components/WorkspaceShell.tsx:65](../../data/spec-review-snapshot/code/src/products/workspace/components/WorkspaceShell.tsx#L65).

AI Settings is visible in the user sidebar. Users can control external AI, features, source kinds, points and instructions; three workflow writes support block/ask/allow. Scoped provider calls recheck policy before and after processing. The complete independent context/intelligence/execution lane grants with purpose, scope, expiry, delegated authority and immediate cross-service revocation are not modeled. Most feature toggles default enabled; deterministic result production is not comprehensively governed by external-AI consent.

**Needed:** Keep the existing settings; define independent grants for each lane and enforce them at every read, result production, scheduling and commitment boundary, with readable return-state and revocation tests.

<a id="f-au-02"></a>

### F-AU-02 — Organization authority stops at three workspace roles

**P1 · Partial**

Requirement: [ENT:471](../../data/spec-review-snapshot/documents/ENT.md#L471), [ENT:1516](../../data/spec-review-snapshot/documents/ENT.md#L1516), [ENT:1534](../../data/spec-review-snapshot/documents/ENT.md#L1534), [CAN:862](../../data/spec-review-snapshot/documents/CAN.md#L862).

Code evidence: [src/app/policy.mjs:1](../../data/spec-review-snapshot/code/src/app/policy.mjs#L1), [src/app/app.mjs:380](../../data/spec-review-snapshot/code/src/app/app.mjs#L380), [src/app/invitations.mjs:1](../../data/spec-review-snapshot/code/src/app/invitations.mjs#L1).

Owner/member/concierge permissions and live workspace membership checks are implemented. The specified organization/division/team/project hierarchy, inherited policies, richer RBAC/ABAC, enterprise SSO/SCIM and deprovisioning integration are absent from the inspected schema/route model. Separate expert-team rows do not provide organization policy inheritance.

**Needed:** Define organization hierarchy, scope-aware policy resolution and enterprise identity lifecycle; test inheritance conflicts, stale membership and revocation during work.

<a id="f-au-03"></a>

### F-AU-03 — Audience choice confers enterprise access

**P1 · Static**

Requirement: [CAN:1184](../../data/spec-review-snapshot/documents/CAN.md#L1184), [ENT:1516](../../data/spec-review-snapshot/documents/ENT.md#L1516), [COPY:1873](../../data/spec-review-snapshot/documents/COPY.md#L1873).

Code evidence: [src/app/accounts.mjs:335](../../data/spec-review-snapshot/code/src/app/accounts.mjs#L335), [src/app/entitlements.mjs:40](../../data/spec-review-snapshot/code/src/app/entitlements.mjs#L40).

Signup with Enterprise context creates enterprise tier; hasToolAccess immediately grants every tool for that tier. This conflates audience context with purchased/approved entitlement. Whether enterprise access is intentionally free is a product-policy decision, but the code does not separate those concepts as required.

**Needed:** Separate audience, verified organization membership, subscription and capability grants; derive paid/contracted entitlements only from an authorized source of truth.

<a id="f-sec-01"></a>

### F-SEC-01 — Authentication lacks the required assurance levels

**P1 · Partial**

Requirement: [CAN:862](../../data/spec-review-snapshot/documents/CAN.md#L862), [ENT:459](../../data/spec-review-snapshot/documents/ENT.md#L459), [ENT:2673](../../data/spec-review-snapshot/documents/ENT.md#L2673), [ENT:2701](../../data/spec-review-snapshot/documents/ENT.md#L2701).

Code evidence: [src/app/accounts.mjs:1](../../data/spec-review-snapshot/code/src/app/accounts.mjs#L1), [src/app/app.mjs:324](../../data/spec-review-snapshot/code/src/app/app.mjs#L324), [src/app/payments.mjs:343](../../data/spec-review-snapshot/code/src/app/payments.mjs#L343), [src/app/kyc.mjs:1](../../data/spec-review-snapshot/code/src/app/kyc.mjs#L1).

Scrypt passwords, hashed expiring one-use recovery/verification tokens, quotas and secure cookies are real protections. No passkey/MFA challenge flow, assurance-bound step-up for payment/beneficiary/privileged decisions, or enterprise SSO/SCIM implementation was found. Sessions have a fixed lifetime rather than the specified idle/privileged session lifecycle. Email verification/recovery OTP is not a second authentication factor.

**Needed:** Implement the selected identity ADR, MFA/passkeys and step-up policy; bind assurance to session and action, rotate/revoke appropriately and test recovery without assurance bypass.

<a id="f-sec-02"></a>

### F-SEC-02 — Audit and ledger evidence can be removed through normal application paths

**P1 · Partial**

Requirement: [ENT:367](../../data/spec-review-snapshot/documents/ENT.md#L367), [ENT:2702](../../data/spec-review-snapshot/documents/ENT.md#L2702), [ENT:2709](../../data/spec-review-snapshot/documents/ENT.md#L2709), [DEL:1471](../../data/spec-review-snapshot/documents/DEL.md#L1471).

Code evidence: [src/app/app.mjs:911](../../data/spec-review-snapshot/code/src/app/app.mjs#L911), [src/app/app.mjs:938](../../data/spec-review-snapshot/code/src/app/app.mjs#L938), [src/app/app.mjs:953](../../data/spec-review-snapshot/code/src/app/app.mjs#L953), [src/app/workflows.mjs:330](../../data/spec-review-snapshot/code/src/app/workflows.mjs#L330), [server/store.mjs:292](../../data/spec-review-snapshot/code/server/store.mjs#L292).

Account deletion explicitly removes the user’s points ledger and workspace audit rows; workflow deletion cascades tool invocation evidence. Audit tables are ordinary mutable tables and do not carry the full versioned actor/policy/correlation/before-after envelope. Privacy deletion requires a retention/pseudonymization design, not blanket destruction of financial and consequential evidence.

**Needed:** Separate identity erasure from legally/policy-retained immutable records; use append-only correction events, retention/hold rules, tamper evidence and explicit privileged-access audit.

<a id="f-pay-02"></a>

### F-PAY-02 — Signed webhook authenticity is not sufficient payment validation

**P1 · Static**

Requirement: [ENT:866](../../data/spec-review-snapshot/documents/ENT.md#L866), [ENT:1179](../../data/spec-review-snapshot/documents/ENT.md#L1179), [ENT:2698](../../data/spec-review-snapshot/documents/ENT.md#L2698).

Code evidence: [src/app/payments.mjs:561](../../data/spec-review-snapshot/code/src/app/payments.mjs#L561), [src/app/payments.mjs:628](../../data/spec-review-snapshot/code/src/app/payments.mjs#L628), [src/app/finance.mjs:1](../../data/spec-review-snapshot/code/src/app/finance.mjs#L1).

Webhooks use raw-body signature checking and event/reference deduplication. Charge success credits purchases or marks funding held by reference without comparing provider amount/currency to the stored purchase/funding. Transfer reference is persisted after provider response, creating a possible early-callback/recovery gap. Finance aggregates amounts across currencies without currency grouping. No external provider mismatch was tested.

**Needed:** Validate provider, reference, amount, currency, recipient and expected state; persist dispatch intent first; make unmatched events replayable; expose currency-safe balances and reconciliation evidence.

<a id="f-sec-03"></a>

### F-SEC-03 — KYC and secure evidence handling are manual and weakly bound

**P1 · Partial**

Requirement: [CAN:862](../../data/spec-review-snapshot/documents/CAN.md#L862), [ENT:2682](../../data/spec-review-snapshot/documents/ENT.md#L2682), [ENT:2683](../../data/spec-review-snapshot/documents/ENT.md#L2683), [ENT:2684](../../data/spec-review-snapshot/documents/ENT.md#L2684).

Code evidence: [src/app/kyc.mjs:1](../../data/spec-review-snapshot/code/src/app/kyc.mjs#L1), [src/app/files.mjs:50](../../data/spec-review-snapshot/code/src/app/files.mjs#L50).

KYC cases and administrator decisions exist. There is no implemented KYC-provider callback lifecycle, current-assurance check or required evidence threshold for verified decisions. Evidence downloads use workspace access rather than a dedicated identity-evidence scope. Provider choice remains an open ADR; the gap is the governed integration/control contract, not a missing particular vendor.

**Needed:** Choose and record the provider/assurance policy; isolate evidence ACLs, implement signed idempotent case-bound callbacks or documented manual verification controls, and invalidate verification on material evidence changes.

<a id="f-wf-01"></a>

### F-WF-01 — Durable workflow execution supports a small subset of the contract

**P1 · Partial**

Requirement: [AGT:189](../../data/spec-review-snapshot/documents/AGT.md#L189), [ENT:728](../../data/spec-review-snapshot/documents/ENT.md#L728), [DEL:514](../../data/spec-review-snapshot/documents/DEL.md#L514).

Code evidence: [src/app/workflows.mjs:8](../../data/spec-review-snapshot/code/src/app/workflows.mjs#L8), [src/app/workflows.mjs:127](../../data/spec-review-snapshot/code/src/app/workflows.mjs#L127), [src/app/workflows.mjs:271](../../data/spec-review-snapshot/code/src/app/workflows.mjs#L271), [src/app/workflows.mjs:342](../../data/spec-review-snapshot/code/src/app/workflows.mjs#L342).

Five deterministic tools, dependency ordering, scheduled start/expiry, row locking, principal/policy rechecks, approval-version binding, pause/cancel and bounded retries are implemented. Missing runtime constructs include versioned reusable definitions/templates, conditional branches, event waits, compensation and broader multi-tool orchestration. This is a real durable runtime, not merely a chat response, but it does not satisfy the entire workflow specification.

**Needed:** Extend the schema/runtime through versioned contracts and explicit state transitions; add event correlation, idempotent effects and compensations before broadening delegated actions.

<a id="f-tf-01"></a>

### F-TF-01 — Canonical tools and agents are not registered under their required contracts

**P1 · Partial**

Requirement: [CAN:1293](../../data/spec-review-snapshot/documents/CAN.md#L1293), [AGT:537](../../data/spec-review-snapshot/documents/AGT.md#L537), [AGT:557](../../data/spec-review-snapshot/documents/AGT.md#L557), [AGT:955](../../data/spec-review-snapshot/documents/AGT.md#L955), [ENT:706](../../data/spec-review-snapshot/documents/ENT.md#L706).

Code evidence: [src/app/workflows.mjs:109](../../data/spec-review-snapshot/code/src/app/workflows.mjs#L109), [src/app/agents.mjs:869](../../data/spec-review-snapshot/code/src/app/agents.mjs#L869), [src/app/engines.mjs:194](../../data/spec-review-snapshot/code/src/app/engines.mjs#L194), [src/app/engineRegistry.mjs:1](../../data/spec-review-snapshot/code/src/app/engineRegistry.mjs#L1).

The snapshot exports 31 agent manifests, 248 legacy engine configurations and five workflow tools. These are not a verified crosswalk to AG-001–030 and T-001–202. Manifests omit major input/output/risk/data/evidence/cost/compensation fields. Several useful deterministic calculation families and structured CRUD services exist; neither counts nor names prove the 202 canonical capabilities are complete.

**Needed:** Create canonical IDs, explicit implementation aliases and versioned manifests; certify each tool’s semantics, permissions, evidence and tests. Preserve Foundation/Expansion phase distinctions rather than treating all 202 as immediate launch blockers.

<a id="f-tf-02"></a>

### F-TF-02 — Legacy diagnostic codes remain public runtime identity

**P1 · Contradiction**

Requirement: [CAN:137](../../data/spec-review-snapshot/documents/CAN.md#L137), [CAN:1608](../../data/spec-review-snapshot/documents/CAN.md#L1608), [AGT:95](../../data/spec-review-snapshot/documents/AGT.md#L95), [BRAND:447](../../data/spec-review-snapshot/documents/BRAND.md#L447).

Code evidence: [src/app/engines.mjs:59](../../data/spec-review-snapshot/code/src/app/engines.mjs#L59), [src/app/engines.mjs:81](../../data/spec-review-snapshot/code/src/app/engines.mjs#L81), [src/app/engines.mjs:480](../../data/spec-review-snapshot/code/src/app/engines.mjs#L480), [src/products/engines/pages/EnginesPage.tsx:90](../../data/spec-review-snapshot/code/src/products/engines/pages/EnginesPage.tsx#L90).

Public engine routes/catalogs expose legacy series codes and the runtime maps F/C series to a fifth Finance engine. The canonical architecture has four engines and relegates legacy codes to traceability. Public detail/demo accepts syntactically valid series codes with fallback configuration instead of requiring a registered canonical capability.

**Needed:** Keep legacy identifiers as migration aliases only; use the canonical four-engine homes and capability names in public routing/catalogs; reject unknown IDs.

<a id="f-ai-01"></a>

### F-AI-01 — Model governance is not tied to the model actually executed

**P1 · Partial**

Requirement: [ENT:1593](../../data/spec-review-snapshot/documents/ENT.md#L1593), [ENT:1616](../../data/spec-review-snapshot/documents/ENT.md#L1616), [DEL:1022](../../data/spec-review-snapshot/documents/DEL.md#L1022).

Code evidence: [src/app/models.mjs:1](../../data/spec-review-snapshot/code/src/app/models.mjs#L1), [server/store.mjs:808](../../data/spec-review-snapshot/code/server/store.mjs#L808), [src/app/ai.mjs:45](../../data/spec-review-snapshot/code/src/app/ai.mjs#L45), [src/app/aiPolicy.mjs:1](../../data/spec-review-snapshot/code/src/app/aiPolicy.mjs#L1).

The registry approves a use case but does not bind approval to provider/model/version. Seeded use cases are approved automatically, while environment-selected providers/models and fallback determine actual execution. Structured responses, evidence-ID filtering, cost limits and pre/post policy checks exist. No versioned evaluation/promotion evidence establishes quality, fairness, regression thresholds or approved fallback.

**Needed:** Bind provider/model/prompt/schema/data-policy versions to use-case approval; promote only evaluated configurations, enforce fallback approval, and persist execution provenance and quality/degradation outcomes.

<a id="f-core-01"></a>

### F-CORE-01 — Connector/event/context infrastructure is mostly absent

**P1 · Missing contract**

Requirement: [CAN:311](../../data/spec-review-snapshot/documents/CAN.md#L311), [CAN:991](../../data/spec-review-snapshot/documents/CAN.md#L991), [CAN:1028](../../data/spec-review-snapshot/documents/CAN.md#L1028), [ENT:791](../../data/spec-review-snapshot/documents/ENT.md#L791), [ENT:878](../../data/spec-review-snapshot/documents/ENT.md#L878), [ENT:1025](../../data/spec-review-snapshot/documents/ENT.md#L1025).

Code evidence: [src/app/app.mjs:1](../../data/spec-review-snapshot/code/src/app/app.mjs#L1), [src/app/agentSources.mjs:1](../../data/spec-review-snapshot/code/src/app/agentSources.mjs#L1), [src/app/knowledge.mjs:1](../../data/spec-review-snapshot/code/src/app/knowledge.mjs#L1), [server/index.mjs:103](../../data/spec-review-snapshot/code/server/index.mjs#L103), [server/store.mjs:1](../../data/spec-review-snapshot/code/server/store.mjs#L1).

There are direct Express endpoints, records, mail outbox, payment webhooks and a workflow worker. There is no general versioned event bus/outbox contract for domain changes, user connector registry with scoped OAuth grants/revocation/sync health, or typed temporal context graph and five-scope memory service. Payment/model/mail adapters are real integrations but are not that general connector platform.

**Needed:** Define API/event schemas, versioning/error/pagination conventions, correlation and retries; add connector grants and health; build the minimal typed graph and memory boundaries required by actual flows.

<a id="f-core-02"></a>

### F-CORE-02 — Return-state and attention are not the specified continuity service

**P1 · Partial**

Requirement: [CAN:45](../../data/spec-review-snapshot/documents/CAN.md#L45), [AGT:508](../../data/spec-review-snapshot/documents/AGT.md#L508), [ENT:599](../../data/spec-review-snapshot/documents/ENT.md#L599), [ENT:1654](../../data/spec-review-snapshot/documents/ENT.md#L1654), [BRAND:337](../../data/spec-review-snapshot/documents/BRAND.md#L337).

Code evidence: [src/products/workspace/components/WorkspaceShell.tsx:1](../../data/spec-review-snapshot/code/src/products/workspace/components/WorkspaceShell.tsx#L1), [src/app/app.mjs:1272](../../data/spec-review-snapshot/code/src/app/app.mjs#L1272), [src/app/workflows.mjs:8](../../data/spec-review-snapshot/code/src/app/workflows.mjs#L8), [src/app/tasks.mjs:39](../../data/spec-review-snapshot/code/src/app/tasks.mjs#L39).

The shell refreshes state periodically and on focus; workflow snapshots, notification records and computed task attention exist. There is no unified last-visit comparison with prior/current state, provenance, permission, reversal, materiality, goal relevance and digest policy across lanes. Static copy describing continuity does not supply that service.

**Needed:** Persist per-user review checkpoints; aggregate material authorized changes, approvals, blockers and stale results; enforce quiet hours/digests without suppressing mandatory security notices.

<a id="f-data-01"></a>

### F-DATA-01 — Shared data contracts and safe schema evolution are incomplete

**P1 · Partial**

Requirement: [ENT:311](../../data/spec-review-snapshot/documents/ENT.md#L311), [ENT:367](../../data/spec-review-snapshot/documents/ENT.md#L367), [ENT:391](../../data/spec-review-snapshot/documents/ENT.md#L391), [DEL:1471](../../data/spec-review-snapshot/documents/DEL.md#L1471).

Code evidence: [server/store.mjs:202](../../data/spec-review-snapshot/code/server/store.mjs#L202), [server/store.mjs:995](../../data/spec-review-snapshot/code/server/store.mjs#L995), [src/app/creationStudio.mjs:55](../../data/spec-review-snapshot/code/src/app/creationStudio.mjs#L55), [src/app/knowledge.mjs:1](../../data/spec-review-snapshot/code/src/app/knowledge.mjs#L1).

PostgreSQL tables and transactional operations exist, but entities do not consistently carry required tenant/owner/classification/version/provenance/retention metadata. Schema creation and ALTER statements run from the store rather than a complete versioned migration/rollback program. MAX(version)+1 creation/scoping revisions and read-then-write updates have concurrency windows.

**Needed:** Introduce versioned migrations with forward/backward compatibility, consistent metadata and database constraints; use atomic version checks and deterministic conflict responses.

<a id="f-learn-01"></a>

### F-LEARN-01 — Learning completion does not establish assessed capability

**P1 · Partial**

Requirement: [CAN:461](../../data/spec-review-snapshot/documents/CAN.md#L461), [EXP:81](../../data/spec-review-snapshot/documents/EXP.md#L81), [ENT:3150](../../data/spec-review-snapshot/documents/ENT.md#L3150).

Code evidence: [src/app/learning.mjs:97](../../data/spec-review-snapshot/code/src/app/learning.mjs#L97), [src/app/learning.mjs:181](../../data/spec-review-snapshot/code/src/app/learning.mjs#L181), [src/app/learning.mjs:290](../../data/spec-review-snapshot/code/src/app/learning.mjs#L290), [src/app/learning.mjs:344](../../data/spec-review-snapshot/code/src/app/learning.mjs#L344).

Paths, modules, prerequisites, enrollment charging, progress and completion certificates exist; certificates create an unverified expert credential, correctly avoiding automatic verification. Assessment completion accepts a caller-supplied score with no trusted grading or passing threshold. Paths are listed globally without a private/draft publishing lifecycle. Completion is not wired to goal/capability-gap/result invalidation.

**Needed:** Distinguish attendance from assessed mastery; use trusted assessment outcomes and pass criteria, path visibility/publication controls and explicit capability/goal evidence updates.

<a id="f-grow-01"></a>

### F-GROW-01 — Growth analytics lacks governed metric and experiment evidence

**P2 · Partial**

Requirement: [CAN:646](../../data/spec-review-snapshot/documents/CAN.md#L646), [ENT:1989](../../data/spec-review-snapshot/documents/ENT.md#L1989), [ENT:2025](../../data/spec-review-snapshot/documents/ENT.md#L2025).

Code evidence: [src/app/growth.mjs:1](../../data/spec-review-snapshot/code/src/app/growth.mjs#L1), [src/app/outcomes.mjs:1](../../data/spec-review-snapshot/code/src/app/outcomes.mjs#L1), [src/app/outcomeAttribution.mjs:1](../../data/spec-review-snapshot/code/src/app/outcomeAttribution.mjs#L1).

KPI/observation, opportunity, experiment and outcome CRUD exists. Definitions lack versioned calculation/coverage/quality/provenance; observations can carry a source string rather than validated evidence. Experiments lack a full variant/exposure/guardrail/approval/statistical design. Opportunity records are not the universal typed eligibility/readiness model.

**Needed:** Version metric definitions and evidence; implement constrained opportunity types and assessed readiness; add experiment design/approval/measurement and attributable result return.

<a id="f-comm-01"></a>

### F-COMM-01 — Commercial workflow exists, but verification and signing remain limited

**P1 · Partial**

Requirement: [CAN:803](../../data/spec-review-snapshot/documents/CAN.md#L803), [ENT:1113](../../data/spec-review-snapshot/documents/ENT.md#L1113), [ENT:1143](../../data/spec-review-snapshot/documents/ENT.md#L1143), [ENT:1169](../../data/spec-review-snapshot/documents/ENT.md#L1169).

Code evidence: [src/app/projects.mjs:341](../../data/spec-review-snapshot/code/src/app/projects.mjs#L341), [src/app/verification.mjs:1](../../data/spec-review-snapshot/code/src/app/verification.mjs#L1), [src/app/documents.mjs:1](../../data/spec-review-snapshot/code/src/app/documents.mjs#L1), [src/app/tasks.mjs:1](../../data/spec-review-snapshot/code/src/app/tasks.mjs#L1).

Projects, parties, deliverables, criteria, submissions, approval/dispute and payment states are implemented. Deliverable review evaluates notes and link descriptions without fetching artifact contents; the prompt honestly states links were not inspected. Required deterministic/domain-specific/integrity verification is therefore incomplete. Document signing is explicitly an in-app hash-bound attestation, not a qualified electronic signature or complete agreement execution service.

**Needed:** Implement safe artifact ingestion and domain checks, evidence sufficiency/human escalation, agreement/version consent and signature policy; keep acceptance and release as separate authorized transitions.

<a id="f-web-01"></a>

### F-WEB-01 — Public pages are forced to noindex and served as one client-rendered document

**P1 · Contradiction**

Requirement: [ENT:2049](../../data/spec-review-snapshot/documents/ENT.md#L2049), [ENT:2081](../../data/spec-review-snapshot/documents/ENT.md#L2081), [COPY:1](../../data/spec-review-snapshot/documents/COPY.md#L1).

Code evidence: [src/App.tsx:1](../../data/spec-review-snapshot/code/src/App.tsx#L1), [src/app/frontend.mjs:1](../../data/spec-review-snapshot/code/src/app/frontend.mjs#L1).

RouteEffects unconditionally sets robots to noindex,nofollow. The production frontend serves the same index.html for routes, with metadata set client-side and no route-level 404 response. This conflicts with specified indexable public pages and server-rendered metadata. Private routes should remain protected/noindex. Deployment may add headers, but cannot be assumed to repair the application behavior.

**Needed:** Separate public/private indexing policy, generate route-specific crawlable metadata/canonicals/structured data and correct 404s; validate in a production-configured staging crawl.

<a id="f-web-02"></a>

### F-WEB-02 — The 103-page specification is not 103 functioning routes

**P1 · Partial**

Requirement: [ENT:1351](../../data/spec-review-snapshot/documents/ENT.md#L1351), [ENT:1431](../../data/spec-review-snapshot/documents/ENT.md#L1431), [COPY:2195](../../data/spec-review-snapshot/documents/COPY.md#L2195), [COPY:2735](../../data/spec-review-snapshot/documents/COPY.md#L2735).

Code evidence: [src/App.tsx:1](../../data/spec-review-snapshot/code/src/App.tsx#L1), [src/shared/content/CopyLine.tsx:1](../../data/spec-review-snapshot/code/src/shared/content/CopyLine.tsx#L1), [tests/copy.test.mjs:1](../../data/spec-review-snapshot/code/tests/copy.test.mjs#L1).

The route inventory finds 13 specified OS URLs dispatched to PlannedModule. Four expert pages are consolidated into /experts instead of separate catalog routes. Existing 99 content entries closely match the source text, but content registration and text tests do not verify working controls or journeys. Some missing-route functions exist elsewhere, so this is not a claim that all 13 features are wholly absent.

**Needed:** Resolve route decisions explicitly, implement/redirect required functional destinations, preserve intent through CTAs, and test each route’s auth, controls, empty/error states and complete journey.

<a id="f-web-03"></a>

### F-WEB-03 — Several CTAs are generic navigation rather than the promised flow

**P2 · Partial**

Requirement: [ENT:1383](../../data/spec-review-snapshot/documents/ENT.md#L1383), [COPY:1673](../../data/spec-review-snapshot/documents/COPY.md#L1673), [COPY:2723](../../data/spec-review-snapshot/documents/COPY.md#L2723), [BRAND:431](../../data/spec-review-snapshot/documents/BRAND.md#L431).

Code evidence: [src/shared/content/CopyLine.tsx:24](../../data/spec-review-snapshot/code/src/shared/content/CopyLine.tsx#L24), [src/shared/content/destinations.ts:75](../../data/spec-review-snapshot/code/src/shared/content/destinations.ts#L75).

Known labels route through a static destination map; unknown labels render as text and same-page links scroll to the next block. Expert CTAs route to generic /start without preserving the specific intent. Send Inquiry is mailto rather than a structured inquiry workflow. These choices need explicit acceptance against the prescribed user journeys.

**Needed:** Map every actionable CTA to an implemented intent-preserving destination/form; verify routing with actual forms and authenticated continuation rather than text-presence assertions.

<a id="f-ux-01"></a>

### F-UX-01 — Brand foundations exist; full stillness/accessibility acceptance is not established

**P2 · Partial**

Requirement: [BRAND:47](../../data/spec-review-snapshot/documents/BRAND.md#L47), [BRAND:113](../../data/spec-review-snapshot/documents/BRAND.md#L113), [BRAND:151](../../data/spec-review-snapshot/documents/BRAND.md#L151), [BRAND:189](../../data/spec-review-snapshot/documents/BRAND.md#L189), [BRAND:431](../../data/spec-review-snapshot/documents/BRAND.md#L431), [ENT:2063](../../data/spec-review-snapshot/documents/ENT.md#L2063).

Code evidence: [src/products/companion/components/companionWidget.css:270](../../data/spec-review-snapshot/code/src/products/companion/components/companionWidget.css#L270), [src/App.tsx:1](../../data/spec-review-snapshot/code/src/App.tsx#L1).

Canonical color tokens, restrained tween durations, reduced-motion handling and a demand-rendered orbit with visibility/fallback controls exist. Companion typing uses an infinite bounce despite the no-bounce rule; reduced-motion support does not make default bouncing compliant. No user-level product motion preference or complete 15-state experience acceptance evidence was found. Screenshots/manual assistive-technology and visual review were not performed in this audit.

**Needed:** Remove prohibited motion, respect product and OS motion preferences, audit all state/attention patterns and run WCAG 2.2 AA keyboard/screen-reader/contrast and representative device checks with recorded evidence.

<a id="f-ops-01"></a>

### F-OPS-01 — Connection safeguards do not establish production resilience

**P1 · Partial / external evidence required**

Requirement: [ENT:1774](../../data/spec-review-snapshot/documents/ENT.md#L1774), [ENT:1784](../../data/spec-review-snapshot/documents/ENT.md#L1784), [ENT:1807](../../data/spec-review-snapshot/documents/ENT.md#L1807), [DEL:871](../../data/spec-review-snapshot/documents/DEL.md#L871).

Code evidence: [server/index.mjs:40](../../data/spec-review-snapshot/code/server/index.mjs#L40), [src/app/readiness.mjs:1](../../data/spec-review-snapshot/code/src/app/readiness.mjs#L1), [src/app/reliability.mjs:1](../../data/spec-review-snapshot/code/src/app/reliability.mjs#L1), [src/app/operations.mjs:18](../../data/spec-review-snapshot/code/src/app/operations.mjs#L18).

Worker count is capped by a configured connection budget; readiness shares one in-flight query and has a response deadline, and database failures are classified. A per-process/deployment budget is not a global budget across replicas, workers, maintenance and serverless callers. No staging evidence proves 99.95% availability, latency targets, RPO/RTO, failover or restore. Actual provider backups/HA cannot be inferred from repository absence.

**Needed:** Allocate one aggregate database budget with reserve, bounded acquisition/query/transaction deadlines and measured overload behavior; validate production configuration in staging with timeout/failover/restore drills and monitored SLOs.

<a id="f-ops-02"></a>

### F-OPS-02 — Delivery and security release gates are incomplete

**P1 · Partial / external evidence required**

Requirement: [ENT:1845](../../data/spec-review-snapshot/documents/ENT.md#L1845), [ENT:1883](../../data/spec-review-snapshot/documents/ENT.md#L1883), [ENT:1896](../../data/spec-review-snapshot/documents/ENT.md#L1896), [DEL:1276](../../data/spec-review-snapshot/documents/DEL.md#L1276).

Code evidence: [.github/workflows/ci.yml:1](../../data/spec-review-snapshot/code/.github/workflows/ci.yml#L1), [deploy/README.md:1](../../data/spec-review-snapshot/code/deploy/README.md#L1), [package.json:1](../../data/spec-review-snapshot/code/package.json#L1).

Build, backend/stress and Chromium browser automation exist. The supplied code does not establish the full six-environment promotion process, immutable signed artifacts/SBOM, SAST/SCA/secret/IaC/DAST gates, canary/rollback, security review, operational runbooks and disaster-recovery acceptance. External pipeline or approval artifacts may exist but were not supplied.

**Needed:** Implement and retain pipeline evidence for the applicable gates; provision staging with production-shaped services, run safe smoke/failure tests, exercise rollback/restore and collect owner sign-offs.

<a id="f-qa-01"></a>

### F-QA-01 — Tests cover implemented happy paths but not specification acceptance

**P1 · Partial**

Requirement: [INT:164](../../data/spec-review-snapshot/documents/INT.md#L164), [ENT:1922](../../data/spec-review-snapshot/documents/ENT.md#L1922), [ENT:1967](../../data/spec-review-snapshot/documents/ENT.md#L1967), [DEL:1093](../../data/spec-review-snapshot/documents/DEL.md#L1093).

Code evidence: [tests/signals.test.mjs:1](../../data/spec-review-snapshot/code/tests/signals.test.mjs#L1), [tests/scoping.test.mjs:1](../../data/spec-review-snapshot/code/tests/scoping.test.mjs#L1), [tests/outcome-attribution.test.mjs:1](../../data/spec-review-snapshot/code/tests/outcome-attribution.test.mjs#L1), [tests/copy.test.mjs:1](../../data/spec-review-snapshot/code/tests/copy.test.mjs#L1).

The new focused run passed 29/29 tests, while six boundary observations reproduced four requirement failures. Existing copy tests preserve a historical baseline and catalog consistency rather than verifying 103 fully implemented routes. Earlier full-suite failures are recorded separately and are not erased by this focused run. No blanket production-ready conclusion is supported.

**Needed:** Trace acceptance IDs to negative/security/concurrency/state-machine tests, especially the reproduced boundaries; preserve realistic entitlement fixtures and separate environment failures from product failures.

<a id="f-doc-01"></a>

### F-DOC-01 — The supplied suite contains historical inconsistencies and unprovided acceptance artifacts

**P2 · Document conflict / external evidence required**

Requirement: [CAN:1635](../../data/spec-review-snapshot/documents/CAN.md#L1635), [CAN:1658](../../data/spec-review-snapshot/documents/CAN.md#L1658), [ENT:2933](../../data/spec-review-snapshot/documents/ENT.md#L2933), [BRAND:532](../../data/spec-review-snapshot/documents/BRAND.md#L532), [DEL:1144](../../data/spec-review-snapshot/documents/DEL.md#L1144).

Code evidence: [README.md:90](../../data/spec-review-snapshot/code/README.md#L90).

The eight documents mix older version labels, 98/103-page references, overlapping ADR numbers and differing risk vocabularies. Reserved legacy ranges and absent historical Step 4 are explicitly not permission to invent scope. “Closed” design matrices are not proof of shipped code. Schedules, reference budget, legal approvals, staffing, owner signatures, UAT, media originals and executed acceptance are not verifiable from code; README also contains statements superseded by implementation.

**Needed:** Use domain precedence and record explicit ADR/CR resolutions; reconcile one requirement/owner/phase register, refresh repository documentation and attach real acceptance/operational/legal evidence.

## Document conflicts and matters requiring external evidence

- Use the suite’s domain-specific precedence, with supplied COPY v1.8 for latest copy. Older embedded v1.2/v1.3/v2.1 labels and 98-page references must be reconciled; do not discard later appendices. CAN’s precedence still mentions copy v1.7.
- ADR-009 through ADR-013 refer to different decisions between CAN and ENT. Create one register with aliases; do not silently assume identical IDs mean identical decisions.
- Risk vocabularies R0–R4 and Low/Moderate/High/Consequential need a declared mapping. Green/amber/red scoping has its own review semantics.
- Historical Step 4, reserved section ranges and legacy S/Z-series extensions are explicitly unresolved/reserved. They are not missing product features to invent.
- “Closed” in gap-closure documents means the design describes a solution; the implementation and acceptance still need evidence.
- The delivery budget/timeline is a reference, not evidence of a funded or executed contract. Staffing, procurement, signed acceptance, legal/privacy text approval and vendor arrangements are not decidable from code.
- Modular monolith deployment is allowed. A Vite/Express implementation is not automatically defective because a document prefers Next.js; deviations need the specified architecture decision. Equivalent tools can satisfy requirements if proven.
- No inference is made that the actual VPS/database has no backups, TLS, monitoring or HA. Those require configuration, measurements and restore/incident evidence. Production targets include 99.95% monthly availability, read p95 350 ms, write p95 700 ms, AI visible response 5 s, webhook 95% within 60 s, RPO 5 min and critical RTO 60 min, subject to the open SLO ratification decision (ENT:1784–1794). These are requirements, not measured results.

## Recommended implementation order and completion evidence

1. **Protect existing users and transactions.** Fix P0 boundaries; qualification/red-scope gates; assurance, ledger retention and payment callback validation. Exit evidence: negative account-isolation tests, atomic-claim tests, provider fault-injection/reconciliation tests and secure upload lifecycle tests.
2. **Make the connected goal flow coherent.** Versioned goals/results/evidence, independent grants, constraints/readiness matching, deletion/revocation propagation, recommendation execution, expert proposal reconciliation and attributable outcomes. Exit evidence: the INT acceptance examples run end-to-end, including changed goals, expired credentials, disconnected sources, absent experts and personal-to-organization privacy.
3. **Normalize runtime contracts.** Canonical four-engine/tool/agent mapping; complete manifests, events, scoped connectors and durable workflow constructs. Exit evidence: per-capability contract/evidence/permission tests for the agreed Foundation release; Expansion remains separately tracked.
4. **Complete the promised experience.** Resolve every route/CTA, implement return-state/attention and organization settings, correct public SEO and motion, validate accessibility and all eight audience journeys. Exit evidence: route-level and browser acceptance, manual assistive-technology review and crawl/performance reports.
5. **Prove release readiness.** Re-run the full suite on the final code, deploy a production-shaped staging environment, measure aggregate DB use/timeouts/SLOs, exercise restore/failover/rollback and collect required security/operational/legal/UAT approvals. Only then claim the production gates are satisfied.

No product fixes were made as part of this comparison. The report supplies a concrete backlog and evidence boundaries; it does not certify the site as production-ready.
