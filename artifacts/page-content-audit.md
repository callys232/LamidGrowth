# Page content audit

Checked 99 registered content pages: 98 source-document pages and the repository-owned Experts page.
Checked 61 public routes in the local browser, including expanded sections, full lists, and homepage audience selectors.

## Restored copy
- Clarity: original closing heading and paragraph (source 251?252).
- Rhythm: original Today and This Week headings.
- Insights: original Topics, Useful by Design, and Outcome Collections copy; original topic list remains expandable alongside the new playbooks.

## Findings
Source paragraphs missing from registered document data: 0.
Unmatched paragraphs after browser checks: 0.
Public route errors: 0.

The homepage intentionally uses its newer tagline hero. Three original sections are rendered on About; the audit records their relocation rather than duplicating them on Home.
The authenticated workspace and account screens were checked at the content-data level. Their signed-in runtime views were not audited.

## Pages with brief source sections
These pages have short source sections, not missing document copy. This list does not assess the amount of supplemental content or interactive UI.
- /product/workflows
- /product/organizations
- /how-it-works/clarity
- /how-it-works/consistency
- /how-it-works/growth
- /how-it-works/rhythm
- /who-its-for
- /who-its-for/individuals
- /who-its-for/professionals
- /who-its-for/creators
- /who-its-for/founders
- /who-its-for/teams
- /who-its-for/smes
- /who-its-for/enterprises
- /who-its-for/institutions
- /security
- /trust/privacy
- /trust/governance
- /pricing
- /about/leadership
- /press

## Re-run browser audit
Run `node scripts/audit-public-page-copy.mjs` with the local server on port 3100. The report is saved after every route. Optional start/end indices allow batches; a fourth argument filters routes, e.g. `node scripts/audit-public-page-copy.mjs 0 61 /,/insights,/about`.

Source details: `artifacts/all-page-source-audit.json`.
Browser details: `artifacts/public-page-render-audit.json`.
