import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
const root = 'lamiddoc/test-results/full-ui/';
async function read(name) {
  if (!existsSync(root + name)) return null;
  for (let i = 0; i < 30; i++) {
    try {
      return JSON.parse(readFileSync(root + name, 'utf8'));
    } catch {
      await new Promise((done) => setTimeout(done, 50));
    }
  }
  throw new Error(`Unable to read an intact snapshot: ${name}`);
}
const [
  pages,
  publicReport,
  tools,
  retries,
  commerce,
  commerceSummary,
  mobile,
  server,
  apiOnly,
  rechecks,
] = await Promise.all(
  [
    'pages.json',
    'public-controls.json',
    'tools.json',
    'tools-retry.json',
    'commerce.json',
    'commerce-summary.json',
    'mobile-accessibility.json',
    'server-commerce.json',
    'server-commerce-api-only.json',
    'targeted-ui-rechecks.json',
  ].map(read),
);
const tally = (rows) =>
  rows.reduce((out, row) => ((out[row.outcome] = (out[row.outcome] || 0) + 1), out), {});
const fixed = await read('audit-fixes-browser.json');
const accessibility = await read('accessibility-regression.json');
const refund = await read('server-commerce-refund-browser.json');
const invoicePrereq = await read('server-commerce-invoice-prereq.json');
const controls = [
  ...(pages?.controls || []).map((row) => ({ suite: 'Demo controls', ...row })),
  ...(publicReport?.controls || []).map((row) => ({
    suite: 'Public controls',
    profile: 'Public',
    ...row,
  })),
];
const engines = (tools?.engines || []).map((row) => {
  const retry = retries?.engines.find(
    (r) => r.profile === row.profile && r.tier === row.tier && r.code === row.code,
  );
  return retry
    ? {
        ...retry,
        initialOutcome: row.outcome,
        recheck:
          'Positive revenue fixture replaced zero revenue; initial disabled form was correct.',
      }
    : row;
});
const summary = {
  postFixVerification: {
    demoCombinations: fixed?.cases?.length,
    demoOutcomes: tally(fixed?.cases || []),
    accessibilityPages: accessibility?.pages?.length,
    accessibilityViolations: accessibility?.pages?.reduce((n, p) => n + p.violations.length, 0),
    refundBrowser: refund?.cases?.map(({ name, outcome, status }) => ({ name, outcome, status })),
    invoicePrerequisite: invoicePrereq?.cases?.map(({ name, outcome, status, pointsDeducted }) => ({
      name,
      outcome,
      status,
      pointsDeducted,
    })),
    notes:
      'See lamiddoc/docs/audit-fixes-2026-10-18.md for full validation and deployment boundaries.',
  },
  scope:
    'Exploratory inventory across pre-fix and in-progress builds; use targeted post-fix regressions for verified outcomes.',
  generated: new Date().toISOString(),
  revision: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
  workingTreeHasChanges: Boolean(
    execFileSync('git', ['status', '--porcelain'], { encoding: 'utf8' }).trim(),
  ),
  complete: {
    demo: !!pages?.finished,
    public: !!publicReport?.finished,
    engines: !!tools?.finished,
    commerce: !!commerceSummary?.finished,
    mobile: !!mobile?.finished,
    server: !!server?.finished,
    serverApi: !!apiOnly?.finished,
  },
  demoPages: pages?.pages.length,
  publicPages: publicReport?.pages.length,
  demoControls: pages?.controls.length,
  publicControls: publicReport?.controls.length,
  controlOutcomes: tally(controls),
  engineOutcomes: tally(engines),
  commerceOutcomes: tally(commerceSummary?.cases || []),
  mobilePages: mobile?.pages.length,
  mobileAxePages: mobile?.pages.filter((row) => row.accessibility).length,
  historicalServerApiCases: apiOnly?.cases.map((row) => ({
    name: row.name,
    outcome: row.outcome,
    status: row.status,
    pointsDeducted: row.pointsDeducted,
  })),
  warnings: [
    'Late exploratory visits overlapped local rebuilds. This ledger is not a clean final-build pass/fail certificate.',
    'Interaction observed does not mean business outcome verified.',
    'Disabled controls, blocked boundaries, synthetic-fixture limitations and watchdog timeouts remain explicit.',
    'Browser identity/save fixtures and fake payment adapters do not prove real inboxes, AI providers, payment settlement or VPS deployment.',
    'Control discovery is finite: initial visible controls and one dialog layer. Arbitrary state combinations and deeper dialog paths are not exhaustively certified.',
    'Some hidden CSS radio/honeypot crawler failures are superseded by targeted support-label checks.',
    'Reduced-motion browser configuration used in the expanded audits.',
  ],
};
writeFileSync(root + 'summary.json', JSON.stringify(summary, null, 2));
const csv = (rows, keys) =>
  [
    keys.join(','),
    ...rows.map((row) =>
      keys
        .map((key) => {
          let value =
            typeof row[key] === 'object' ? JSON.stringify(row[key]) : String(row[key] ?? '');
          if (/^[=+@-]/.test(value)) value = "'" + value;
          return '"' + value.replaceAll('"', '""') + '"';
        })
        .join(','),
    ),
  ].join('\n');
