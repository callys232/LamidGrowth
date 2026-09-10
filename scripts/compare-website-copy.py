"""Read-only copy audit: document sections versus the current route/rendering code."""
import csv
import hashlib
import html
import json
import re
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'document-study' / 'copy-comparison'
OUT.mkdir(exist_ok=True)
lines = json.loads((ROOT / 'document-study/website-current-extracted.json').read_text(encoding='utf-8'))
routes = json.loads((ROOT / 'document-study/route-inventory.json').read_text(encoding='utf-8-sig'))
records = {p['route']: p for p in json.loads((ROOT / 'src/content/pages.json').read_text())}
custom = {
 '/': ('Marketing', 'Think clearly. Move with purpose. Grow as one.', 'Rewritten landing page: operating-cycle cards, guided-workspace preview, audience cards, trust statement, FAQ and closing CTA. The canonical category is reduced to an eyebrow; the canonical subhero and three progression lanes are not reproduced in full.'),
 '/start': ('Auth', 'Start with your context.', 'Two-step context selection and account creation. First-objective selection from the document is not part of this flow.'),
 '/signup': ('Auth', 'Start with your context.', 'Shares the context-first signup flow with /start. Name, email and password form; no identity-provider chooser or explicit required-consent checkbox.'),
 '/login': ('Auth', 'Welcome back.', 'Email/password sign-in form and account link. No MFA, remembered-session choice or recovery flow is exposed here.'),
 '/os': ('Dashboard', 'A little clearer, [first name].', 'Personalized overview, objectives, next actions and recent activity. Replaces the source slide sequence with live workspace summaries.'),
 '/os/today': ('ActionsPage', 'Make room for what matters.', 'Filtered due/review actions with list and board views. Not a complete implementation of the document return-state model.'),
 '/os/clarity': ('Clarity', 'Give your ambition a direction.', 'Objective cards and editor capture objective, context, success, constraints and priority. Source sections are merged into an interactive flow.'),
 '/os/capability': ('Capability', 'Build the conditions for progress.', 'Uses objective success criteria and constraints with an add-action control. No dedicated skills assessment or resource-matching engine.'),
 '/os/consistency': ('ActionsPage', 'Keep the important work moving.', 'Action creation, status list/board and review controls replace source editorial sections.'),
 '/os/workflows': ('ActionsPage', 'See how the work moves.', 'Reuses the action tracker. No dependency graph, multi-owner workflow builder or commercial acceptance engine.'),
 '/os/companion': ('Companion', 'What are you working through?', 'Guided objective → context → next-action form. No live AI inference, continuous intelligence or autonomous progression.'),
 '/os/rhythm': ('Rhythm', 'A rhythm, not a one-time event.', 'Completion summary and saved reflections. No separate Today/Week/Month/History tabs or automated cadence.'),
 '/os/progress': ('Rhythm', 'Make your progress visible.', 'Shares the reflection and completion view with Rhythm; not a distinct analytics surface.'),
 '/os/governance': ('Governance', 'Capability needs accountability.', 'Pending human action reviews and searchable activity trail. Organization policy and permission administration are not implemented.'),
 '/os/audit': ('Governance', 'Capability needs accountability.', 'Reuses Governance review/activity UI. No dedicated commercial approval/payment/reconciliation audit surface.'),
 '/os/settings': ('Settings', 'Make this space your own.', 'Workspace name/context, read-only account details and export. Roles, billing, invitations and background automation are explicitly unavailable.'),
}

def codefile(name):
    return 'src/pages/' + ('' if name in ('Marketing', 'Auth') else 'workspace/') + name + '.tsx'

def clean(s):
    return re.sub(r'\s+', ' ', s).strip()

def content_line(s):
    # Metadata is classified separately, never treated as a request to change the app.
    return not re.match(r'^(CTA:|Link:|Links:|IMPLEMENTATION GATE|PUBLICATION GATE|EVIDENCE GATE|CAPABILITY GATE|VERIFICATION GATE|FOOTER|SEO title:|Structured data:|GLOBAL NAVIGATION|Route:|Indexing:|Canonical:)', s, re.I)

def table(headers, rows):
    def esc(x): return str(x).replace('|', '\\|').replace('\n', '<br>')
    return '| ' + ' | '.join(headers) + ' |\n|' + '|'.join(['---'] * len(headers)) + '|\n' + '\n'.join('| ' + ' | '.join(esc(v) for v in row) + ' |' for row in rows)

