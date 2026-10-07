# LAMID ONE — Responsive UI and hero audit

6 October 2026. Current source; original page wording preserved.

## Findings

**The main issue is headline layout, not content.** Shared public heroes frequently use an 84px headline capped at 11ch (about 425px at 1440px). This turns short paragraphs into tall stacks despite available desktop space. The worst desktop headline uses seven lines. Browser-only previews demonstrate two-line desktop alternatives using exactly the same words.

Scope: 113 distinct routes at 360, 390, 768, 1024 and 1440px; 565 measured views. Edge, light theme, reduced motion, viewport heights 844px on phones and 900px elsewhere. Captured opening-viewport screenshots for every route at 390px and 1440px; 30 additional presentation previews for 15 public pages.

Workspace routes use an isolated empty Enterprise-owner fixture. Domain API requests are intercepted; selected list endpoints return empty data and unconfigured endpoints return an explicit fixture error. This checks layout without using .env credentials, a database, paid services or production data. It does not verify populated dashboards, every role, modals, provider behavior, dark mode, interactive delivery flows or all content below the fold. A dynamic project-detail route could not show its normal title without project data and is recorded as unverified.

Application components, CSS and page content were not changed. Previews are DOM/style experiments, not shipped changes or final approved designs.

## Measurements by viewport

| Width  | Views | Titles above two lines | Horizontal page/title overflow | Missing primary title |
| ------ | ----- | ---------------------- | ------------------------------ | --------------------- |
| 360px  | 113   | 22                     | 0                              | 1                     |
| 390px  | 113   | 20                     | 0                              | 1                     |
| 768px  | 113   | 34                     | 0                              | 1                     |
| 1024px | 113   | 32                     | 0                              | 1                     |
| 1440px | 113   | 32                     | 0                              | 1                     |

Line counts are measured from rendered text ranges, not inferred from character count. An overflow-free document does not establish that all clipped decorations, long tables or interactive states are correct.

## Update first

| Page                      | Desktop now (1440px) | Mobile now (390px) | Desktop preview | Mobile preview | Recommendation                                          |
| ------------------------- | -------------------- | ------------------ | --------------- | -------------- | ------------------------------------------------------- |
| /how-it-works             | 5                    | 4                  | 2               | 2              | Widen title; use responsive type and a natural break    |
| /who-its-for/institutions | 7                    | 5                  | 2               | 3              | Widen title; use responsive type and a natural break    |
| /who-its-for/enterprises  | 6                    | 4                  | 2               | 3              | Widen title; use responsive type and a natural break    |
| /who-its-for/smes         | 5                    | 4                  | 2               | 3              | Widen title; use responsive type and a natural break    |
| /who-its-for/founders     | 4                    | 4                  | 2               | 3              | Widen title; use responsive type and a natural break    |
| /developers/webhooks      | 5                    | 3                  | 2               | 2              | Widen title; use responsive type and a natural break    |
| /resources                | 4                    | 3                  | 2               | 2              | Widen title; use responsive type and a natural break    |
| /research                 | 4                    | 3                  | 2               | 2              | Widen title; use responsive type and a natural break    |
| /responsible-ai           | 4                    | 2                  | 2               | 2              | Widen title; use responsive type and a natural break    |
| /about                    | 5                    | 3                  | 2               | 3              | Widen title; use responsive type and a natural break    |
| /product                  | 2                    | 4                  | 2               | 3              | Widen title; use responsive type and a natural break    |
| /product/experience       | 2                    | 3                  | 2               | 2              | Widen title; use responsive type and a natural break    |
| /product/intelligence     | 2                    | 2                  | 2               | 2              | Widen title; use responsive type and a natural break    |
| /                         | 2                    | 4                  | 2               | 3              | Keep two desktop lines; improve phone wrapping to three |

All preview titles match their original normalized text. The 15 desktop previews use two lines; the mobile previews retain two or three lines instead of shrinking long titles below the 30px experiment floor. Fonts in the previews are 44–64px on desktop and 30–36px on phones. These ranges are a starting point for design review, not a universal typography requirement.

## Why the current layout wraps poorly

