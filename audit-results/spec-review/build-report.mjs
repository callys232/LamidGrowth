import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { findings, coverage } from './assessments.mjs';
import { agentManifests } from '../../data/spec-review-snapshot/code/src/app/agents.mjs';
import { MODULE_REGISTRY } from '../../data/spec-review-snapshot/code/src/app/engineRegistry.mjs';
const out='audit-results/spec-review';
const root='data/spec-review-snapshot';
const manifest=JSON.parse(fs.readFileSync(`${out}/manifest.json`));
const routes=JSON.parse(fs.readFileSync(`${out}/route-audit.json`));
const probes=JSON.parse(fs.readFileSync(`${out}/boundary-probes-results.json`)).observations;
const text=p=>fs.readFileSync(p,'utf8');
const lines=id=>text(`${root}/documents/${id}.md`).split(/\r?\n/);
const save=(p,s)=>fs.writeFileSync(`${out}/${p}`,s+'\n');
const link=(ref)=>{const [p,n='1']=ref.trim().split(':');return /^[A-Z]+$/.test(p)?`[${p}:${n}](../../data/spec-review-snapshot/documents/${p}.md#L${n})`:`[${p}:${n}](../../data/spec-review-snapshot/code/${p}#L${n})`;};
const refs=s=>s.split(';').map(link).join(', ');
const fLinks=s=>s.split(' ').map(id=>`[F-${id}](REPORT.md#f-${id.toLowerCase()})`).join(', ');
const escape=s=>String(s).replace(/\|/g,'\\|').replace(/\r?\n/g,' ');
const table=(headers,rows)=>'| '+headers.join(' | ')+' |\n|'+headers.map(()=>'---').join('|')+'|\n'+rows.map(r=>'| '+r.map(escape).join(' | ')+' |').join('\n');

// Verify evidence paths/line references before generating review artifacts.
for(const f of findings) for(const r of [...f[4].split(';'),...f[5].split(';')]){
 const [p,n]=r.trim().split(':');const file=/^[A-Z]+$/.test(p)?`${root}/documents/${p}.md`:`${root}/code/${p}`;
 if(!fs.existsSync(file)) throw Error(`Missing citation ${r}`);
 if(Number(n)>text(file).split(/\r?\n/).length)throw Error(`Invalid line ${r}`);
}

coverage.COPY=routes.map(r=>[r.start,r.end,`${r.page}. ${r.name}: ${r.route??'consolidated into /experts'}`,r.page>=99?'WEB-02 WEB-03 EX-03':r.page>=67?'WEB-02 CORE-02 SI-01 SI-04':'WEB-01 WEB-03 UX-01']);
const lineLedger=[];const coverageRows=[];
for(const d of manifest.documents){
 let expected=1;
 for(const [start,end,topic,ids] of coverage[d.id]){
  if(start!==expected)throw Error(`Coverage discontinuity ${d.id}:${start} expected ${expected}`);
  for(const id of ids.split(' '))if(!findings.some(f=>f[0]===id))throw Error(`Unknown finding ${id}`);
  coverageRows.push([`${d.id}:${start}–${end}`,topic,fLinks(ids)]);
  const ls=lines(d.id);
  for(let n=start;n<=end;n++)lineLedger.push({document:d.id,line:n,text:ls[n-1],topic,findings:ids.split(' ').map(id=>'F-'+id),assessmentUnit:'reviewed topic; not an independent per-line compliance verdict'});
  expected=end+1;
 }
 if(expected!==d.lines+1)throw Error(`Coverage ends early ${d.id} ${expected}/${d.lines}`);
}
save('source-line-ledger.jsonl',lineLedger.map(x=>JSON.stringify(x)).join('\n'));
save('coverage.md',`# Document reading and requirement-topic coverage\n\nAll ${manifest.documents.reduce((n,d)=>n+d.lines,0).toLocaleString()} source lines are assigned below, without gaps or overlaps. Blank lines, headings, descriptive text, examples, historical material and contractual evidence obligations are included. This is a **reading/topic trace**, not 12,021 independent tested requirements. Findings supply code evidence and limits; not every sentence is a separate executable requirement. The [line ledger](source-line-ledger.jsonl) preserves exact text and mapping. The supplied documents are comparison material, not authorization to deploy, spend money or modify product code.\n\n${table(['Source lines','Reviewed subject','Assessments'],coverageRows)}`);