writeFileSync(
  root + 'controls.csv',
  csv(controls, [
    'suite',
    'profile',
    'tier',
    'path',
    'parent',
    'tag',
    'label',
    'occurrence',
    'outcome',
    'alerts',
    'error',
    'watchdog',
  ]),
);
writeFileSync(
  root + 'engines.csv',
  csv(engines, [
    'profile',
    'tier',
    'code',
    'name',
    'included',
    'outcome',
    'initialOutcome',
    'recheck',
  ]),
);
const rows = controls.map((row, index) => ({
  id: index + 1,
  suite: row.suite,
  profile: row.profile,
  tier: row.tier || '',
  path: row.path,
  label: [row.parent, row.label].filter(Boolean).join(' → '),
  kind: row.tag,
  outcome: row.outcome,
  detail: JSON.stringify(
    {
      alerts: row.alerts,
      requests: row.requests,
      error: row.error,
      watchdog: row.watchdog,
      fieldIssues: row.fieldIssues,
      options: row.options,
    },
    null,
    2,
  ),
}));
const payload = JSON.stringify({ summary, rows }).replaceAll('<', '\\u003c');
writeFileSync(
  root + 'report.html',
  `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>LAMID ONE interaction audit</title><style>body{font:16px/1.5 system-ui;margin:2rem;color:#10232d;background:#f8faf9}h1{font-size:1.8rem}label{display:inline-block;margin:.5rem 1rem .5rem 0}input,select,button{font:inherit;padding:.5rem}input{min-width:20rem}table{border-collapse:collapse;width:100%;background:white}td,th{padding:.6rem;border:1px solid #cbd5d8;text-align:left;vertical-align:top}th{background:#e3eeed}pre{white-space:pre-wrap;overflow-wrap:anywhere;font-size:.8rem}#table{overflow:auto}button{cursor:pointer}small{display:block}a{color:#174cab}.note{border-left:4px solid #b04d17;padding:1rem;background:#fff5e9}.count{font-weight:bold}</style><h1>LAMID ONE: recorded interaction audit</h1><p id="revision"></p><p class="note">This is an evidence ledger, not an “everything works” certificate. A successful click alone does not establish a correct business result. Read the written review and the boundaries below.</p><details><summary>Coverage and test boundaries</summary><pre id="summary"></pre></details><p><a href="controls.csv" download>Download control ledger (CSV)</a> · <a href="engines.csv" download>Download engine matrix (CSV)</a> · <a href="summary.json">Summary JSON</a></p><label>Search <input id="query" type="search" placeholder="Page, button, error or feature"></label><label>Suite <select id="suite"><option value="">All</option></select></label><label>Profile <select id="profile"><option value="">All</option></select></label><label>Outcome <select id="outcome"><option value="">All</option></select></label><p class="count" id="count"></p><button id="prev">Previous 100</button> <button id="next">Next 100</button><div id="table"><table><thead><tr><th>ID / context</th><th>Page</th><th>Control</th><th>Observed outcome</th><th>Evidence</th></tr></thead><tbody id="rows"></tbody></table></div><script type="application/json" id="data">${payload}</script><script>const data=JSON.parse(document.querySelector('#data').textContent);document.querySelector('#revision').textContent='Tested revision: '+data.summary.revision;document.querySelector('#summary').textContent=JSON.stringify(data.summary,null,2);let offset=0;for(const key of ['suite','profile','outcome']){const select=document.getElementById(key);for(const value of [...new Set(data.rows.map(r=>r[key]))].sort()){const option=document.createElement('option');option.value=value;option.textContent=value;select.append(option);}select.onchange=()=>{offset=0;render();};}document.querySelector('#query').oninput=()=>{offset=0;render();};function render(){const query=document.querySelector('#query').value.toLowerCase();const filtered=data.rows.filter(row=>['suite','profile','outcome'].every(key=>!document.getElementById(key).value||row[key]===document.getElementById(key).value)&&JSON.stringify(row).toLowerCase().includes(query));offset=Math.min(offset,Math.max(0,Math.floor((filtered.length-1)/100)*100));document.querySelector('#count').textContent=filtered.length+' matching records; showing '+(filtered.length?offset+1:0)+'–'+Math.min(offset+100,filtered.length);const body=document.querySelector('#rows');body.replaceChildren();for(const row of filtered.slice(offset,offset+100)){const tr=document.createElement('tr');for(const text of [row.id+' · '+row.suite+' · '+row.profile+'/'+row.tier,row.path,row.kind+': '+row.label,row.outcome]){const td=document.createElement('td');td.textContent=text;tr.append(td);}const td=document.createElement('td'),details=document.createElement('details'),summary=document.createElement('summary'),pre=document.createElement('pre');summary.textContent='Show evidence';pre.textContent=row.detail;details.append(summary,pre);td.append(details);tr.append(td);body.append(tr);}document.querySelector('#prev').disabled=offset===0;document.querySelector('#next').disabled=offset+100>=filtered.length;}document.querySelector('#prev').onclick=()=>{offset-=100;render();};document.querySelector('#next').onclick=()=>{offset+=100;render();};render();</script></html>`,
);
console.log(JSON.stringify(summary, null, 2));
