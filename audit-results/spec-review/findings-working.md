# Working evidence ledger — audit still in progress

All references below use the frozen code snapshot in `data/spec-review-snapshot/code`, not necessarily the subsequently edited working tree. These are static findings, not claims of runtime reproduction.

## Confirmed inspected differences

- **SC-01 Red scoping gate is a checkbox, not qualified review.** scoping.mjs:370–401 accepts `confirmed:true` even without completed review; app.mjs:675 similarly allows `riskConfirmed`. Compare INT142–158, CAN1903–1965, DEL1927–1937. Determine exact policy scope before final severity; red means mandatory qualified review in relevant spec passages.
- **SC-02 Review qualification and confidentiality missing at queue boundary.** scoping.mjs:457–494 requires only existence of a talent profile; exposes every pending objective/category/jurisdiction and lets any registered expert claim it. No domain, credential validity, jurisdiction, conflict, or consent filter in these handlers. Claim is SELECT then unconditional UPDATE (concurrent double claim possible; not yet reproduced).
- **SC-03 Review reconciliation incomplete.** scoping.mjs:497–510 only saves reviewer notes/status. scope_versions captures user edits at234–284, but no expert change proposal, field-level provenance, acceptance/diff/reconciliation handler. Suggestions334–337 not persisted as AI version. Four guidance responses354–367 exist, many suggestions null.
- **SC-04 Budget suggestions mix currencies.** scoping.mjs:323–328 averages all job_posts of category without currency/status filter and labels result USD. Requires correction before claims of grounded budget advice. Cross-tenant aggregate privacy requires further assessment.
- **SI-01 Result envelope incomplete/history overwritten.** intelligence.mjs:10–70 upserts one latest row per workspace/subject/agent; envelope has conclusion/summary/computed/expiry only. No source versions, permission/purpose, model/prompt version, confidence/uncertainty/evidence/lineage graph. Expired results simply disappear from GET102–117. Direct subject staleness helper78–85 exists.
- **SI-02 Recommendation lifecycle partial.** recommendations.mjs:8–17 statuses exist;80–97 transition updates have no compare-and-swap; scheduled_for returned but no scheduling input; no execution link in module. invalidate35–45 invalidates completed too, contrary to its comment. Need inspect consumers before judging end-to-end behavior.
- **SI-03 Causal strength is self-asserted.** outcomeAttribution.mjs:11–58 accepts `verified_causal` from caller without evidence/experiment requirement; arbitrary subjectKind/id, optional observedAt unvalidated. Recommendation workspace checked. No proof of causal validation.
- **EX-01 Explicit package read/revoke exists, limited.** expertContextPackage.mjs:8–10 permits objective/knowledge references; grants only project client; resolves only designated expert and checks revoked status every resolve83–96. Missing expiry, purpose, field redaction, consent/version snapshot, recheck current project assignment, and evidence-return write in this module. Follow related modules.
- **WF-01 Durable but narrow workflow runtime.** workflows.mjs:8–108 five concrete deterministic tools, three write controls; schema127–142 linear dependency steps with start/expiry. Row locking, principal recheck, objective/policy version approval, cancellation/pause, bounded retry, invocation evidence implemented271–479. No conditional branch/event-wait/compensation/template definition version runtime in inspected file. Completed runs deletable330–339, leaving audit log but removing step evidence stored in run (tool_invocations FK must inspect).
- **TF-01 Registry contract incomplete.** workflows.mjs:109–118 exposes9 manifest properties, lacks full input/output schema projection/risk/data/memory/evidence/telemetry/compensation fields required AGT537–571/CAN751–771. agents.mjs869–876 seven manifest fields. Need map202 capabilities to broader engine implementations, not falsely count onlyfive as all tools.
- **AU-01 Role model narrow.** policy.mjs1–19 only owner/member/concierge permissions. Workflow principalFor183–190 specifically owner. Need inspect organization extensions before final hierarchy/ABAC verdict.
- **WEB-01 All routes force noindex.** App.tsx RouteEffects sets noindex,nofollow universally; need server/frontend/robots inspect to confirm staging intentionally vs production gap.
- **WEB-02 OS route fallback.** App.tsx routes unimplemented /os/* to PlannedModule; inspect exact103 route mapping before inventory.

## Positive evidence

- AI rules aiRules.mjs18–70: feature toggles, allowed source kinds, points ceiling, instructions, block/ask/allow for three writes. Defaults mostly enabled; inspect lane settings elsewhere.
- goals.mjs9–45 twelve-stage lifecycle, workspace-scoped subscriptions with constraints and attentionPolicy62–79, subscription delete221–230. Stage invalidates direct goal intelligence/recommendations160–163. Need inspect scheduler/consumers/UI.
- agents.mjs940–1194 runtime checks role/entitlement/cost/human confirmation, claims idempotency atomically, atomically debits points, records run, refunds failures. Reconciliation1197–1263 refunds interrupted work without blind replay. Does not alone establish full authority envelope.

## Reading coverage

All eight supplied documents read completely. COPY1851–2340 initial discarded output was reread in1851–2220/2221–2580;2581–2866 completed. ENT and AGT truncation gaps repaired as noted in read log/session notes. Code inspection remains ongoing; do not represent this working ledger as exhaustive completion.