const ent=lines('ENT');
const toolRows=ent.slice(2717,2919).map((s,i)=>({line:2718+i,cols:s.split('|').slice(1,-1).map(x=>x.trim())}));
if(toolRows.length!==202||toolRows.some((r,i)=>r.cols[0]!==`T-${String(i+1).padStart(3,'0')}`))throw Error('Tool extraction failed');
const groups=[
 [1,33,'src/app/engines.mjs:194; src/app/engineIntelligence/selector.mjs:149','Deterministic diagnostic/decision/scenario families exist; canonical per-capability validated schemas, persisted result lineage and accuracy/evidence acceptance are not established.','TF-01 SI-01'],
 [34,57,'src/app/agents.mjs:338; src/app/creationStudio.mjs:1; src/app/projects.mjs:1','Commercial draft agents, versioned text assets and project objects exist. Each named planner/document type needs a canonical implementation/acceptance mapping; generic drafting is not proof of every tool.','TF-01 COMM-01'],
 [58,70,'src/app/talent.mjs:1; src/app/people.mjs:1; src/app/booking.mjs:1','Profiles, search, evidence, quizzes, roster/capacity utilities and availability exist. Complete eligibility, credential lifecycle, workforce/candidate workflows and semantic tool coverage are not established.','EX-03 EX-04 TF-01'],
 [71,80,'src/app/learning.mjs:1; src/app/talent.mjs:1','LMS primitives exist; trusted assessment, career-gap progression and the individual coaching/planning tool contracts are incomplete.','LEARN-01 TF-01'],
 [81,93,'src/app/creationStudio.mjs:1; src/app/documents.mjs:1; src/app/agents.mjs:338','Text assets, revisions, commercial drafting and PDF export exist. Dedicated research/content/presentation/SOP tool semantics and full publication/evaluation lifecycle are not established.','COMM-01 TF-01'],
 [94,104,'src/app/workflows.mjs:1; src/app/tasks.mjs:39','Durable five-tool workflow runtime and computed task attention exist; full process/cadence/SLA/compensation contracts remain incomplete.','WF-01 CORE-02'],
 [105,116,'src/app/projects.mjs:1; src/app/tasks.mjs:1','Project, task, milestone, change request and attention operations exist. Requires per-tool canonical mapping, dependency/resource/status contracts and concurrency acceptance.','COMM-01 DATA-01'],
 [117,129,'src/app/projects.mjs:341; src/app/verification.mjs:1','Criteria, submission reviews and human decisions/disputes exist; artifact-level deterministic integrity/quality verification and complete policy routing remain incomplete.','COMM-01'],
 [130,136,'src/app/payments.mjs:343; src/app/documents.mjs:1','Payment/ledger/attestation paths exist; unknown-outcome reconciliation, immutable evidence and contract-specific completion artifacts require work.','PAY-01 PAY-02 SEC-02'],
 [137,151,'src/app/engines.mjs:194; src/app/agents.mjs:172; src/app/signals.mjs:73','On-demand analytical agents/calculations exist; no evidence that each named market/customer/modernization tool has its required live sources and result contract.','SI-04 TF-01'],
 [152,162,'src/app/growth.mjs:1; src/app/outcomes.mjs:1; src/app/engineIntelligence/inputSpec.mjs:1','Metric/observation/outcome CRUD and numerical summaries exist; governed metric lineage, comparability and attributable impact are incomplete.','GROW-01 SI-03'],
 [163,177,'src/app/growth.mjs:1; src/app/engines.mjs:194','Experiment records and diagnostic planning calculations exist; the named experimentation/transformation tools are not certified by those generic mechanisms.','GROW-01 TF-01'],
];
const shared={
178:['src/app/knowledge.mjs:1','Workspace substring search, not the complete permission-filtered index/retrieval lifecycle.','CORE-01'],
179:['src/app/files.mjs:1','Upload/download present; quarantine, scanning, secure artifact lifecycle absent.','FILE-01'],
180:['src/app/messaging.mjs:1','Project-party messages present; pod delegation, broader collaboration and abuse acceptance incomplete.','EX-04 QA-01'],
181:['src/app/app.mjs:1272','Notification records/mail exist; full preferences, materiality and return-state policy incomplete.','CORE-02'],
182:['src/app/booking.mjs:101','Availability/booking present; atomic reservation and project validation gaps.','EX-04'],
183:['src/app/policy.mjs:1','Workspace roles do not implement organization hierarchy/inheritance.','AU-02'],
184:['src/app/expertTeams.mjs:1','Team records exist; policy-enforced project delegation incomplete.','EX-04 AU-02'],
185:['src/app/kyc.mjs:1','Manual KYC records/decisions; provider/assurance/evidence lifecycle incomplete.','SEC-03'],
186:['src/app/policy.mjs:1','Three roles implemented; complete layered policy/inheritance absent.','AU-02'],
187:['src/app/app.mjs:953','Audit exists but can be deleted; full immutable evidence contract incomplete.','SEC-02'],
188:['src/app/app.mjs:1570','Action decisions and audit exist; unified versioned Decision Log contract not established.','SEC-02 SI-01'],
189:['src/app/agentSources.mjs:1','Source references exist; versioned evidence registry and change propagation incomplete.','SI-01 SI-02'],
190:['src/app/app.mjs:440','Admin routes exist; step-up, policy hierarchy and protected evidence incomplete.','SEC-01 AU-02'],
191:['src/app/billing.mjs:1','Points/bundle commerce exists; full subscription/invoice/plan lifecycle not established.','AU-03 PAY-02'],
192:['src/app/finance.mjs:1','Points wallet exists; immutable ledger and currency-safe financial views need work.','SEC-02 PAY-02'],
193:['src/app/payments.mjs:1','Provider payment integration exists with recovery/validation gaps.','PAY-01 PAY-02'],
194:['src/app/payments.mjs:561','Signed/deduplicated payment webhook exists; generic event platform absent.','CORE-01 PAY-02'],
195:['src/app/models.mjs:1','Use-case approval exists; actual model/provider/version not approval-bound.','AI-01'],
196:['src/app/agentSources.mjs:1','Workspace source collection is not the specified typed temporal context graph.','CORE-01 SI-06'],
197:['server/index.mjs:103','Workflow/mail workers do not establish a general versioned domain event bus.','CORE-01'],
198:['src/app/policy.mjs:1','Local role and AI guards exist; complete policy-decision contract absent.','AU-01 AU-02'],
199:['src/app/ratelimit.mjs:1','Rate limiter and quotas exist; complete cross-flow abuse acceptance unverified.','QA-01'],
200:['src/app/files.mjs:1','No scanner/quarantine stage in upload lifecycle.','FILE-01'],
201:['src/app/kyc.mjs:1','Manual identity cases; broader identity-risk assessment/governance absent.','SEC-03'],
202:['src/app/operations.mjs:1','Configured mail/model/payment adapters exist; user connector registry/scopes/sync/revocation absent.','CORE-01'],
};
save('capabilities-202.md',`# T-001–T-202 capability trace\n\nCanonical names/phases are transcribed from ENT:2718–2919. Each row identifies **related inspected code**, not a claim of equivalent implementation. Every row still lacks a verified canonical manifest/implementation/acceptance crosswalk (F-TF-01). Foundation and Expansion remain separate; this inventory is not a demand to ship all 202 at first launch. Shared family evidence deliberately avoids inventing a one-to-one correspondence between legacy codes and canonical tools.\n\n${table(['ID / source','Canonical capability','Engine / epic','Phase / tier','Related implementation evidence','Difference / remaining acceptance','Findings'],toolRows.map((r,i)=>{
 const n=i+1,g=groups.find(g=>n>=g[0]&&n<=g[1]);const [e,assessment,ids]=g?g.slice(2):shared[n];
 return [link(`ENT:${r.line}`)+' '+r.cols[0],r.cols[2],r.cols[3]+' / '+r.cols[4],r.cols[5]+' / '+r.cols[6],refs(e),assessment,fLinks(ids)];
}))}`);
save('runtime-inventory.json',JSON.stringify({agentManifests,legacyEngineCount:Object.keys(MODULE_REGISTRY).length,legacyEngines:MODULE_REGISTRY,canonicalTools:toolRows.map(x=>({sourceLine:x.line,fields:x.cols}))},null,2));