1. **Artificially narrow title width.** `src/ui-refresh.css:108` caps shared hero headings at 11ch and sets an 84px desktop maximum. Remove that universal cap and give the title a width suited to its copy and hero family.
2. **Two-line behavior is inconsistent.** `DocumentHeroSlide.tsx` only selects `TwoLineTitle` for some product routes. Other product pages use `EngineDocumentPage`, while the homepage has its own typography and spans. A reusable visual contract should allow each family to keep its identity while sharing readable width and type rules.
3. **Split fragments wrap again on phones.** `hero-title.css` explicitly permits each two-line span to wrap below 600px. A nominally two-line product headline can therefore become four lines. Let mobile choose one balanced text block or separate mobile break positions.
4. **Grid rules compete.** The two-line stylesheet requests a wider text column, but more-specific bento rules retain roughly equal columns. Audit the final computed layout rather than assuming that adding another shared selector changes it.
5. **Hero height competes with action visibility.** Bento pages reserve 300px bottom padding for an absolutely positioned 240px image at widths up to 900px. At 390px, product and some audience heroes approach 1,000px tall. Preserve the image space when reducing text spacing; otherwise the image overlaps body copy and buttons. Prefer an actual image/grid child over a pseudo-element with fixed reserved padding in a future refactor.
6. **Long first paragraphs remain long.** The shared Read more mechanism hides additional paragraphs; it does not shorten an already-long first paragraph. Preserve every word, but consider a controlled disclosure or a distinct supporting-copy area after the primary action.

## Pages that can retain their current hero structure

Product Companion, Product Workflows, Product Organizations, Experts and Pricing already use at most two lines at both 390px and 1440px. Keep their composition and review spacing and type consistency. Do not impose two lines on naturally short headings such as Help, Contact, legal pages or compact workspace panel titles.

Pages with three desktop lines but good mobile wrapping still deserve the shared width correction: capability, rhythm, individuals, professionals, teams, enterprise, privacy, governance, enterprise contact, guides, account help, developers, API, SDKs, integrations, story, leadership and accessibility. Their priority is lower than the four-to-seven-line outliers. The full inventory below gives the exact counts.

## Working views and heading hierarchy

20 routes use a visible h2 as their primary title and no visible h1 at 1440px. Many are compact working panels whose wording and line count are already appropriate. Give each route a consistent page-level heading without enlarging it into a marketing hero. Account headings also contain styled fragments whose text nodes run together (for example “Welcomeback.”); preserve visible wording while adding proper textual whitespace for assistive technology and text extraction.

| Route with h2 primary title | Rendered title          |
| --------------------------- | ----------------------- |
| /start                      | Start withyour context. |
| /login                      | Welcomeback.            |
| /signup                     | Start withyour context. |
| /forgot-password            | Recover access.         |
| /reset-password             | Create a new password.  |
| /verify                     | Verify your account.    |
| /onboarding                 | Start withyour context. |
| /os/opportunities           | Opportunities           |
| /os/finance                 | Finance                 |
| /os/people                  | People & Capability     |
| /os/teams                   | Teams                   |
| /os/integrations            | Integrations            |
| /os/growth                  | Growth                  |
| /os/whats-new               | What's new              |
| /os/commercial/projects     | Projects                |
| /os/talent                  | Talent                  |
| /os/engines                 | Tools                   |
| /os/pricing                 | Pricing                 |
| /os/scoping/new             | Guided project scoping  |
| /os/learning                | Learning                |

Planned OS routes were measured as roadmap surfaces, not completed dashboards. Empty owner fixtures do not represent populated personal, manager or specialist views. `/os/commercial/projects/audit-project` remains unverified because it needs a real isolated project fixture.

## Recommended presentation contract

- Desktop: use one or two lines for short and medium titles; long titles should use two lines when the real column width supports a readable font. Give text approximately two-thirds of a split hero when necessary.
- Tablet: test the transition near 900px explicitly. Avoid keeping desktop-sized type while prematurely narrowing the text column.
- Phones: target two lines for medium titles and three for long titles. Allow additional lines on narrower devices when required by readable text or user font settings.
- Break by meaning, then fit. Measure the actual font rather than assuming every character has the same width. Keep visible wording, punctuation, source attributes and accessible text unchanged.
- Preserve the existing light/dark brand treatments, CTA wording and supporting content. Improve geometry, type scale and spacing before selecting any new palette.
- Keep primary actions easy to reach. Large supporting visuals can move below the intro on phones, with real layout space rather than overlapping backgrounds.
- Validate keyboard focus, browser zoom, large-text settings, normal motion, reduced motion, dark mode and populated working states before shipping.

## Complete route inventory

Numbers are primary-heading line counts at each width. A dash means the primary title was not available in the fixture. “Keep compact” does not mean every other aspect of the page has passed a full UX review.

