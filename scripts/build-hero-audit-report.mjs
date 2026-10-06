import fs from 'node:fs';
const output = 'audit-results/ui-heroes-2026-10-06';
const data = JSON.parse(fs.readFileSync(`${output}/measurements.json`, 'utf8'));
const previews = JSON.parse(fs.readFileSync(`${output}/previews.json`, 'utf8'));
const routes = [...new Set(data.map((r) => r.route))];
const widths = [360, 390, 768, 1024, 1440];
const at = (route, width) => data.find((r) => r.route === route && r.width === width);
const esc = (value) =>
  String(value || '')
    .replaceAll('|', '\\|')
    .replace(/\s+/g, ' ')
    .trim();
const extraH2 = routes.filter((r) => at(r, 1440)?.headingTag === 'H2');
const overflow = data.filter((r) => r.pageOverflow > 2 || r.titleOverflow);
let report = `# LAMID ONE — Responsive UI and hero audit\n\n6 October 2026. Current source; original page wording preserved.\n\n## Findings\n\n**The main issue is headline layout, not content.** Shared public heroes frequently use an 84px headline capped at 11ch (about 425px at 1440px). This turns short paragraphs into tall stacks despite available desktop space. The worst desktop headline uses seven lines. Browser-only previews demonstrate two-line desktop alternatives using exactly the same words.\n\nScope: ${routes.length} distinct routes at 360, 390, 768, 1024 and 1440px; ${data.length} measured views. Edge, light theme, reduced motion, viewport heights 844px on phones and 900px elsewhere. Captured opening-viewport screenshots for every route at 390px and 1440px; ${previews.length} additional presentation previews for 15 public pages.\n\nWorkspace routes use an isolated empty Enterprise-owner fixture. Domain API requests are intercepted; selected list endpoints return empty data and unconfigured endpoints return an explicit fixture error. This checks layout without using .env credentials, a database, paid services or production data. It does not verify populated dashboards, every role, modals, provider behavior, dark mode, interactive delivery flows or all content below the fold. A dynamic project-detail route could not show its normal title without project data and is recorded as unverified.\n\nApplication components, CSS and page content were not changed. Previews are DOM/style experiments, not shipped changes or final approved designs.\n\n## Measurements by viewport\n\n| Width | Views | Titles above two lines | Horizontal page/title overflow | Missing primary title |\n| --- | --- | --- | --- | --- |\n`;
for (const w of widths) {
  const rows = data.filter((r) => r.width === w);
  report += `| ${w}px | ${rows.length} | ${rows.filter((r) => r.lineCount > 2).length} | ${rows.filter((r) => r.pageOverflow > 2 || r.titleOverflow).length} | ${rows.filter((r) => !r.title).length} |\n`;
}
report +=
  '\nLine counts are measured from rendered text ranges, not inferred from character count. An overflow-free document does not establish that all clipped decorations, long tables or interactive states are correct.\n\n## Update first\n\n| Page | Desktop now (1440px) | Mobile now (390px) | Desktop preview | Mobile preview | Recommendation |\n| --- | --- | --- | --- | --- | --- |\n';