const agentMap=[
['src/app/companionRouting.mjs:1; src/app/agents.mjs:940','Companion routing and bounded execution exist; complete plan/continuity/authority envelope missing.','AU-01 TF-01'],
['src/app/signals.mjs:1; src/app/agents.mjs:172','On-demand signal agent/manual scan, not continuous permitted monitoring.','SI-04'],
['src/app/agentSources.mjs:1','Source collection/context-curator exists; typed graph and memory scopes incomplete.','CORE-01 SI-06'],
['src/app/ai.mjs:1; src/app/intelligence.mjs:1','Evidence references/filtering exist; complete sufficiency/provenance service absent.','SI-01 COMM-01'],
['src/app/engines.mjs:194','Deterministic diagnostic families and diagnostic-intelligence agent; canonical envelope/evaluation incomplete.','TF-01 AI-01'],
['src/app/engineIntelligence/selector.mjs:149','Decision/selection computation exists; governed reusable decision artifacts incomplete.','TF-01 SI-01'],
['src/app/engineIntelligence/scenario.mjs:1','Scenario calculations exist; versioned assumptions and isolated result lineage incomplete.','SI-01 SI-06'],
['src/app/engineIntelligence/conflict.mjs:1','Related comparison/conflict calculations; canonical strategic-alignment runtime role not registered.','TF-01'],
['src/app/engineIntelligence/roadmap.mjs:1; src/app/agents.mjs:172','Planning calculations/capability mapper exist; commitment-bound resource plan orchestration incomplete.','TF-01 WF-01'],
['src/app/agents.mjs:338','Several commercial draft agents; complete structured/approved agreement lifecycle incomplete.','COMM-01'],
['src/app/talent.mjs:479','Matching exists, but eligibility/credential lifecycle/rationale snapshot gaps.','EX-03'],
['src/app/learning.mjs:1','Learning paths exist; trusted mastery and goal/capability continuity incomplete.','LEARN-01'],
['src/app/creationStudio.mjs:1','Text asset versions and commercial generators; full creation-format/publication role not registered.','TF-01 COMM-01'],
['src/app/engineIntelligence/financial.mjs:1; src/app/engineIntelligence/roster.mjs:1','Financial/capacity calculations exist; canonical resource/budget agent envelope not registered.','TF-01'],
['src/app/workflows.mjs:1','Durable bounded runtime exists; full branching/events/compensation incomplete.','WF-01'],
['src/app/tasks.mjs:1; src/app/projects.mjs:1','Execution CRUD and human transitions; complete project agent orchestration not registered.','TF-01 COMM-01'],
['src/app/tasks.mjs:39','Task attention exists; policy-governed cadence/SLA escalation incomplete.','CORE-02'],
['src/app/verification.mjs:1','Review primitives; generalized quality evidence/drift/correction role not registered.','COMM-01 TF-01'],
['src/app/projects.mjs:341','Notes/links review; no secure artifact/domain integrity verification.','COMM-01'],
['src/app/projects.mjs:1','Human approval/dispute states; full policy routing/dual-approval orchestration incomplete.','COMM-01 SEC-01'],
['src/app/payments.mjs:343','Payment paths exist; unknown outcome recovery/step-up/immutable ledger incomplete.','PAY-01 SEC-01 SEC-02'],
['src/app/signals.mjs:1; src/app/growth.mjs:1','Opportunity agent/CRUD exist; goal-aware continuous opportunities incomplete.','SI-04 GROW-01'],
['src/app/agents.mjs:172','Market-intelligence review agent; validated live market/customer evidence chain incomplete.','TF-01 SI-01'],
['src/app/engines.mjs:194','Modernization-related diagnostics, without canonical role/envelope mapping.','TF-01'],
['src/app/agents.mjs:304; src/app/growth.mjs:1','Performance analytics publishes a result; governed KPI/forecast/evidence model incomplete.','GROW-01 SI-01'],
['src/app/growth.mjs:1; src/app/agents.mjs:172','Experiment-builder and records exist; approved impact/variant/measurement runtime incomplete.','GROW-01'],
['src/app/engines.mjs:194','Related transformation diagnostics; canonical agent/commitment workflow not registered.','TF-01'],
['src/app/operations.mjs:1','Service adapters only; scoped general connector execution agent absent.','CORE-01'],
['src/app/messaging.mjs:1; src/app/mail.mjs:1','Messages/mail/reminders exist; complete scoped attention/collaboration role incomplete.','CORE-02'],
['src/app/errorLog.mjs:1; src/app/ratelimit.mjs:1','Logging/rate limits exist; canonical advisory anomaly/security agent not registered.','TF-01 QA-01'],
];
save('agents-30.md',`# Thirty canonical agent-role assessments\n\nThe runtime exports 31 differently scoped manifests, not these 30 certified roles. Related service behavior is credited below without equating a similarly named agent to the complete specification.\n\n${table(['Canonical role','Specification','Related code','Assessment','Findings'],ent.slice(2424,2454).map((s,i)=>{const c=s.split('|').slice(1,-1).map(x=>x.trim());return[c[0]+' '+c[1],link(`ENT:${2425+i}`),refs(agentMap[i][0]),agentMap[i][1],fLinks(agentMap[i][2])]}))}`);