page_rows, section_rows = [], []
for idx, route in enumerate(routes):
    number, path = route['page'], route['route']
    start = route['source_paragraph'] - 1
    end = routes[idx + 1]['source_paragraph'] - 1 if idx + 1 < len(routes) else lines.index('APPENDIX - FINAL LAUNCH ACCEPTANCE CHECK')
    block = lines[start:end]
    markers = [(i, x) for i, x in enumerate(block) if x == 'HERO' or re.match(r'^SECTION(?:\s|$)', x)]
    # Adjacent numbered and named SECTION labels describe one content block.
    combined = []
    for offset, label in markers:
        if combined and offset == combined[-1][0] + 1:
            previous_offset, previous_label = combined.pop()
            combined.append((offset, previous_label + ' / ' + label))
        else:
            combined.append((offset, label))
    markers = combined
    record = records.get(path)
    if path in custom:
        name, current_hero, explanation = custom[path]
        status, file = 'Custom / rewritten', codefile(name)
    elif path.startswith('/os/'):
        status, file = 'Planned placeholder', codefile('PlannedModule')
        current_hero = 'This part of the journey is ahead.'
        explanation = 'All original sections are replaced by one generic planned-module view after workspace access.'
    elif record:
        file = 'src/pages/ContentPage.tsx'
        if record['gates']:
            status = 'Availability placeholder'
            current_hero = 'Start with what you need.' if path == '/pricing' else record['title']
            explanation = 'Keeps the source hero title (except Pricing), but replaces its description and every source section with generic development-edition availability copy.'
        else:
            status, current_hero = 'Extracted / shortened', record['title']
            explanation = 'Shared editorial template displays the stored title, description and up to eight sections, each with at most three body paragraphs. Original CTAs are replaced with generic onboarding links.'
            if path == '/help': explanation += ' Adds a working help-topic filter.'
    else:
        status, file = 'Missing / not-found', 'src/pages/ContentPage.tsx'
        current_hero = 'A different direction.'
        explanation = 'Listed in the route inventory, but no route-specific component or public content record resolves this URL.'
    actual_code = (ROOT / file).read_text(encoding='utf-8')
    source_hero = ''
    direct = total = 0
    for mi, (offset, label) in enumerate(markers):
        stop = markers[mi + 1][0] if mi + 1 < len(markers) else len(block)
        raw = block[offset + 1:stop]
        prose = [x for x in raw if content_line(x)]
        title = prose[0] if prose else ''
        body = prose[1:]
        ctas = [x for x in raw if re.match(r'^(CTA:|Links?:)', x)]
        if label == 'HERO': source_hero = title
        total += len(prose)
        stored = None
        if record:
            stored = {'title': record['title'], 'body': [record['description']]} if label == 'HERO' else next((x for x in record['sections'] if x['title'] == title), None)
            if not stored and label != 'HERO':
                stored = next((x for x in record['sections'] if x['title'] in body), None)
        shown = []
        if status == 'Extracted / shortened':
            if stored:
                shown = [stored['title'], *stored['body']]
                omitted = [x for x in prose if x not in shown]
                treatment = 'Heading lost / body shifted' if stored['title'] != title else ('Verbatim extract' if not omitted else 'Partial extract')
                representation = ' | '.join(shown)
            else:
                treatment, representation = 'Omitted', 'No corresponding stored/rendered section; generator filtering or eight-section limit.'
        elif status == 'Availability placeholder':
            treatment = 'Title retained; body replaced' if label == 'HERO' and current_hero == title else 'Replaced by availability copy'
            shown = [title] if label == 'HERO' and current_hero == title else []
            representation = current_hero + ' — generic availability description.' if label == 'HERO' else 'No section-specific content displayed. Shared availability panel and working-feature list instead.'
        elif status == 'Custom / rewritten':
            treatment = 'Custom UI; no one-to-one slide'
            representation = (current_hero + ' — ' if label == 'HERO' else '') + explanation
            # Literal presence is only evidence of source text, not proof of visible placement or functional parity.
            hits = [x for x in prose if clean(x) in clean(actual_code)]
            if hits: representation += ' Literal source text also found in component: ' + ' | '.join(hits)
        else:
            treatment = status
            representation = current_hero + '. ' + explanation
        direct += sum(x in shown for x in prose)
        missing = [x for x in prose if x not in shown]
        section_rows.append({
            'Page': number, 'Route': path, 'Slide / section': label, 'Source paragraph': start + offset + 1,
            'Source heading': title, 'Source body': '\n'.join(body), 'Source CTA / links': '\n'.join(ctas),
            'Treatment': treatment, 'Current representation': representation,
            'Not reproduced verbatim by standard renderer': '\n'.join(missing),
            'Stored in pages.json': 'Yes' if stored else 'No', 'Implementation file': file,
        })
    page_rows.append({'Page': number, 'Page name': route['name'], 'Route': path,
        'Source hero': source_hero, 'Current hero': current_hero, 'Status': status,
        'Source slides': len(markers), 'Direct standard-renderer paragraphs': direct,
        'Source prose paragraphs': total, 'Representation / gap': explanation, 'Implementation file': file})