for (const route of [
  '/how-it-works',
  '/who-its-for/institutions',
  '/who-its-for/enterprises',
  '/who-its-for/smes',
  '/who-its-for/founders',
  '/developers/webhooks',
  '/resources',
  '/research',
  '/responsible-ai',
  '/about',
  '/product',
  '/product/experience',
  '/product/intelligence',
  '/',
]) {
  const p = (width) => previews.find((r) => r.route === route && r.viewport === width);
  report += `| ${route} | ${at(route, 1440)?.lineCount ?? 'Unverified'} | ${at(route, 390)?.lineCount ?? 'Unverified'} | ${p(1440)?.lineCount ?? 'Not previewed'} | ${p(390)?.lineCount ?? 'Not previewed'} | ${route === '/' ? 'Keep two desktop lines; improve phone wrapping to three' : 'Widen title; use responsive type and a natural break'} |\n`;
}
report +=
  '\nAll preview titles match their original normalized text. The 15 desktop previews use two lines; the mobile previews retain two or three lines instead of shrinking long titles below the 30px experiment floor. Fonts in the previews are 44–64px on desktop and 30–36px on phones. These ranges are a starting point for design review, not a universal typography requirement.\n\n## Why the current layout wraps poorly\n\n1. **Artificially narrow title width.** `src/ui-refresh.css:108` caps shared hero headings at 11ch and sets an 84px desktop maximum. Remove that universal cap and give the title a width suited to its copy and hero family.\n2. **Two-line behavior is inconsistent.** `DocumentHeroSlide.tsx` only selects `TwoLineTitle` for some product routes. Other product pages use `EngineDocumentPage`, while the homepage has its own typography and spans. A reusable visual contract should allow each family to keep its identity while sharing readable width and type rules.\n3. **Split fragments wrap again on phones.** `hero-title.css` explicitly permits each two-line span to wrap below 600px. A nominally two-line product headline can therefore become four lines. Let mobile choose one balanced text block or separate mobile break positions.\n4. **Grid rules compete.** The two-line stylesheet requests a wider text column, but more-specific bento rules retain roughly equal columns. Audit the final computed layout rather than assuming that adding another shared selector changes it.\n5. **Hero height competes with action visibility.** Bento pages reserve 300px bottom padding for an absolutely positioned 240px image at widths up to 900px. At 390px, product and some audience heroes approach 1,000px tall. Preserve the image space when reducing text spacing; otherwise the image overlaps body copy and buttons. Prefer an actual image/grid child over a pseudo-element with fixed reserved padding in a future refactor.\n6. **Long first paragraphs remain long.** The shared Read more mechanism hides additional paragraphs; it does not shorten an already-long first paragraph. Preserve every word, but consider a controlled disclosure or a distinct supporting-copy area after the primary action.\n\n## Pages that can retain their current hero structure\n\nProduct Companion, Product Workflows, Product Organizations, Experts and Pricing already use at most two lines at both 390px and 1440px. Keep their composition and review spacing and type consistency. Do not impose two lines on naturally short headings such as Help, Contact, legal pages or compact workspace panel titles.\n\nPages with three desktop lines but good mobile wrapping still deserve the shared width correction: capability, rhythm, individuals, professionals, teams, enterprise, privacy, governance, enterprise contact, guides, account help, developers, API, SDKs, integrations, story, leadership and accessibility. Their priority is lower than the four-to-seven-line outliers. The full inventory below gives the exact counts.\n\n## Working views and heading hierarchy\n\n';
report += `${extraH2.length} routes use a visible h2 as their primary title and no visible h1 at 1440px. Many are compact working panels whose wording and line count are already appropriate. Give each route a consistent page-level heading without enlarging it into a marketing hero. Account headings also contain styled fragments whose text nodes run together (for example “Welcomeback.”); preserve visible wording while adding proper textual whitespace for assistive technology and text extraction.\n\n`;
report += '| Route with h2 primary title | Rendered title |\n| --- | --- |\n';
for (const r of extraH2) report += `| ${r} | ${esc(at(r, 1440).title)} |\n`;
report +=
  '\nPlanned OS routes were measured as roadmap surfaces, not completed dashboards. Empty owner fixtures do not represent populated personal, manager or specialist views. `/os/commercial/projects/audit-project` remains unverified because it needs a real isolated project fixture.\n\n## Recommended presentation contract\n\n- Desktop: use one or two lines for short and medium titles; long titles should use two lines when the real column width supports a readable font. Give text approximately two-thirds of a split hero when necessary.\n- Tablet: test the transition near 900px explicitly. Avoid keeping desktop-sized type while prematurely narrowing the text column.\n- Phones: target two lines for medium titles and three for long titles. Allow additional lines on narrower devices when required by readable text or user font settings.\n- Break by meaning, then fit. Measure the actual font rather than assuming every character has the same width. Keep visible wording, punctuation, source attributes and accessible text unchanged.\n- Preserve the existing light/dark brand treatments, CTA wording and supporting content. Improve geometry, type scale and spacing before selecting any new palette.\n- Keep primary actions easy to reach. Large supporting visuals can move below the intro on phones, with real layout space rather than overlapping backgrounds.\n- Validate keyboard focus, browser zoom, large-text settings, normal motion, reduced motion, dark mode and populated working states before shipping.\n\n## Complete route inventory\n\nNumbers are primary-heading line counts at each width. A dash means the primary title was not available in the fixture. “Keep compact” does not mean every other aspect of the page has passed a full UX review.\n\n| Route | 360 | 390 | 768 | 1024 | 1440 | Recommended action |\n| --- | --- | --- | --- | --- | --- | --- |\n';
