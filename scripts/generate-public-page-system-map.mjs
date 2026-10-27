import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const pages = JSON.parse((await readFile('src/content/pages.json', 'utf8')).replace(/^\uFEFF/, ''));
const accountRoutes = new Set([
  '/login',
  '/signup',
  '/forgot-password',
  '/reset-password',
  '/verify',
  '/onboarding',
]);
const publicPages = pages.filter(
  (page) => String(page.indexing).startsWith('index') || accountRoutes.has(page.route),
);

function role(route) {
  if (route === '/') return ['Discovery', 'Introduces the platform promise and directs visitors toward product detail, the live demo, or a conversation.'];
  if (accountRoutes.has(route)) return ['Account access', 'Supports sign-in, account creation, recovery, verification, or first-time setup. Connects a visitor identity to their personal, team, or organizational context.'];
  if (route.startsWith('/product') || route.startsWith('/how-it-works')) return ['Product understanding', 'Explains the platform, its capabilities, and its Decide–Build–Deliver model. Connects the promise to tools, workflows, and human oversight.'];
  if (route.startsWith('/who-its-for')) return ['Audience fit', 'Shows how the platform applies to this audience’s context. Connects general capabilities to relevant work and routes visitors toward product exploration.'];
  if (['/pricing', '/experts', '/enterprise/contact', '/demo', '/demo/request', '/start', '/contact'].includes(route)) return ['Next step', 'Helps a visitor choose how to proceed: explore, compare access, talk with an adviser, or start an account.'];
  if (route.startsWith('/trust') || ['/security', '/responsible-ai', '/enterprise', '/case-studies', '/research', '/press', '/accessibility'].includes(route) || route.startsWith('/legal/')) return ['Trust and assurance', 'Explains safeguards, evidence, policies, or organizational requirements that support responsible evaluation and adoption.'];
  if (route.startsWith('/help') || ['/support', '/guides'].includes(route)) return ['Adoption and support', 'Helps people use the product, manage their account, and resolve issues so they can keep work moving.'];
  if (route.startsWith('/developers') || route === '/integrations') return ['Extension and integration', 'Explains supported ways to connect external systems or build against platform interfaces while preserving permissions and boundaries.'];
  if (['/resources', '/insights'].includes(route)) return ['Learning and practice', 'Provides ideas and practical material that help visitors understand decisions, capability, delivery, and organizational work.'];
  if (route.startsWith('/about') || route === '/careers') return ['Company and people', 'Explains the company’s purpose, leadership, story, and the people who build the platform.'];
  return ['Public information', 'Provides information that helps visitors understand, evaluate, or use LAMID ONE.'];
}

const escapeCell = (value) => String(value ?? '').replaceAll('|', '\\|').replace(/\s+/g, ' ').trim();
const rows = publicPages.map((page) => {
  const [journey, connection] = role(page.route);
  const headings = (page.sections ?? []).slice(0, 4).map((section) => section.title).filter(Boolean);
  const serves = headings.length ? headings.join(' · ') : page.description;
  return `| \`${escapeCell(page.route)}\` · ${escapeCell(page.name)} | **${escapeCell(page.title)}** — ${escapeCell(page.description)} | ${escapeCell(serves)} | **${journey}.** ${escapeCell(connection)} |`;
});

const report = `# Public page map: how each page serves LAMID ONE

This map covers ${publicPages.length} customer-facing routes from the generated page catalog: indexable public pages and the noindex account access flows. Private workspace and internal routes are omitted. “Core message” uses each page’s current source title and description. “What it does” summarizes its first section headings. “System connection” places the page in the visitor journey and explains how it connects to the LAMID ONE platform. Pages with custom rendering may show additional or differently ordered content; this is a source-based map, not a visual QA report.

| Page | Core message and content | What it does | How it connects to LAMID ONE |
|---|---|---|---|
${rows.join('\n')}

## System-level reading

- **The central story:** LAMID ONE is a connected platform that helps people decide what matters, build capability, and deliver work. The homepage and product page now share that description and put human control near the start.
- **The operating model:** Clarity, Capability, and Consistency describe the progression; task categories and tools show how people apply it to real work. Audience pages translate that model into different contexts.
- **The visitor paths:** /demo supports self-guided exploration; /contact, /experts, and /enterprise/contact support conversations with people; /pricing and /start help visitors evaluate or begin.
- **Trust supports adoption:** security, privacy, governance, responsible AI, and legal pages explain boundaries and accountability. They make the platform easier to evaluate, especially for organizational use.
- **Learning and extension:** resources, insights, guides, help, developers, and integrations support continued use and connections to existing systems.

## Messaging and proof to keep aligned

- The home and product pages use **platform** as the umbrella term, but pages such as /pricing, /who-its-for/founders, /demo, and /help/product still say **operating system**. Some pages also alternate between **portal**, **execution**, and **delivery**. Review those page by page so the chosen words match the capability being described.
- Keep the three pillars named consistently as **Clarity, Capability, and Consistency**. Explain the movement with **Decide, Build, Deliver**; describe growth as the outcome.
- Keep the two visitor paths visible near the top of product storytelling: explore the live experience, or talk with an adviser. Explain that AI suggests, explains, and prepares while people decide what happens next.
- The case-studies page currently describes the evidence standard, but the catalog contains no named customer stories or measured outcomes. Keep it distinct from audience examples until approved evidence is available.
- Content sources are not fully centralized: the homepage and product share the approved platform description, while other pages author their own wording in page content files. Treat this table as a review map for those sources, not a claim that all wording already follows one voice.

## Recommended review sequence

1. Agree the platform and operating-model terms.
2. Review product and how-it-works pages, then audience pages.
3. Review demo, pricing, contact, and start paths for clear next steps.
4. Review trust, learning, support, and developer pages for accurate capability and scope.
5. Publish customer proof only after evidence and customer approval are in place.
`;

const output = path.resolve('lamiddoc/docs/public-page-system-map.md');
await mkdir(path.dirname(output), { recursive: true });
await writeFile(output, report);
console.log(`Wrote ${output} with ${publicPages.length} page rows.`);
