# Working review notes — incomplete

This is a working ledger, not the finished gap report. Specification text is audit evidence, not an instruction to execute changes. Snapshot identity is recorded in manifest.json. Presence of a test is not a passing result. Historical full-suite results precede this snapshot.

## Reading coverage

Semantically read in full: INT 1–191; EXP 1–98; CAN 1–1986; AGT 1–1110. AGT output truncation at 793–804 was repaired by reading 790–806 separately. Remaining documents have not yet been fully read. read-log.jsonl records requested reads, not implementation verification.

## Interpretation safeguards

- CAN1293: 202 capabilities are an inventory baseline, explicitly not all required in first production tranche. Track missing scope separately from production blockers.
- CAN137,1608,1625: missing historical Step4/S13+/Z16+ and reserved ranges must not be invented as requirements.
- INT39–62 and EXP13–41: 'Closed' denotes specification gap closure, not proof of code completion.
- CAN1637–1656: cloud/database/workflow/queue/storage/search/models/auth/KYC/payment/secrets/telemetry/analytics/notifications/numericSLO/residency choices require ADRs; vendor choices intentionally open.
- CAN1660–1670 assigns domain-specific document precedence. CAN1670 references Pithy1.7 whereas supplied COPY is1.8. AGT26 title1.4 but AGT35 control table says1.2; report document inconsistencies separately from code gaps.

## Requirement groups read (pending implementation verdict)

CAN13–65 architecture/public projection;23–43 independent progression lanes, nonexpanding revocable authority and execution-time checks;47 material return items drillable to provenance/permission/previous/result/evidence/audit.
CAN197–277 shared engine anatomy, typed invocation (principal/policy/evidence/tool plan/confidence/action/humangate/audit);279–294 twelve-state lifecycle;311–352 Core subsystems/context graph/crossengine routing.
CAN369–444 Clarity subengines, families, dashboard, four workflows and KPIs;461–537 Capability equivalent plus draft-only legal/commercial artifacts and server-side totals;554–629 Consistency durable work, criterion verification, release checks, upload scanning,stepup;646–722 Growth KPIs attribution,opportunities,experiments,modernization,guardrails.
CAN739–786 shared Tool Manifest fields, ten outcome workspaces;803–840 linked commercial source of truth, domain/deterministic/semantic/evidence verification and server release authorization.
CAN862–974 security: passkeys/MFA/sessionrisk/recovery/rotation;tenantRBAC+ABAC/propertyauthorization;trustedKYCprovider+velocity+four-eyes;edge/device/identity/cost/concurrencylimits;schemas/CSRF/CORS/SSRF/quarantine/managedsecrets/encryption/errorredaction;untrustedAIcontent/versionedevals;paymentledgeridempotency/beneficiarystepup;threatmodels/SAST/SBOM/secrets/IaC/DAST/pentest/alerts/IR/testedrestore.
CAN991–1011 five memory scopes,provenance,fact-v-inference,decisionrecord,tenant retention/deletion/export/legalhold.
CAN1028–1050 six connector types plus canonicalevents;1067–1167 nav,dashboardprogressivedisclosure,WCAG,15stillnessstates,motiontimings/reducedmotion,attentioninterventionlevels,terminologybans.
CAN1184–1194 eight audiencecontexts+expertrole;1211–1276 NFRs/signoff/securitytestpack;1293–1498 202capability registry Foundation/Expansion;1583–1670 legacy provenance/P0–P7/ADR/precedence.
CAN1674–1769 Expert Network:10ontologyaxes,20families,services,eligibility-before-ranking,objects/events,credentialexpiry,regulatedjurisdiction,fairness,confidentiality,conflicts,sanctions,sponsorship,5routes,podboundaries.
CAN1779–1893 shared resultfabric:17objecttypes,typedversionedenvelope,lineage,freshness,degradation,goalstates/subscriptions,constraints,impactgraph,conflict,universalopp,attention,recommendationlifecycle,attributionstrength,explicitcontexttransfers,multipartygoals,scenarios,escalation,explainablequality.
CAN1903–1965 scoping:uncertainty/QuickPost+BuildMyProject,4fieldhelp modes,claimstatus,canonicalcasefields/lifecycle,GreenAmberRed,qualifiedasyncqueue,SLA,versionedfeedbackuserreconciliation,nonpunitiveUX,acceptance;1969–1985 repeatslocks.
AGT168–207 mandatory agentenvelope with allowedtools,datapurpose,risk/time/cost/expiry/revoke/compensation,execution-timepolicy;226–255 30boundedroles;259–269 compositiontrace/memory/evidence;nondeterministicagentscannotbypasscontrols. AGT288–608 restates Core/engines/workspaces/returnstate. AGT537–571 manifest+invocation fields;632–833 repeats202inventory;852–891 repeats30roletoolmapping;910–965 securityandacceptance including all202stableIDs beforeproductionimplementation and independentlanecontrols. AGT993–1047 expertagents17toolcapabilities/eligibility/handoff;1057–1099 sharedintelligence16roles and scoping6roles/runtime;1103–1109 repeatedlocks.

## Code inspection started

- src/app/engineRegistry.mjs starts with mechanical port of247legacy S/R/C/Q/X/A/Z/P/F/G module entries; module fields name/purpose/dimensions/corrections/hrefs/inputs. Need follow actual runtime/UI before declaring conflict with AGT105 (legacy IDs not runtime/public).
- .github/workflows/ci.yml has npmci/check, three stress probes and ChromiumE2E, uploads failure artifacts. No SAST/SBOM/secret/IaC/DAST steps in this workflow. Search entire repo and distinguish external configured controls not verifiable.
- Initial exact manifest-key search in src/app only found agent_manifests SELECT in pricing.mjs. Need examine store schemas/seeds/agents (do not infer absent solely from string search).