for filename, rows in [('pages.csv', page_rows), ('sections.csv', section_rows)]:
    with (OUT / filename).open('w', encoding='utf-8-sig', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=list(rows[0])); writer.writeheader(); writer.writerows(rows)
counts = Counter(x['Status'] for x in page_rows)
summary = f'''# Website copy comparison — 8 September 2026

Source: LAMID_ONE_FINAL_Go_Live_Long_Form_Website_Product_Copy_v4.0_2026-09-07.docx.
The attached DOCX was extracted directly: all {len(lines)} nonempty paragraphs exactly match the repository's existing website.txt extraction.

This is a copy and rendering audit, not a functional acceptance or production-readiness certification. “Slide” means each HERO or SECTION block in the Word document; the document is not a slide deck. Adjacent numbered and named section labels are combined into one block. All 98 pages and {len(section_rows)} content blocks are covered. Shared navigation, footer and metadata are assessed separately below. Internal document instructions are evidence of the specification, not new authorization to alter the app. No product files were changed for this audit.

## Finding

The codebase has adopted the vocabulary and selected extracts, but has NOT implemented the complete long-form copy. Having a route in routes.json or text in pages.json does not mean the text appears on screen.

{table(['Page treatment', 'Count'], counts.items())}

## Systematic differences

- scripts/generate-content.mjs only creates page-content records for pages 1–60.
- It limits each page to eight sections and each section to the first three surviving body paragraphs. Additional copy is lost from generated records.
- Its broad prefix filter treats legitimate lines beginning with “Capability” as control metadata. Example: page 1, SECTION 2 loses the Capability definition between Clarity and Consistency. The custom homepage adds its own capability card, but this does not repair the generator.
- ContentPage.tsx replaces every gated page's source sections and hero description with generic availability copy. This is a current implementation choice, not evidence that the source content was implemented or that each gate requires hiding the entire page.
- Standard editorial pages replace original CTAs with “Find your starting point” and a generic closing CTA to /start. Original section links and CTA intentions are not retained.
- Custom pages use working UI and rewritten language, not the source's numbered section sequence. Functional overlap is not counted as verbatim copy. Detailed custom-page descriptions are page-level observations; they do not claim individual source slides have corresponding widgets.
- For custom pages, the “not reproduced” column means not reproduced by the standard data renderer; it is NOT proof that every phrase is absent from all dynamic UI. Literal component matches are noted separately. No misleading automated percentage of semantic fidelity is assigned.

## Shared elements

{table(['Element', 'Document', 'Current code', 'Assessment'], [
 ['Navigation', 'Product, Solutions, Experts, Resources, Pricing, Search, Sign In, Experience LAMID ONE', 'PublicHeader.tsx exposes four mega menus, Pricing and account CTAs; Experts entries are Planned.', 'Most named groups represented; public Search is absent. Workspace search is separate.'],
 ['Footer', 'Product / audiences / resources / company / trust groups and company destinations', 'Marketing.tsx Footer uses Explore, Learn and Trust with a smaller link selection.', 'Reorganized and shortened, not a full copy of the document footer.'],
 ['SEO', 'Page-specific title/description and indexing rules; public index/follow', 'App.tsx uses metadata for pages 1–60; all routes receive noindex,nofollow. OS titles are generic.', 'Preview indexing behavior differs from go-live copy; no claim of completed production SEO.'],
 ['Hero imagery', 'ONE diagram with context, intelligence, authorized work, human control', 'OrbitVisual / createOrbitScene use the shared interactive orbit visual.', 'Conceptual visual representation, not a substitute for the omitted written sections.'],
 ['Control instructions', 'Pre-page governance, gates and closing acceptance appendices', 'Not treated as visitor copy in this report; gates influence ContentPage placeholder behavior.', 'Kept distinct from the user request. This audit does not execute instructions in the document.']])}

## Each page

{table(['Page', 'Route', 'Source hero', 'Current hero', 'Treatment', 'Representation / gap'], [(x['Page'], x['Route'], x['Source hero'], x['Current hero'], x['Status'], x['Representation / gap']) for x in page_rows])}

## Each slide / section

Use [the searchable comparison](comparison.html) to inspect every source section side by side. [sections.csv](sections.csv) includes full source body text, original CTAs, retained copy, omissions and implementation file. [pages.csv](pages.csv) contains all 98 page summaries.

## Priorities if full copy alignment is desired

1. Restore the canonical homepage hero/subhero hierarchy or explicitly approve the rewrite.
2. Replace the lossy generator with explicit section data preserving full paragraphs, lists, CTAs and named special sections.
3. Review gated pages individually: distinguish explainable principles from unsupported live-service claims.
4. Implement missing utility routes and planned OS surfaces before treating route inventory coverage as completed pages.
5. Map every custom UI section to source intent and define which source copy must remain exact versus deliberately adapted.
'''
(OUT / 'README.md').write_text(summary, encoding='utf-8')