const sec=[
['Partial','Account/recovery privacy responses exist; timing enumeration was not measured.','src/app/accounts.mjs:1'],
['Partial','IP/account/device controls exist; distributed evasion/lockout abuse not exercised here.','src/app/accounts.mjs:1'],
['Gap','No login MFA/passkey assurance; recovery/email OTP is not MFA.','src/app/accounts.mjs:1'],
['Partial','Random server sessions exist; privilege-change rotation/assurance lifecycle incomplete.','src/app/app.mjs:324'],
['Not demonstrated','No refresh-token flow; fixed session design needs equivalent theft/reuse defense evidence.','src/app/app.mjs:324'],
['Partial','Expiring single-use recovery and session invalidation exist; no MFA policy to preserve.','src/app/accounts.mjs:1'],
['FAIL reproduced','Unrelated account reads/declines another workspace handoff.','src/app/handoff.mjs:65'],
['Partial / gap','Admin guards exist; handoff functions lack role/recipient guards.','src/app/app.mjs:440; src/app/handoff.mjs:91'],
['Partial / gap','Strict schemas exist; context-selected enterprise tier and self-asserted causal strength need policy enforcement.','src/app/accounts.mjs:335; src/app/outcomeAttribution.mjs:11'],
['Implemented control; not exhaustive','Expected-workspace guard and membership lookup exist; cross-object exceptions still require tests.','src/app/app.mjs:380'],
['Partial','Membership/provider/workflow rechecks exist; cross-service delegated revocation incomplete.','src/app/aiPolicy.mjs:1; src/app/workflows.mjs:183'],
['Partial','KYC admin transition guard exists; evidence/assurance threshold incomplete.','src/app/kyc.mjs:1'],
['Missing integration','No KYC-provider callback flow implemented; provider ADR open.','src/app/kyc.mjs:1'],
['Not demonstrated','No complete source-version binding and verification invalidation acceptance.','src/app/kyc.mjs:1'],
['Partial','Rate limits exist; cross-tenant/device distributed evasion untested in this run.','src/app/ratelimit.mjs:1'],
['Implemented controls; not exhaustive','Provider budgets/locks and atomic points charging exist; soak/cost abuse still required.','src/app/aiPolicy.mjs:1; src/app/agents.mjs:940'],
['Partial','Byte limit exists; future archive/process limits and resource soak not demonstrated.','src/app/files.mjs:1'],
['FAIL reproduced','HTML accepted and served inline with caller MIME.','src/app/files.mjs:1'],
['Missing control','No malware scanner/quarantine stage; no malware test performed.','src/app/files.mjs:1'],
['Not demonstrated','No general safe URL-fetch gateway; current delivery review does not fetch URLs. Do not infer active SSRF from missing future gateway.','src/app/projects.mjs:341'],
['Not demonstrated','Redirect revalidation requires evidence when connector/URL fetching is enabled.','src/app/operations.mjs:1'],
['Partial','Untrusted-content prompt instructions and deterministic authority gates; no full red-team pack run.','src/app/ai.mjs:1; src/app/agents.mjs:940'],
['Partial','Source filtering exists; complete retrieval/prompt adversarial acceptance unverified.','src/app/aiPolicy.mjs:1'],
['Partial','Zod schemas and workflow gates; full tool manifest and all argument paths not certified.','src/app/workflows.mjs:127'],
['Partial / gap','Workspace retrieval checks exist; handoff disclosure is a separate cross-account failure.','src/app/agentSources.mjs:1; src/app/handoff.mjs:65'],
['Implemented control; not rerun','Raw-body HMAC payment signature guard exists.','src/app/payments.mjs:561'],
['Partial','Webhook dedupe exists; early callback and reconciliation windows need fault tests.','src/app/payments.mjs:561'],
['Gap','Server-derived purchase data exists, but callback amount/currency not reconciled.','src/app/payments.mjs:628'],
['Gap','Atomic release claim exists; unknown-outcome retry can use new reference.','src/app/payments.mjs:343'],
['Partial','Expected milestone state gates exist; full concurrent dispute/approval/payment acceptance not rerun.','src/app/payments.mjs:343'],
['Gap','No current-assurance/dual-control beneficiary protection.','src/app/payments.mjs:1'],
['Gap','Account deletion removes points ledger rows.','src/app/app.mjs:938'],
['Implemented control; not exhaustive','Origin/content-type guards and cookie controls exist.','src/app/app.mjs:280'],
['Implemented control; not exhaustive','Explicit origin handling exists; deployed proxy/origin configuration not validated here.','src/app/app.mjs:250'],
['Partial','Parameterized SQL and strict schemas common; full parser/command injection suite not run.','src/app/tasks.mjs:1'],
['Not certified','Secret-bearing environment was not dumped; dedicated bundle/log/model leakage assessment not performed.','src/app/aiPolicy.mjs:1'],
['Partial / gap','Route surface inventoried; public demo accepts fallback engine codes; no OpenAPI compatibility inventory.','src/app/engines.mjs:480'],
['Gap','Provider responses and payment callbacks lack complete domain reconciliation; AI structured output has guards.','src/app/payments.mjs:628; src/app/ai.mjs:1'],
['Gap','Audit exists but deletable and lacks complete required envelope.','src/app/app.mjs:953'],
['Not certified','General rate limiting exists; invite/message/booking/review/dispute/export abuse pack not run. Booking race identified statically.','src/app/ratelimit.mjs:1; src/app/booking.mjs:101'],
];
save('security-40.md',`# SEC-001–SEC-040 acceptance assessment\n\nThese are code-control assessments, **not a claim that all 40 security tests ran**. Only explicitly reproduced findings have runtime evidence in this audit. Passing guards in one module does not establish the same boundary across every endpoint.\n\n${table(['ID / specification','Threat','Assessment','Evidence / limitation','Code'],ent.slice(2670,2710).map((s,i)=>{const c=s.split('|').slice(1,-1).map(x=>x.trim());return[c[0]+' '+link(`ENT:${2671+i}`),c[1],sec[i][0],sec[i][1],refs(sec[i][2])]}))}`);

