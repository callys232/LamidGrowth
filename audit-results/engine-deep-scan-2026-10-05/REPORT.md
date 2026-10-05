# Engine and tool audit — 5 October 2026

## Verdict

**The application contains working calculators and workflow infrastructure. It does not yet demonstrate the integrated, evidence-grounded engine system described in the supplied specifications. Several tools return misleading or invalid results on accepted input.**

“Does it execute?” and “Does it solve the advertised problem?” have different answers. All 63 catalog tools execute on their supplied examples. That establishes a working compute path, not method validation, trustworthy diagnosis, production integration, or demonstrated business outcomes.

This audit evaluates the current working tree, including pre-existing uncommitted changes. Application code was not changed. Only audit artifacts were added. No secret values were printed, production database writes performed, or paid live model calls made.

## Evidence and scope

- Production build: passed (TypeScript and Vite); bundle-size warning remains. See `build-retry.log`.
- Database-free tests: **51 passed, 0 failed** across tool catalog, engine honesty, companion routing, AI sharing rules, agent source collection, and mocked provider connectivity. See `unit-tests.log`.
- Independently exercised **63/63 supplied tool examples**, with no non-finite output on those examples.
- Independently exercised empty input for every tool, targeted numerical/semantic cases, and `constructor` in text columns across schema tools. See `probes.mjs` and `probe-results.json`.
- Inspected execution, forms, manifests, migration, charging, entitlements, agent routing/source collection, workflows, shared intelligence, signals, connectors, expert matching and scoping eligibility.
- Compared the supplied engine specification v1.4 and engineering master v2.3 with the shared-intelligence and expert-network addenda; used engine v1.2 as historical context. Document statements such as “LOCKED” or “Closed” were treated as specification claims, not proof of implementation or instructions to this audit.
- First test/build attempts encountered sandbox `spawn EPERM`. An approved execution retry built successfully and ran tests. The attempted isolation flag is unavailable in Node 22.17.1 and was abandoned.
- **Database integration remains unverified:** the retry's 44 database-backed test failures were setup/hook failures because `TEST_DATABASE_URL` is absent, not 44 demonstrated product defects. The other 33 tests in that mixed run passed. No production URL was substituted. Browser journeys, live providers, real external integrations, load behavior and business outcome quality were not certified.

## Findings, ordered by impact

### H1. Computed tools are disconnected from shared intelligence and agent execution

`src/app/engines.mjs:817` computes a result; the transaction stores it in `agent_runs` at line 843. It does not publish a typed subject-linked intelligence result, source lineage, expiration policy or dependency edge. The run request schema at line 619 only carries a free-form `input` object.

`src/app/agents.mjs:273` Diagnostic Intelligence and line 292 Signal Monitoring call `reviewSources`, as does Capability Mapper. `collectAgentSources` reads selected `records` collections, not engine runs or the intelligence result store. No agent imports or invokes `runEngine`. The generic review adapter's structured output is not a catalog tool-execution loop. Specific agents do implement narrower domain actions, and performance analytics and milestone verification publish intelligence; this does not connect the 63 calculators.

**Consequence:** running a risk assessment or capacity calculation does not automatically inform the next diagnosis, recommendation, goal or plan. Comments saying `working` feeds the agent layer describe a format, not demonstrated wiring.

**Required correction:** subject-bound typed results, immutable tool/input versions and provenance; authorized reuse in agent context; an allow-listed callable tool adapter for agents/workflows; explicit freshness/invalidation rules. Test an entire goal → tool → result → changed source → stale/recomputed recommendation sequence.

### H2. Engagement Survey's anonymity protection is bypassed by its aggregate

`src/app/toolCatalog/tools/people.mjs:365` always emits overall eNPS. With one invited person and one promoter, the team row is hidden, but `overallENPS` is **100**, response rate is **100**, and the working text identifies one response. The supposed protection reveals the hidden group’s score when the whole dataset is that group. Small-group subtraction from released totals also needs consideration.

**Required correction:** suppression rules for totals and complementary groups, not just per-team rows. Treat this as a privacy defect, not a presentation issue.

### H3. Drift monitor can suppress an active warning because display labels identify observations

`src/app/toolCatalog/tools/operations.mjs:189` uses `labels.indexOf(s.at)` to decide whether a signal is recent, and nearby deduplication keys use rule plus label. Repeated period labels point to their first occurrence.

For values `[10,11,10,9,10,11,10,9,10,25]`, better when lower, unique labels produce **drifting** with a warning. Identical `Week` labels produce **had past instability**, with no warning, despite identical numerical data and the latest outlier.