| Route                                 | 360 | 390 | 768 | 1024 | 1440 | Recommended action                                  |
| ------------------------------------- | --- | --- | --- | ---- | ---- | --------------------------------------------------- |
| /                                     | 4   | 4   | 2   | 2    | 2    | Keep desktop; improve mobile wrapping               |
| /product                              | 4   | 4   | 2   | 2    | 2    | Keep desktop; improve mobile wrapping               |
| /product/companion                    | 2   | 2   | 2   | 2    | 2    | Keep current headline composition                   |
| /product/experience                   | 3   | 3   | 2   | 2    | 2    | Keep desktop; improve mobile wrapping               |
| /product/intelligence                 | 3   | 2   | 2   | 2    | 2    | Keep current headline composition                   |
| /product/workflows                    | 2   | 2   | 2   | 2    | 2    | Keep current headline composition                   |
| /product/organizations                | 2   | 2   | 2   | 2    | 2    | Keep current headline composition                   |
| /how-it-works                         | 4   | 4   | 5   | 5    | 5    | High: desktop two lines; mobile two/three           |
| /how-it-works/clarity                 | 2   | 2   | 2   | 2    | 2    | Keep current headline composition                   |
| /how-it-works/capability              | 2   | 2   | 3   | 3    | 3    | Update desktop width/type; preserve readable mobile |
| /how-it-works/consistency             | 3   | 3   | 4   | 4    | 4    | Update desktop width/type; preserve readable mobile |
| /how-it-works/growth                  | 2   | 2   | 2   | 2    | 2    | Keep current headline composition                   |
| /how-it-works/rhythm                  | 3   | 3   | 3   | 3    | 3    | Update desktop width/type; preserve readable mobile |
| /who-its-for                          | 1   | 1   | 1   | 1    | 1    | Keep current headline composition                   |
| /who-its-for/individuals              | 3   | 3   | 3   | 3    | 3    | Update desktop width/type; preserve readable mobile |
| /who-its-for/professionals            | 3   | 3   | 3   | 3    | 3    | Update desktop width/type; preserve readable mobile |
| /who-its-for/creators                 | 2   | 2   | 2   | 2    | 2    | Keep current headline composition                   |
| /who-its-for/founders                 | 4   | 4   | 4   | 4    | 4    | High: desktop two lines; mobile two/three           |
| /who-its-for/teams                    | 2   | 2   | 3   | 3    | 3    | Update desktop width/type; preserve readable mobile |
| /who-its-for/smes                     | 4   | 4   | 5   | 5    | 5    | High: desktop two lines; mobile two/three           |
| /who-its-for/enterprises              | 4   | 4   | 6   | 6    | 6    | High: desktop two lines; mobile two/three           |
| /who-its-for/institutions             | 6   | 5   | 7   | 7    | 7    | High: desktop two lines; mobile two/three           |
| /enterprise                           | 2   | 2   | 3   | 3    | 3    | Update desktop width/type; preserve readable mobile |
| /security                             | 2   | 2   | 2   | 2    | 2    | Keep current headline composition                   |
| /responsible-ai                       | 2   | 2   | 4   | 4    | 4    | Update desktop width/type; preserve readable mobile |
| /trust/privacy                        | 2   | 2   | 3   | 3    | 3    | Update desktop width/type; preserve readable mobile |
| /trust/governance                     | 2   | 2   | 3   | 3    | 3    | Update desktop width/type; preserve readable mobile |
| /pricing                              | 2   | 2   | 2   | 2    | 2    | Keep current headline composition                   |
| /experts                              | 2   | 2   | 1   | 1    | 2    | Keep current headline composition                   |
| /enterprise/contact                   | 2   | 2   | 3   | 3    | 3    | Update desktop width/type; preserve readable mobile |
| /demo                                 | 2   | 2   | 1   | 1    | 1    | Keep current headline composition                   |
| /demo/request                         | 3   | 3   | 4   | 4    | 4    | Update desktop width/type; preserve readable mobile |
| /start                                | 2   | 2   | 2   | 2    | 2    | Keep compact; add consistent h1 semantics           |
| /resources                            | 3   | 3   | 4   | 4    | 4    | Update desktop width/type; preserve readable mobile |
| /insights                             | 1   | 1   | 2   | 2    | 2    | Keep current headline composition                   |
| /guides                               | 2   | 2   | 3   | 3    | 3    | Update desktop width/type; preserve readable mobile |
| /case-studies                         | 1   | 1   | 2   | 2    | 2    | Keep current headline composition                   |
| /research                             | 3   | 3   | 4   | 4    | 4    | Update desktop width/type; preserve readable mobile |
| /help                                 | 1   | 1   | 2   | 2    | 2    | Keep current headline composition                   |
| /help/getting-started                 | 1   | 1   | 1   | 1    | 1    | Keep current headline composition                   |
| /help/product                         | 3   | 3   | 4   | 4    | 4    | Update desktop width/type; preserve readable mobile |
| /help/account                         | 2   | 2   | 3   | 3    | 3    | Update desktop width/type; preserve readable mobile |
| /support                              | 1   | 1   | 2   | 2    | 2    | Keep current headline composition                   |
| /developers                           | 3   | 3   | 3   | 3    | 3    | Update desktop width/type; preserve readable mobile |
| /developers/api                       | 2   | 2   | 3   | 3    | 3    | Update desktop width/type; preserve readable mobile |
| /developers/sdks                      | 2   | 2   | 3   | 3    | 3    | Update desktop width/type; preserve readable mobile |
| /integrations                         | 2   | 2   | 3   | 3    | 3    | Update desktop width/type; preserve readable mobile |
| /developers/webhooks                  | 3   | 3   | 5   | 5    | 5    | Update desktop width/type; preserve readable mobile |
| /developers/changelog                 | 1   | 1   | 2   | 2    | 2    | Keep current headline composition                   |
| /about                                | 3   | 3   | 5   | 5    | 5    | Update desktop width/type; preserve readable mobile |
| /about/story                          | 2   | 2   | 3   | 3    | 3    | Update desktop width/type; preserve readable mobile |
| /about/leadership                     | 2   | 2   | 3   | 3    | 3    | Update desktop width/type; preserve readable mobile |
| /careers                              | 3   | 3   | 4   | 4    | 4    | Update desktop width/type; preserve readable mobile |
| /press                                | 2   | 2   | 2   | 2    | 2    | Keep current headline composition                   |
| /contact                              | 2   | 2   | 2   | 2    | 2    | Keep current headline composition                   |
| /legal/privacy                        | 1   | 1   | 1   | 1    | 1    | Keep current headline composition                   |
| /legal/terms                          | 1   | 1   | 1   | 1    | 1    | Keep current headline composition                   |
| /legal/cookies                        | 1   | 1   | 1   | 1    | 1    | Keep current headline composition                   |
| /legal/acceptable-use                 | 1   | 1   | 2   | 2    | 2    | Keep current headline composition                   |
| /legal/dpa                            | 2   | 2   | 2   | 2    | 2    | Keep current headline composition                   |
| /accessibility                        | 2   | 2   | 3   | 3    | 3    | Update desktop width/type; preserve readable mobile |
| /login                                | 2   | 2   | 2   | 2    | 2    | Keep compact; add consistent h1 semantics           |
| /signup                               | 2   | 2   | 2   | 2    | 2    | Keep compact; add consistent h1 semantics           |
| /forgot-password                      | 1   | 1   | 1   | 1    | 1    | Keep compact; add consistent h1 semantics           |
| /reset-password                       | 1   | 1   | 1   | 2    | 2    | Keep compact; add consistent h1 semantics           |
| /verify                               | 1   | 1   | 1   | 1    | 2    | Keep compact; add consistent h1 semantics           |
| /onboarding                           | 2   | 2   | 2   | 2    | 2    | Keep compact; add consistent h1 semantics           |
| /os                                   | 2   | 1   | 2   | 1    | 1    | Keep current headline composition                   |
| /os/today                             | 1   | 1   | 2   | 1    | 1    | Keep current headline composition                   |
| /os/clarity                           | 1   | 1   | 2   | 1    | 1    | Keep current headline composition                   |
| /os/capability                        | 2   | 2   | 1   | 1    | 1    | Keep current headline composition                   |
| /os/consistency                       | 1   | 1   | 2   | 1    | 1    | Keep current headline composition                   |
| /os/progress                          | 2   | 2   | 1   | 1    | 1    | Keep current headline composition                   |
| /os/rhythm                            | 2   | 2   | 3   | 2    | 1    | Keep current headline composition                   |
| /os/companion                         | 2   | 1   | 1   | 1    | 1    | Keep current headline composition                   |
| /os/insights                          | 1   | 1   | 1   | 1    | 1    | Keep current headline composition                   |
| /os/business                          | 1   | 1   | 1   | 1    | 1    | Keep current headline composition                   |
| /os/opportunities                     | 1   | 1   | 1   | 1    | 1    | Keep compact; add consistent h1 semantics           |
| /os/finance                           | 1   | 1   | 1   | 1    | 1    | Keep compact; add consistent h1 semantics           |
| /os/people                            | 1   | 1   | 1   | 1    | 1    | Keep compact; add consistent h1 semantics           |
| /os/workflows                         | 1   | 1   | 1   | 1    | 1    | Keep current headline composition                   |
| /os/workflows/audit-workflow          | 2   | 2   | 1   | 1    | 1    | Keep current headline composition                   |
| /os/organization                      | 2   | 1   | 1   | 1    | 1    | Keep current headline composition                   |
| /os/teams                             | 1   | 1   | 1   | 1    | 1    | Keep compact; add consistent h1 semantics           |
| /os/organization/rhythm               | 3   | 2   | 2   | 1    | 1    | Keep current headline composition                   |
| /os/analytics                         | 2   | 2   | 2   | 1    | 1    | Keep current headline composition                   |
| /os/integrations                      | 1   | 1   | 1   | 1    | 1    | Keep compact; add consistent h1 semantics           |
| /os/governance                        | 2   | 2   | 2   | 2    | 1    | Keep current headline composition                   |
| /os/audit                             | 1   | 1   | 1   | 1    | 1    | Keep current headline composition                   |
| /os/admin                             | 1   | 1   | 1   | 1    | 1    | Keep current headline composition                   |
| /os/profile                           | 1   | 1   | 1   | 1    | 1    | Keep current headline composition                   |
| /os/settings                          | 1   | 1   | 1   | 1    | 1    | Keep current headline composition                   |
| /os/settings/ai                       | 1   | 1   | 1   | 1    | 1    | Keep current headline composition                   |
| /os/settings/privacy                  | 1   | 1   | 1   | 1    | 1    | Keep current headline composition                   |
| /os/notifications                     | 1   | 1   | 1   | 1    | 1    | Keep current headline composition                   |
| /os/settings/workspace                | 1   | 1   | 1   | 1    | 1    | Keep current headline composition                   |
| /os/settings/members                  | 1   | 1   | 1   | 1    | 1    | Keep current headline composition                   |
| /os/settings/billing                  | 1   | 1   | 1   | 1    | 1    | Keep current headline composition                   |
| /os/settings/plan                     | 1   | 1   | 1   | 1    | 1    | Keep current headline composition                   |
| /os/companion/chat                    | 1   | 1   | 1   | 1    | 1    | Keep current headline composition                   |
| /os/settings/notifications            | 1   | 1   | 1   | 1    | 1    | Keep current headline composition                   |
| /os/growth                            | 1   | 1   | 1   | 1    | 1    | Keep compact; add consistent h1 semantics           |
| /os/whats-new                         | 1   | 1   | 1   | 1    | 1    | Keep compact; add consistent h1 semantics           |
| /os/commercial                        | 2   | 1   | 4   | 2    | 1    | Keep current headline composition                   |
| /os/commercial/projects               | 1   | 1   | 1   | 1    | 1    | Keep compact; add consistent h1 semantics           |
| /os/commercial/projects/audit-project | —   | —   | —   | —    | —    | Unverified: requires project data                   |
| /os/concierge                         | 1   | 1   | 1   | 1    | 1    | Keep current headline composition                   |
| /os/talent                            | 1   | 1   | 1   | 1    | 1    | Keep compact; add consistent h1 semantics           |
| /os/engines                           | 1   | 1   | 1   | 1    | 1    | Keep compact; add consistent h1 semantics           |
| /os/pricing                           | 1   | 1   | 1   | 1    | 1    | Keep compact; add consistent h1 semantics           |
| /os/scoping/new                       | 1   | 1   | 1   | 1    | 1    | Keep compact; add consistent h1 semantics           |
| /os/learning                          | 1   | 1   | 1   | 1    | 1    | Keep compact; add consistent h1 semantics           |
| /os/knowledge                         | 1   | 1   | 1   | 1    | 1    | Keep current headline composition                   |

## Artifacts and next implementation pass

- `audit-results/ui-heroes-2026-10-06/index.html`: interactive screenshot comparison, viewport metrics and route selection.
- `measurements.json`: all measured views, title lines, geometry, CTA positions, heading counts, page errors and fixture scope.
- `previews.json`: presentation-only experiments with exact headline-preservation checks.
- `screenshots/`: 226 baseline opening views and 30 preview images.
- `scripts/audit-hero-layouts.mjs`, `scripts/preview-hero-layouts.mjs`, `scripts/build-hero-audit-report.mjs`: repeatable local inspection tools.

Implement the shared width/type correction first, then page-family-specific breaks and spacing. Verify the full width matrix against the original content and recheck bento image placement. Complete populated project, dashboard, role, dark-theme and large-text coverage before calling this a full UI acceptance pass.