const workstreamMap={EX:['EX-03','EX-03 SEC-03','EX-03','EX-01 EX-02 EX-04','EX-04','COMM-01 PAY-01','EX-03 SI-03','WEB-02 WEB-01 UX-01','SC-01 SC-02 EX-03','CORE-01 OPS-01'],SI:['SI-01','SI-01','SI-02','SI-04','SI-04','SI-02','SI-05','SI-04','CORE-02','SI-05','SI-03','SI-06'],PS:['SC-03','SC-03','SC-03','SC-01','SC-05','SC-02 SC-03','SC-03','SC-01 SC-05','SC-05 CORE-02','SC-02 QA-01']};
const deliveryRows=lines('DEL').flatMap((s,i)=>{const c=s.split('|').slice(1,-1).map(x=>x.trim());const m=c[0]?.match(/^(EX|SI|PS)-(\d\d)(?: (.+))?$/);if(!m)return [];const id=workstreamMap[m[1]][Number(m[2])-1];return [[`${m[1]}-${m[2]}`,m[3]??c[1],link(`DEL:${i+1}`),fLinks(id),m[3]?c[1]+' Acceptance: '+c[2]:c[2]]];});
save('extension-delivery.md',`# Expert, shared-intelligence and scoping delivery trace\n\nCanonical EX/SI/PS IDs below are **specification work packages**; audit finding IDs are prefixed F- to avoid confusing the two. Related findings overlap intentionally.\n\n${table(['Package','Required component','Source','Related findings','Specified deliverable'],deliveryRows)}`);