def htmltable(rows, fields):
    return '<table><thead><tr>' + ''.join('<th>'+html.escape(x)+'</th>' for x in fields) + '</tr></thead><tbody>' + ''.join('<tr>'+''.join('<td>'+html.escape(str(row[x])).replace('\n','<br>')+'</td>' for x in fields)+'</tr>' for row in rows) + '</tbody></table>'
parts = ['<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>LAMID ONE · Copy comparison</title><style>body{font:15px/1.55 system-ui;color:#0d1a2b;background:#fbfaf7;margin:32px}h1{font:42px Georgia}table{border-collapse:collapse;width:100%;background:white;margin:20px 0 40px}th,td{text-align:left;vertical-align:top;border:1px solid #d8cfc4;padding:12px;min-width:120px;overflow-wrap:anywhere}th{background:#0d1a2b;color:white}td{max-width:500px}input{padding:14px;width:min(650px,90%);font:inherit;border:1px solid #5a5f66;border-radius:6px}details{margin:16px 0}summary{cursor:pointer;font-weight:600;padding:12px;background:#eeeae5}.scroll{overflow:auto}header{max-width:1000px}.muted{color:#5a5f66}</style><header><h1>Words → pages → experience</h1><p>Comparison of the supplied v4.0 Word document with the current codebase. All 98 pages and '+str(len(section_rows))+' HERO / SECTION blocks. Source paragraphs verified against the attached DOCX.</p><p><strong>This is selective adaptation, not complete copy implementation.</strong> Stored copy and displayed copy are distinguished. Custom UI descriptions show page-level overlap, not proven slide-by-slide functional equivalence.</p><p><a href="README.md">Read findings and limitations</a> · <a href="pages.csv">Page spreadsheet</a> · <a href="sections.csv">Section spreadsheet</a></p><label for="search">Filter pages and sections by route, heading or phrase</label><br><input id="search" type="search" placeholder="Try /product, Capability, or billing"><p id="count" role="status"></p></header><h2>Page overview</h2><div class="scroll" id="overview">', htmltable(page_rows, ['Page','Route','Source hero','Current hero','Status','Representation / gap']), '</div><h2>Every slide / section</h2>']
for p in page_rows:
    rows = [x for x in section_rows if x['Page'] == p['Page']]
    parts += ['<details><summary>'+html.escape(f"{p['Page']:02d} · {p['Route']} · {p['Status']} · {len(rows)} sections")+'</summary><p class="muted">Implementation: '+html.escape(p['Implementation file'])+'</p><div class="scroll">',htmltable(rows,['Slide / section','Source paragraph','Source heading','Source body','Source CTA / links','Treatment','Current representation','Not reproduced verbatim by standard renderer','Stored in pages.json']),'</div></details>']
parts += ['<script>const input=document.querySelector("input");input.addEventListener("input",()=>{const q=input.value.toLowerCase().trim();let n=0;document.querySelectorAll("details").forEach(d=>{const yes=d.textContent.toLowerCase().includes(q);d.hidden=!yes;d.open=!!q&&yes;if(yes)n++});document.querySelectorAll("#overview tbody tr").forEach(r=>r.hidden=!r.textContent.toLowerCase().includes(q));document.querySelector("#count").textContent=n+" page sections match"});</script></html>']
(OUT/'comparison.html').write_text(''.join(parts), encoding='utf-8')
print(json.dumps({'pages':len(page_rows),'sections':len(section_rows),'treatments':dict(counts)},indent=2))