for (const route of routes) {
  const desktop = at(route, 1440),
    mobile = at(route, 390);
  const recommendation = !desktop?.title
    ? 'Unverified: requires project data'
    : desktop.headingTag === 'H2'
      ? 'Keep compact; add consistent h1 semantics'
      : desktop.lineCount > 2 && mobile.lineCount >= 4
        ? 'High: desktop two lines; mobile two/three'
        : desktop.lineCount > 2
          ? 'Update desktop width/type; preserve readable mobile'
          : mobile.lineCount >= 3
            ? 'Keep desktop; improve mobile wrapping'
            : 'Keep current headline composition';
  report += `| ${route} | ${widths.map((w) => at(route, w)?.lineCount ?? '—').join(' | ')} | ${recommendation} |\n`;
}
report +=
  '\n## Artifacts and next implementation pass\n\n- `audit-results/ui-heroes-2026-10-06/index.html`: interactive screenshot comparison, viewport metrics and route selection.\n- `measurements.json`: all measured views, title lines, geometry, CTA positions, heading counts, page errors and fixture scope.\n- `previews.json`: presentation-only experiments with exact headline-preservation checks.\n- `screenshots/`: 226 baseline opening views and 30 preview images.\n- `scripts/audit-hero-layouts.mjs`, `scripts/preview-hero-layouts.mjs`, `scripts/build-hero-audit-report.mjs`: repeatable local inspection tools.\n\nImplement the shared width/type correction first, then page-family-specific breaks and spacing. Verify the full width matrix against the original content and recheck bento image placement. Complete populated project, dashboard, role, dark-theme and large-text coverage before calling this a full UI acceptance pass.\n';