const delta=[];
for(const file of manifest.code){let current;try{current=fs.readFileSync(file.path)}catch{delta.push({path:file.path,state:'removed'});continue;}if(crypto.createHash('sha256').update(current).digest('hex')!==file.sha256)delta.push({path:file.path,state:'changed'});}
save('working-tree-delta.json',JSON.stringify({checkedAt:new Date().toISOString(),snapshotAt:manifest.capturedAt,changedOrRemovedTrackedSnapshotFiles:delta},null,2));
const counts=Object.fromEntries(['P0','P1','P2'].map(p=>[p,findings.filter(f=>f[1]===p).length]));
const planned=routes.filter(r=>r.dispatch.includes('PlannedModule'));
const docsTable=table(['Document','Lines','Principal assessment'],manifest.documents.map(d=>[link(`${d.id}:1`),d.lines,({CAN:'Core doctrine partially implemented; authority, interoperability and security gaps.',INT:'Foundational CRUD exists; continuity, relevance, lineage and evidence semantics incomplete.',EXP:'Expert records exist; qualification, confidentiality and delegated engagement gaps.',AGT:'Real calculators/runtime exist; canonical role/tool contracts and registry mapping incomplete.',ENT:'Partial application implementation; enterprise/security/operations acceptance unproven.',DEL:'Delivery/acceptance obligations substantially unfulfilled or require external evidence.',BRAND:'Palette/motion foundations exist; stillness/attention/manual acceptance incomplete.',COPY:'99 content entries; 13 planned OS route fallbacks; four expert page consolidations.'})[d.id]]));
const report=[
'# LAMID ONE specification-to-code audit',
`The repository implements a substantial application, but it does **not yet implement the complete eight-document architecture or satisfy its production acceptance gates**. The largest gaps concern human-controlled continuity, shared intelligence/evidence, expert authorization, safe payment recovery, secure uploads, enterprise governance and operational proof.`,
`This review read all **8 documents / 12,021 lines**, compared their requirements with the frozen repository, and produced ${findings.length} consolidated findings (${counts.P0} P0, ${counts.P1} P1, ${counts.P2} P2). Finding count is not a completion percentage. Several requirements are phased, descriptive, historical or require external evidence; they are not all first-release blockers.`,
'## Scope and evidence discipline',
'**Historical baseline:** subsequent code changes are not automatically covered by this report. The [context-transfer addendum](context-transfer-addendum.md) credits a later implementation and its two passing tests. For the newer request about working tools, use the separately captured working-tools manifest and test results; do not treat a historical gap as proof that a later implementation still has it.',
`Baseline: **${manifest.capturedAt}**, HEAD **${manifest.head}**, including the dirty/untracked application files listed in [manifest.json](manifest.json). This is not simply a clean-commit audit. Snapshot code is preserved under [data/spec-review-snapshot/code](../../data/spec-review-snapshot/code). ${delta.length} captured files differ or are removed in the working tree at report generation; see [delta](working-tree-delta.json). Findings apply to the frozen snapshot and require revalidation against changed code. New files added after the snapshot are not assessed.`,
'Document instructions were treated as requirements to compare, not commands to execute. No production configuration, customer data, money transfer, deployment or product source was changed by this audit. Synthetic tests used a local disposable PostgreSQL schema and no live AI/payment/email provider. No internet research was necessary for comparing supplied specifications with local code.',
'**Meaning of labels:** Reproduced = observed with synthetic requests; Static = a concrete code path demonstrates a gap/risk, without runtime reproduction; Partial = useful implementation falls short of the full contract; Missing contract = not represented in the inspected schema/services/routes; External evidence required = cannot be decided from repository contents. P0 denotes a release-blocking security/payment boundary in this assessment, not a claim of actual exploitation or loss. P1 is core correctness/acceptance work; P2 is experience/documentation work. These audit priorities do not override the suite’s contracted severity process.',
'The [coverage matrix](coverage.md) and [exact source-line ledger](source-line-ledger.jsonl) account for every source line. They map lines to reviewed topics and evidence-backed findings; they do not pretend that 12,021 source lines equal 12,021 independent test assertions or that every application code line received exhaustive security review.',
'## What is already implemented',
'- AI Settings is visible in the user sidebar; source-kind/feature/points controls and workflow block/ask/allow choices exist. External AI calls have consent/policy checks and bounded usage. See F-AU-01.\n- Users can create, edit and delete goals; the goal API has lifecycle stages and subscriptions. Goal stage changes invalidate direct results. Edit/delete propagation remains incomplete. See F-SI-02.\n- Workflows are persisted and executed with locking, principal and policy rechecks, approval-version binding, pause/cancel/expiry and bounded retry. See F-WF-01.\n- Commercial projects, tasks, deliverables, criteria, submissions, human approvals/disputes, funding and transfer records exist. Payment signatures, deduplication and an atomic release claim are valuable existing controls. See F-COMM-01 and F-PAY-01/02.\n- Expert profiles/taxonomy, credential records, matching, watches, teams, availability, scoping drafts/guidance/versions and reviewer queues exist. Explicit expert packages enforce the named recipient and revocation. See F-EX-01/03/04 and F-SC-03.\n- Learning paths, enrollment/prerequisites, progress/certificates, KPI observations, experiments, recommendations and outcomes have real persistence. Their evidence and continuity contracts need strengthening.\n- Canonical colors, reduced-motion handling, restrained transitions and orbit fallback/settling controls exist. Existing public copy is largely preserved.',
'## Highest-priority corrections',
'1. Close cross-account handoff read/decline and qualified-review disclosure boundaries (F-EX-02, F-SC-02).\n2. Prevent retries of unknown-outcome payments until provider reconciliation; persist dispatch references first (F-PAY-01/02).\n3. Add secure upload quarantine/type/scanning/download controls (F-FILE-01).\n4. Enforce red-band qualified review; stop self-asserted verified-causal evidence and untrusted assessment mastery (F-SC-01, F-SI-03, F-LEARN-01).\n5. Preserve consequential audit/ledger history and add privileged assurance/step-up (F-SEC-01/02).\n6. Make goal constraints, source permissions, lifecycle invalidation and return-state real end-to-end behavior (F-SI-01/02/04/05/06, F-AU-01, F-CORE-02).',
'## Tests performed for this audit',
'[Focused regression log](focused-tests-executed.log): **29 passed, 0 failed, 0 skipped** across intelligence, signals, goals, scoping, field guidance, reviewer SLA, scope versions, recommendations, attribution and expert context packages. The initial sandbox launch failed with spawn EPERM before tests executed; that environment failure is kept separately in focused-tests.log. It is not counted as a product test failure.',
table(['Boundary probe','HTTP / observation'],probes.map(p=>[p.probe,`${p.status}; observed=${p.observed}${p.mime?'; '+p.mime:''}`])),
'The six observations above reproduce four defect categories, not six independent suites. [Probe source](boundary-probes.mjs) and [results](boundary-probes-results.json) are retained. The HTML sample was inert; no script exploit or malware execution was attempted. The financial timeout/claim races were inspected statically, not exercised against a live provider.',
'This was **not another full-suite run**. Earlier full-suite results in [2026-09-23-run2](../2026-09-23-run2/results.json) apply to that earlier code state and retain their failures. They are not superseded by 29 passing focused tests. Browser/a11y/manual visual checks, live AI evaluations, staging SLOs, backup restore and external security review were not performed in this audit.',
'## Document-by-document assessment',docsTable,
'## Inventory and traceability artifacts',
'- [Every source-line/topic mapping](coverage.md) and [machine-readable line ledger](source-line-ledger.jsonl).\n- [202 canonical capabilities](capabilities-202.md), preserving Foundation/Expansion and named requirements. Related legacy functionality is not certified equivalence.\n- [30 canonical agent roles](agents-30.md), compared with the 31 runtime manifests.\n- [40 mandatory security acceptance cases](security-40.md), explicitly distinguishing controls from executed tests.\n- [32 EX/SI/PS extension delivery packages](extension-delivery.md).\n- [103-page route/copy inventory](route-audit.md) and [raw route data](route-audit.json).\n- [Runtime inventory](runtime-inventory.json), [snapshot hashes](manifest.json), [working-tree delta](working-tree-delta.json).',
'## Route gaps',
`These ${planned.length} specified OS URLs fall through to PlannedModule in App.tsx:`,
planned.map(r=>'- `'+r.route+'`').join('\n'),
'Some controls exist elsewhere: notifications at /os/settings/notifications, privacy/export within other settings flows, and commercial billing/finance routes. The finding concerns the prescribed destination and complete flow, not an assertion that no related implementation exists. Expert pages 100–103 are consolidated into /experts; the content test explicitly treats that consolidation as acceptable, while the supplied 103-page specification still presents them separately. Resolve this as a documented route/product decision rather than silently changing the acceptance count.',
'## Detailed findings',
...findings.map(([id,priority,status,title,spec,code,observed,next])=>`<a id="f-${id.toLowerCase()}"></a>\n\n### F-${id} — ${title}\n\n**${priority} · ${status}**\n\nRequirement: ${refs(spec)}.\n\nCode evidence: ${refs(code)}.\n\n${observed}\n\n**Needed:** ${next}`),
'## Document conflicts and matters requiring external evidence',
'- Use the suite’s domain-specific precedence, with supplied COPY v1.8 for latest copy. Older embedded v1.2/v1.3/v2.1 labels and 98-page references must be reconciled; do not discard later appendices. CAN’s precedence still mentions copy v1.7.\n- ADR-009 through ADR-013 refer to different decisions between CAN and ENT. Create one register with aliases; do not silently assume identical IDs mean identical decisions.\n- Risk vocabularies R0–R4 and Low/Moderate/High/Consequential need a declared mapping. Green/amber/red scoping has its own review semantics.\n- Historical Step 4, reserved section ranges and legacy S/Z-series extensions are explicitly unresolved/reserved. They are not missing product features to invent.\n- “Closed” in gap-closure documents means the design describes a solution; the implementation and acceptance still need evidence.\n- The delivery budget/timeline is a reference, not evidence of a funded or executed contract. Staffing, procurement, signed acceptance, legal/privacy text approval and vendor arrangements are not decidable from code.\n- Modular monolith deployment is allowed. A Vite/Express implementation is not automatically defective because a document prefers Next.js; deviations need the specified architecture decision. Equivalent tools can satisfy requirements if proven.\n- No inference is made that the actual VPS/database has no backups, TLS, monitoring or HA. Those require configuration, measurements and restore/incident evidence. Production targets include 99.95% monthly availability, read p95 350 ms, write p95 700 ms, AI visible response 5 s, webhook 95% within 60 s, RPO 5 min and critical RTO 60 min, subject to the open SLO ratification decision (ENT:1784–1794). These are requirements, not measured results.',
'## Recommended implementation order and completion evidence',
'1. **Protect existing users and transactions.** Fix P0 boundaries; qualification/red-scope gates; assurance, ledger retention and payment callback validation. Exit evidence: negative account-isolation tests, atomic-claim tests, provider fault-injection/reconciliation tests and secure upload lifecycle tests.\n2. **Make the connected goal flow coherent.** Versioned goals/results/evidence, independent grants, constraints/readiness matching, deletion/revocation propagation, recommendation execution, expert proposal reconciliation and attributable outcomes. Exit evidence: the INT acceptance examples run end-to-end, including changed goals, expired credentials, disconnected sources, absent experts and personal-to-organization privacy.\n3. **Normalize runtime contracts.** Canonical four-engine/tool/agent mapping; complete manifests, events, scoped connectors and durable workflow constructs. Exit evidence: per-capability contract/evidence/permission tests for the agreed Foundation release; Expansion remains separately tracked.\n4. **Complete the promised experience.** Resolve every route/CTA, implement return-state/attention and organization settings, correct public SEO and motion, validate accessibility and all eight audience journeys. Exit evidence: route-level and browser acceptance, manual assistive-technology review and crawl/performance reports.\n5. **Prove release readiness.** Re-run the full suite on the final code, deploy a production-shaped staging environment, measure aggregate DB use/timeouts/SLOs, exercise restore/failover/rollback and collect required security/operational/legal/UAT approvals. Only then claim the production gates are satisfied.',
'No product fixes were made as part of this comparison. The report supplies a concrete backlog and evidence boundaries; it does not certify the site as production-ready.'
];
save('REPORT.md',report.join('\n\n'));
save('findings.json',JSON.stringify(findings.map(([id,priority,status,title,spec,code,observed,needed])=>({id:'F-'+id,priority,status,title,spec,code,observed,needed})),null,2));
console.log(JSON.stringify({documents:manifest.documents.length,sourceLines:lineLedger.length,findings:findings.length,priorities:counts,tools:toolRows.length,agents:agentMap.length,security:sec.length,deliveryPackages:deliveryRows.length,plannedRoutes:planned.length,changedFiles:delta.length},null,2));