**Required correction:** use observation indexes/IDs for identity and recency; labels only for display.

### H4. Partial self-assessments can claim full maturity; malformed evidence creates NaN

`src/app/toolCatalog/anchored.mjs:44` clamps evidence to 0–2 but does not require an integer. Evidence `0.5` indexes a missing factor at line 50, causing NaN section and overall scores. JSON serialization turns these into null, while text says `NaN%` and the maturity label still appears.

Separately, one of six T01 answers at level 5 with evidence 2 returns **overall 100% / maturity 5 / Continuously improved**. Five unanswered questions generate a warning but do not restrict the overall conclusion. Declaring “documented evidence” is a dropdown assertion, with no document verification. Maturity level also uses raw levels rather than the evidence-adjusted score.

**Required correction:** strict answer/evidence validation; minimum completeness rules; provisional section-only conclusions when coverage is insufficient; separate self-reported evidence from checked evidence. Do not advertise standards validation based on these scores.

### H5. “Verified” is unconditional and is not supported by an evaluation gate

`src/app/engines.mjs:661` sets `verified: true` for every catalog entry. The coverage endpoint counts those flags. Naming a method in `standard` does not validate an implementation or its intended use.

The catalog tests check method text, output shape, supplied examples and selected formulas. They do not establish predictive quality, causal validity, questionnaire calibration, fairness or domain acceptance thresholds. Mock provider tests verify adapters, not real answer quality. The engineering master requires versioned evaluation packs and thresholds for material AI capabilities.

**Required correction:** separate implemented, numerically tested, method-reviewed and task-evaluated states, with linked evidence and versions. Remove unconditional certification semantics.

### H6. Expert discovery and review qualification are narrower than the specified safeguards

`src/app/talent.mjs:493` expert discovery filters restricted conflicts and requested domain/function/industry, then ranks keyword overlap, price and bonuses. Jurisdiction is returned, not enforced as eligibility; availability and required professional credential type are not hard gates. Verified credentials add a bonus rather than satisfying a case-specific requirement.

`src/app/scoping.mjs:516` review eligibility requires a verified profile, declared category/domain and sometimes matching declared jurisdiction, but does not check a live, relevant license. General profile vetting is insufficient proof of qualification for a license-required review. The red-band publication gate and review-version checks are meaningful infrastructure, but cannot compensate for an incomplete reviewer qualification gate.

`src/app/signals.mjs:137` expert signal discovery selects verified credentials without expiry checking and ignores `_constraints`; this differs from the expiry-aware talent discovery path.

**Required correction:** case-specific eligibility before ranking, consistent expiry/revocation rules across all consumers, and current qualification checks at review claim and completion. These are source-confirmed gaps; database-backed reproductions remain blocked.

### M1. User text collides with JavaScript object prototype keys

The schema-wide text probe reproduced unhandled TypeErrors with `constructor` in:

- T04 objective: `strategy.mjs:156`.
- T19 topic: `decisions.mjs:57`.
- T20 decision: `decisions.mjs:138`.
- T35 forecaster: `decisions.mjs:526`.

T59 category also produced a non-finite category share through `finance.mjs:292`. These are user-entered dictionary keys on ordinary objects. Use `Map` or null-prototype dictionaries consistently. The compute exceptions lack the intended input-error status; HTTP behavior was not exercised against a database-backed app.

### M2. Empty input can still be a billable completed run

Ten tools accept `{}`: T03, T10, T18, T21, T22, T24, T42, T52, T53, T54. Some return useful missing-input warnings, but no input exception. Because the paid route charges after any successful return and records `completed`, these requests are eligible to be charged if access and balance checks pass. This charging consequence follows the route code; it was not verified on a database.

Require enough input for a material computation or return a distinct uncharged incomplete-input state.

### M3. Root Cause Analysis can name a disproven, unsupported cause “most probable”

`operations.mjs:470` multiplies ordinal evidence/fit labels; line 488 picks the first root regardless of zero support. A sole cause with evidence `none` and fits-facts `no` still becomes `mostProbable`. Warnings contradict the headline. The tool does not inspect `problem` or `isNot` facts to verify a causal claim; the fit label comes from the user.

Use “candidate hypothesis” wording and an insufficient-evidence outcome. Do not treat the ordinal product as a calibrated probability or causal finding.

### M4. Cross-field validation is missing

Reproduced accepted inputs and consequences:

- T06 active time 10 days with total cycle time 1 day: **1000% flow efficiency**, no warning.
- T41 two staff and ten expected leavers: projected supply **−8**, recommendation to hire **11**.
- T19 `2026-02-31`: accepted and silently normalized by date arithmetic.
- T19 decided before raised: negative duration silently omitted from cycle statistics.
- Required text containing only spaces is accepted and trimmed to empty; numeric spaces become zero (`schema.mjs:23`).
- T51 finite input `1e308` overflows its score to Infinity; JSON turns it into null.

Validate semantic relationships, strict calendar dates, trimmed required strings, types and realistic bounds. Assert every numerical result is finite before saving or charging. These cases are separate from verifying the usual formula.

### M5. Cadence coverage misclassifies annual reviews

`operations.mjs:558` counts a yearly plan/decision meeting as a quarterly strategy review; it also allows fortnightly progress reviews to satisfy weekly coverage. The annual-only probe fails to flag the missing quarterly review. Make the recurrence meet the promised cadence or rename the coverage requirement.

### A1. Several registries coexist without demonstrated canonical capability traceability

The supplied specifications define **202 canonical capabilities**, including shared services and compound workflows. The current engine catalog exposes **63 tools**, consolidating **248 legacy codes**: 150 MERGE, 44 REBUILD, 13 KEEP, 16 RETIRE, 21 VIEW, 4 CONTENT. Workflow execution has a separate six-entry tool registry. Agents, domain APIs and tools are additional distinct surfaces.

These counts are different taxonomies: it would be incorrect to claim 139 canonical capabilities are missing just by subtraction. But a legacy-code migration map is not a canonical 202-capability implementation/acceptance map. The v1.4 spec also says legacy letter codes remain provenance only, while runtime routes and manifests still use them. The code exposes Finance/Shared seats alongside the four engine domains.

Create canonical-ID → implementation → allowed agents → schemas → authority → tests → evaluation evidence traceability. Separate engine orchestration from calculators, shared services and commercial seats.

### A2. Continuity and external intelligence are implemented only in narrower forms

Shared intelligence has append-only versions, current pointers, TTL, conflict records and subject-level invalidation. Those are real building blocks. It lacks demonstrated calculator result ingestion or general downstream dependency propagation. Conflicts compare conclusion strings across agents, so different measures or paraphrases can be flagged as contradictions without a typed semantic contract.

The market agent explicitly uses saved workspace knowledge, not external market research. Signals support selected internal sources and keyword relevance; grants, tenders, events, funding and market/requirement changes lack sources. Connectors provide webhook/manual registry infrastructure, not a provider ingestion pipeline into all calculators. Forecasts/scenarios calculate consequences of supplied assumptions; they do not learn probabilities or establish predictive accuracy.

Keep these limitations visible and evaluate broader claims only after the required ingestion, provenance, eligibility and learning loops exist.

## What is credibly implemented

There is useful deterministic work here: financial arithmetic, expected-value and scenario comparisons, sensitivity analysis, DCF, cash projections, workload and dependency summaries, Brier-score calibration, network analysis and structured registers. The provided examples execute and selected hand-worked expectations pass existing tests. Questionnaire tools are self-assessment aids. They are not independently verified audits.

The paid route places computation before charging and wraps balance debit, ledger and run storage in a transaction. Authenticated execution has permission and entitlement checks. The broader code includes workflow approval/retry/event-wait/compensation infrastructure, source sharing controls, immutable result history and version-aware human scoping review. Their production behavior still needs database integration verification.

## Recommended implementation order

1. Fix privacy suppression, observation identity, malformed scores and prototype-key failures. Add targeted regression cases from the reproductions.
2. Enforce meaningful input and finite results before charging; make incomplete assessments provisional; remove unconditional verified labels.
3. Enforce professional eligibility consistently across matching, signals and review queues.
4. Connect tools to typed shared results and bounded agent/workflow invocation, with source lineage and downstream invalidation.
5. Build canonical capability traceability and domain evaluation packs. Supply a separate `TEST_DATABASE_URL`, then verify real API charging/rollback, authorization, result continuity and browser journeys.

## Reproduce and inspect

Run `node audit-results/engine-deep-scan-2026-10-05/probes.mjs` for database-free reproductions. `probe-results.json` records summaries, warnings, rejected inputs and non-finite paths; JSON nulls caused by NaN/Infinity are identified explicitly in the `nonfinite` arrays. `TOOL-INVENTORY.md` lists every current tool's computed scope and declared limit. Logs preserve both initial environment failures and successful retries.