fs.writeFileSync(`${output}/REPORT.md`, report);
fs.mkdirSync('docs', { recursive: true });
fs.writeFileSync('docs/UI_HERO_AUDIT.md', report);
const safeJson = (value) => JSON.stringify(value).replaceAll('<', '\\u003c');
const html = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>LAMID ONE — Hero audit</title><style>
*{box-sizing:border-box}body{margin:0;background:#fbfaf7;color:#0d1a2b;font:15px system-ui,sans-serif}header,main{max-width:1500px;margin:auto;padding:28px}h1{font-size:30px;margin:0 0 12px}p{line-height:1.6}label{display:block;font-weight:600;margin-bottom:8px}select,input{padding:12px;border:1px solid #c8c4be;border-radius:8px;background:white;font:inherit;width:100%}.controls{display:grid;grid-template-columns:1fr 2fr 180px;gap:16px}.comparison{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:24px}figure{margin:0;border:1px solid #d8cfc4;background:white;border-radius:12px;padding:16px}img{display:block;max-width:100%;max-height:900px;margin:auto;object-fit:contain}figcaption{margin-bottom:16px;font-weight:600}small{display:block;font-weight:400;margin-top:6px;color:#5a5f66}table{border-collapse:collapse;width:100%;margin-top:20px}td,th{border-bottom:1px solid #d8cfc4;padding:12px;text-align:left}.note{border-left:4px solid #c12129;padding:12px 16px;background:#f0ece7}.empty{padding:50px 12px;color:#5a5f66}.links a{color:#0d1a2b;margin-right:20px}@media(max-width:800px){.controls,.comparison{grid-template-columns:1fr}header,main{padding:20px}h1{font-size:25px}}
</style><header><h1>Which heroes should we update?</h1><p>${routes.length} routes · ${data.length} measured views · five viewport widths · exact headline wording preserved in previews.</p><p class="note">Previews are layout experiments. Workspace views use empty isolated fixtures; this is not a certification of populated flows, every role or interactive state.</p><p class="links"><a href="REPORT.md">Full report</a><a href="measurements.json">Measurements</a><a href="previews.json">Preview checks</a></p></header><main><div class="controls"><div><label for="filter">Find a route</label><input id="filter" placeholder="e.g. institutions"></div><div><label for="route">Page</label><select id="route"></select></div><div><label for="width">Screenshot width</label><select id="width"><option>1440</option><option>390</option></select></div></div><h2 id="title"></h2><div id="metrics"></div><div class="comparison"><figure><figcaption id="beforeLabel">Current</figcaption><a id="beforeLink"><img id="before" alt="Current hero layout"></a></figure><figure><figcaption id="afterLabel">Presentation preview</figcaption><a id="afterLink"><img id="after" alt="Preview with original wording"></a><p id="empty" class="empty"></p></figure></div></main><script>
const measurements=${safeJson(data)},previews=${safeJson(previews)},routes=${safeJson(routes)};
const routeSelect=document.querySelector('#route'),widthSelect=document.querySelector('#width');
function options(filter=''){const prev=routeSelect.value;routeSelect.replaceChildren();for(const route of routes.filter(r=>r.includes(filter))){const o=document.createElement('option');o.value=route;o.textContent=route;routeSelect.append(o)}if([...routeSelect.options].some(o=>o.value===prev))routeSelect.value=prev;render()}
function image(id,item){const img=document.querySelector('#'+id),link=document.querySelector('#'+id+'Link');img.hidden=!item?.screenshot;if(item?.screenshot){img.src=item.screenshot;link.href=item.screenshot}}
function render(){const route=routeSelect.value,width=Number(widthSelect.value),before=measurements.find(r=>r.route===route&&r.width===width),after=previews.find(r=>r.route===route&&r.viewport===width);document.querySelector('#title').textContent=before?.title||route||'No matching route';image('before',before);image('after',after);document.querySelector('#beforeLabel').textContent='Current — '+(before?.lineCount??'unverified')+' lines';document.querySelector('#afterLabel').textContent=after?'Preview — '+after.lineCount+' lines; exact text preserved':'Presentation preview';document.querySelector('#empty').textContent=after?'':'No preview for this route. Its current layout and five-width metrics are included in the audit.';const table=document.createElement('table'),head=table.insertRow();for(const t of ['Width','Title lines','Visible h1','Hero height']){const th=document.createElement('th');th.textContent=t;head.append(th)}for(const w of [360,390,768,1024,1440]){const m=measurements.find(r=>r.route===route&&r.width===w),row=table.insertRow();for(const value of [w+'px',m?.lineCount??'—',m?.headingCount??'—',m?.hero?Math.round(m.hero.height)+'px':'—'])row.insertCell().textContent=value}document.querySelector('#metrics').replaceChildren(table)}
document.querySelector('#filter').addEventListener('input',e=>options(e.target.value));routeSelect.addEventListener('change',render);widthSelect.addEventListener('change',render);options();routeSelect.value='/who-its-for/institutions';render();
</script></html>`;
fs.writeFileSync(`${output}/index.html`, html);
if (data.length !== routes.length * widths.length) throw new Error('Incomplete width matrix');
if (previews.some((p) => !p.contentUnchanged || p.overflow))
  throw new Error('Preview validation failed');
console.log(
  `Report and gallery created: ${routes.length} routes, ${data.length} views, ${extraH2.length} h2-led routes, ${overflow.length} overflow findings.`,
);
