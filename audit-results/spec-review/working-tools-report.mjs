import fs from 'node:fs';
import { MODULE_REGISTRY } from '../../data/working-tools-review-20260924/src/app/engineRegistry.mjs';
const root='data/working-tools-review-20260924';
const out='audit-results/spec-review';
const raw=fs.readFileSync(`${out}/working-tools-full-backend.log`);
const log=raw.toString(raw[0]===0xff&&raw[1]===0xfe?'utf16le':'utf8').replace(/^\uFEFF/,'');
const summary=Object.fromEntries(['tests','pass','fail','skipped','cancelled'].map(k=>[k,Number(log.match(new RegExp(`^# ${k} (\\d+)`,'m'))?.[1])]));
if(Object.values(summary).some(Number.isNaN))throw Error('Wait for the complete backend run.');
const results=[...log.matchAll(/^(not ok|ok) (\d+) - (.*)$/gm)].map(m=>({status:m[1]==='ok'?'pass':'fail',number:Number(m[2]),test:m[3]}));
const failures=results.filter(r=>r.status==='fail');
const entries=[
 ['Financial Visibility (F01)','Calculates financial summaries from supplied figures; the API test independently checks gross margin and point charging.','engines','a financial-kind run','Does not establish real-time bank integration or every financial metric’s correctness.'],
 ['Assessment scoring (tested through S01)','Accepts declared dimensions, rejects unknown dimensions and charges only an accepted run.','engines','an assessment-kind run refuses','Does not establish the accuracy of the business diagnosis or the full Strategic Identity Statement promise.'],
 ['Quote Generator','Computes a quote from the recorded job budget range.','agents','quote and estimate generators','Deterministic budget arithmetic; not market-price validation.'],
 ['Estimate Generator','Returns the recorded lower/upper budget range for the job.','agents','quote and estimate generators','Not a verified delivery-cost forecast.'],
 ['Invoice Generator','Invoices approved milestones using the exact recorded amount.','projects','the invoice generator only invoices','Actual payment collection is a separate provider-dependent operation.'],
 ['Indicative FX Converter','Converts using the stored rate; handles same currency and rejects missing pairs.','fx','converts using the stored indicative rate','Display-only indicative conversion; no claim of live exchange-rate freshness.'],
 ['Creation Asset Manager','Persists a generated asset, lists it, creates revisions and removes the version chain.','creation-studio','a creation asset can be revised','Concurrent editing and immutable retention are separate acceptance concerns.'],
 ['Document PDF Export','Exports a completed document as a PDF and rejects another workspace’s access.','documents','a completed document run can be exported','Tests verify valid PDF header/access; not visual layout of every possible document.'],
 ['Document Attestation','Records a signer and a content-hash-bound attestation.','documents','signing a document records','An in-app attestation; not a qualified electronic signature.'],
 ['Workflow Runtime','Applies block/ask/allow rules, version-bound approval, tenant/principal checks, pause/expiry, bounded retry and restart recovery.','workflows','human workflow rules block writes','Verified built-in runtime behavior; not every canonical workflow/connector/compensation capability.'],
 ['Task Manager','Creates, lists, updates and deletes tasks for project parties.','tasks','a task can be created','This does not independently certify all assignment/edit concurrency edge cases.'],
 ['Deadline / Blocker Attention','Surfaces overdue or blocked open tasks and excludes completed tasks.','tasks','overdue and blocked tasks','Computed attention feed; not continuous external notifications.'],
 ['Change Request Manager','Allows parties to request changes and only the owner to decide them; rejects a repeated decision.','tasks','a change request can be opened','Approval recording does not itself prove every downstream scope/money effect.'],
 ['Milestone / Deliverable Workflow','Persists the project–milestone–deliverable–submission–review–approval sequence and checks client/freelancer roles.','projects','the full milestone lifecycle','Content verification in this test does not certify actual external artifact quality.'],
 ['Dispute Record Manager','Creates a dispute record and changes the milestone to disputed.','projects','disputing a milestone opens','Resolution fairness and actual funds recovery require separate validation.'],
 ['Project Closeout / Completion Certificate','Requires fully paid milestones before closing and issuing the completion certificate.','tasks','a project can only be closed','Uses test-controlled payment state; not evidence of live settlement.'],
 ['Project Messaging','Stores ordered messages between project parties and rejects unrelated accounts.','messaging','both project parties can post','No claim of delivery to external chat/email providers.'],
 ['Goal Pathway Templates','Produces family-appropriate steps while retaining supplied success conditions and constraints.','goal-pathways','pathways fit goal families','Template behavior; not validation of live AI advice.'],
 ['Goal Lifecycle Manager','Starts a goal at captured and enforces allowed lifecycle transitions and terminal states.','goals','goal lifecycle stage only moves','The broader dependency/change-propagation contract is separate.'],
 ['Goal Subscription Manager','Creates, lists and removes goal subscriptions.','goals','a goal subscription can be created','This does not certify matching relevance, constraint enforcement or continuous scanning.'],
 ['Intelligence Result Retrieval','Reads fresh stored results and excludes expired results; rejects other-workspace access.','intelligence','a fresh intelligence result is readable','Not certification of the full typed result/lineage fabric.'],
 ['Intelligence Conflict Flagging','Flags different conclusions for the same subject for human review.','intelligence','two agents reaching different conclusions','A conflict flag is not automatic evidence reconciliation.'],
 ['Recommendation Tracking','Persists an advisor recommendation and accepts it; stage changes invalidate linked stale results/recommendations.','recommendations','goal-advisor creates a trackable','Execution scheduling, causal validity and ordinary edit/delete propagation need their own proof.'],
 ['Scoping Draft Manager','Starts a saved scope from an objective without requiring all fields first.','scoping','a scoping case can start','Qualified review/publication and resume UX are separate.'],
 ['Field Guidance','Returns Explain, Example, Suggest and Help-me-decide responses and rejects unsupported fields/strangers.','field-guidance','field guidance exposes','Tests prove the contract and non-destructive suggestions, not expert-quality reasoning.'],
 ['Scope Version History','Stores distinct attributed snapshots on successive saves.','scope-versions','a scoping case accumulates a version','Does not certify simultaneous edits or expert proposal reconciliation.'],
 ['Reviewer Response-Window Calculation','Computes an SLA from declared availability and leaves it absent when none is declared.','reviewer-sla','an expert can declare review availability','This does not prove qualification, deadline monitoring or delivery within that SLA.'],
 ['Expert Profile Manager','Creates and updates a profile.','talent','a profile can be created','Profile persistence does not verify credentials or eligibility.'],
 ['Skills Assessment Grader','Grades the supported quiz banks deterministically and rejects unsupported skills.','talent','skills assessments are graded deterministically','Limited to supported assessments, not all professions.'],
 ['Scoped Expert Context Package','Grants a package to the engaged expert, resolves it, rejects foreign objects and blocks resolution after revocation.','expert-context-package','a client can grant a scoped','Expiry, purpose and broader delegation semantics are separate.'],
 ['Explicit Context Transfer','Copies records or grants revocable reference/promote pointers between permitted workspaces.','context-transfer','promoting a personal goal','The anonymize operation is not certified to remove identifying information.'],
 ['Learning Path / Enrollment Manager','Creates paths/modules, tracks module completion and blocks enrollment until prerequisites are met.','learning','prerequisites block enrollment','Completion/score tracking is not independently verified mastery.'],
 ['Learning Assignment / Compliance Tracker','Assigns paths with due dates and restricts compliance requirement creation to administrators.','learning','assigning a path sets','Does not establish organization-wide compliance certification.'],
 ['KPI Observation Tracker','Creates KPI definitions, records observations, lists and deletes them.','growth','a KPI can be defined','Does not certify metric source quality or causal impact.'],
 ['Opportunity Pipeline Tracker','Creates, changes pipeline status and deletes opportunities.','growth','an opportunity can be created','Not certification of goal-aware opportunity discovery.'],
 ['Experiment Tracker','Enforces draft → running → complete transitions.','growth','an experiment moves through','Not validation of experiment design/statistical conclusions.'],
 ['Experiment Builder — persistence duty','Creates a persisted draft experiment.','growth','experiment-builder persists a real draft','AI-generated hypothesis quality is not certified.'],
 ['Performance Analytics — data retrieval duty','Includes actual stored KPI data in the analytics context.','growth','performance-analytics reports real KPI data','Not independent validation of live model conclusions.'],
 ['Opportunity Signals — pipeline retrieval duty','Includes actual stored opportunity pipeline data.','growth','opportunity-signals reports real pipeline data','Not validation of continuous external signal monitoring.'],
 ['Human AI Rules','Rejects unknown permissions, bounds feature/cost/source access and rejects an AI result when policy changes during the request.','ai-rules','external AI rejects a response','Tests use controlled providers; full cross-service lane governance is separate.'],
 ['Agent Points Charging / Refunds','Debits successful runs, refunds failed runs and rejects insufficient balance.','agents','a failed agent run refunds','Not certification of fiat ledger retention or settlement.'],
 ['Proposal Drafter — integration duty','Grounds its input in the real job, rejects unrelated users and persists the resulting draft.','agents','the proposal drafter grounds','Provider-controlled tests do not establish live writing or commercial quality.'],
 ['Scope Builder — integration duty','Uses the real job and rejects unrelated users.','agents','the scope builder grounds','Complete scoping/review requirements are broader.'],
 ['Contract Builder — integration duty','Uses the real job and rejects unrelated users.','agents','the contract builder grounds','No legal correctness or enforceability certification.'],
 ['Change Order Generator — integration duty','Uses the real proposal and rejects unrelated users.','agents','the change order generator grounds','No live drafting-quality or downstream commitment certification.'],
];
const rows=entries.map(([tool,duty,file,needle,limit])=>{
 const matched=results.filter(r=>r.test.includes(needle));
 const status=matched.length&&matched.every(r=>r.status==='pass')?'PASS for stated duty':'NOT VERIFIED';
 const content=fs.readFileSync(`${root}/tests/${file}.test.mjs`,'utf8').split(/\r?\n/);
 const line=content.findIndex(l=>l.includes(needle))+1;
 return {tool,duty,status,testFile:`tests/${file}.test.mjs`,line,testNumbers:matched.map(r=>r.number),limit};
});
const clean=s=>String(s).replaceAll('|','\\|');
const table=rows=>'| Tool / component | Verified duty | Test evidence | Boundary |\n|---|---|---|---|\n'+rows.map(r=>`| ${clean(r.tool)} | ${clean(r.duty)} | ${r.status}; [${r.testFile}](../../${root}/${r.testFile}#L${r.line}); tests ${r.testNumbers.join(', ')} | ${clean(r.limit)} |`).join('\n');
const passing=rows.filter(r=>r.status.startsWith('PASS'));
fs.writeFileSync(`${out}/working-tools.json`,JSON.stringify({at:new Date().toISOString(),summary,entries:rows,failures},null,2));
fs.writeFileSync(`${out}/working-tools.md`,[
'# Verified working tool duties',
`Fresh frozen backend run: **${summary.tests} tests; ${summary.pass} passed; ${summary.fail} failed; ${summary.skipped} skipped; ${summary.cancelled} cancelled**. [Full log](working-tools-full-backend.log), [source hashes](working-tools-manifest.json). Tests ran on local disposable PostgreSQL schemas, with external AI/payment/email providers disabled or replaced by test doubles. Some fixtures deliberately fund workspaces and grant entitlements. Browser access, real-provider quality/settlement and production operation were not verified by this run.`,
`The table contains ${passing.length} working duties with matching passing tests. It is deliberately more precise than calling entire products “fully working.” Related checks can establish persistence/authorization while leaving reasoning quality, concurrency, privacy or the full specification incomplete. Services not listed here are **not automatically broken**; they lack the same reviewed duty-level evidence in this inventory.`,
table(passing),
'## Registered engines are not independently certified tools',
'The [248-entry engine register](registered-engines.csv) lists every current configured engine name, input kind and purpose. Catalog presence and shared computation do not prove that each module fulfils its advertised purpose. Only F01 financial calculations and S01 assessment input/charging behavior receive the specific fresh API assertions described above. Other engine families need independent expected-output and duty-acceptance cases before joining a verified list.',
'## Incomplete / excluded claims',
'Do not infer from the passing rows that continuous goal-aware matching, verified causal attribution, credential-qualified expert ranking, red-band specialist reconciliation, true anonymization, live AI advice quality, live payment settlement, or all 202 canonical capabilities are complete. Each needs its own acceptance evidence. The older [specification audit](REPORT.md) remains tied to its earlier frozen baseline; later fixes require current tests and code review.',
failures.length?'Failed checks in this run:\n\n'+failures.map(f=>`- Test ${f.number}: ${f.test}`).join('\n'):'No backend assertions failed in this run. This does not establish untested properties or full production readiness.',
'## Complete executed behavior index',
'Every backend assertion, including supporting account/security/billing services, is listed below so the selected product-tool table does not hide failures or omit the wider test evidence.',
results.map(r=>`- ${r.status.toUpperCase()} ${r.number}: ${r.test}`).join('\n'),
].join('\n\n')+'\n');
const csv=s=>'"'+String(s??'').replaceAll('"','""')+'"';
fs.writeFileSync(`${out}/registered-engines.csv`,['code,name,input_kind,advertised_purpose,verification',...Object.entries(MODULE_REGISTRY).map(([id,v])=>[id,v.engineName,v.inputs?.kind,v.purpose,id==='F01'?'Specific financial API arithmetic asserted':id==='S01'?'Specific assessment API input/charging asserted':'Registered; advertised duty not independently certified'].map(csv).join(','))].join('\n')+'\n');
console.log(JSON.stringify({summary,listedPassingDuties:passing.length,unverifiedRows:rows.filter(r=>!r.status.startsWith('PASS')).map(r=>r.tool),failures},null,2));
