import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { renderRoute } from '../dist-ssr/entry-server.js';

const routes = [
  '/',
  '/product',
  '/product/strategy',
  '/product/decisions',
  '/product/people',
  '/product/operations',
  '/product/finance',
  '/product/risk-governance',
  '/product/growth-change',
  '/product/advisory',
  '/contact',
  '/pricing',
  '/how-it-works',
  '/who-its-for',
  '/case-studies',
  '/security',
  '/resources',
  '/insights',
  '/guides',
  '/help',
  '/support',
  '/about',
  '/about/story',
  '/about/leadership',
  '/accessibility',
  '/integrations',
  '/enterprise',
  '/responsible-ai',
];

const productSuiteMeta = {
  '/product/strategy': {
    title: 'Strategy & Execution Suite | LAMID ONE',
    seo_title: 'Strategy & Execution Suite | LAMID ONE',
    description:
      'Line up purpose, priorities, and capital. Rank what to do first with verified decision engines.',
    meta_description:
      'Line up purpose, priorities, and capital. Rank what to do first with verified decision engines.',
  },
  '/product/decisions': {
    title: 'Decisions & Quality Scoring Suite | LAMID ONE',
    seo_title: 'Decisions & Quality Scoring Suite | LAMID ONE',
    description:
      'Structure complex choices, quantify risk, and audit governance with verified decision engines.',
    meta_description:
      'Structure complex choices, quantify risk, and audit governance with verified decision engines.',
  },
  '/product/people': {
    title: 'People & Skills Suite | LAMID ONE',
    seo_title: 'People & Skills Suite | LAMID ONE',
    description: 'Map workforce competency, close capability gaps, and build bench strength.',
    meta_description: 'Map workforce competency, close capability gaps, and build bench strength.',
  },
  '/product/operations': {
    title: 'Operations & Process Suite | LAMID ONE',
    seo_title: 'Operations & Process Suite | LAMID ONE',
    description:
      'Eliminate workflow bottlenecks, catch performance drift, and optimize operating rhythm.',
    meta_description:
      'Eliminate workflow bottlenecks, catch performance drift, and optimize operating rhythm.',
  },
  '/product/finance': {
    title: 'Finance & Capital Health Suite | LAMID ONE',
    seo_title: 'Finance & Capital Health Suite | LAMID ONE',
    description: 'Model cash runway, evaluate capital allocation, and stress-test unit economics.',
    meta_description:
      'Model cash runway, evaluate capital allocation, and stress-test unit economics.',
  },
  '/product/risk-governance': {
    title: 'Risk & Governance Suite | LAMID ONE',
    seo_title: 'Risk & Governance Suite | LAMID ONE',
    description:
      'Monitor regulatory exposure, safeguard organizational compliance, and mitigate systemic risks.',
    meta_description:
      'Monitor regulatory exposure, safeguard organizational compliance, and mitigate systemic risks.',
  },
  '/product/growth-change': {
    title: 'Growth & Change Suite | LAMID ONE',
    seo_title: 'Growth & Change Suite | LAMID ONE',
    description:
      'Score expansion opportunities, navigate organizational transformation, and assess readiness.',
    meta_description:
      'Score expansion opportunities, navigate organizational transformation, and assess readiness.',
  },
  '/product/advisory': {
    title: 'Expert Advisory Network | LAMID ONE',
    seo_title: 'Expert Advisory Network | LAMID ONE',
    description:
      'Match with vetted tier-one executive advisers, fractional leadership, and milestone escrow.',
    meta_description:
      'Match with vetted tier-one executive advisers, fractional leadership, and milestone escrow.',
  },
};
const pages = JSON.parse((await readFile('src/content/pages.json', 'utf8')).replace(/^\uFEFF/, ''));
const template = await readFile('dist/index.html', 'utf8');
const root = path.resolve('dist');
const escapeAttribute = (value) =>
  String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;');

for (const route of routes) {
  const page = pages.find((item) => item.route === route) || productSuiteMeta[route];
  if (!page) throw new Error(`Missing page metadata for ${route}`);
  const markup = await renderRoute(route);
  const canonical = `https://lamidconsulting.com${page.canonical || route}`;
  const title = escapeAttribute(page.seo_title || page.title || 'LAMID ONE');
  const description = escapeAttribute(page.meta_description || page.description || '');
  const robots = escapeAttribute(page.indexing || 'index, follow');
  const html = template
    .replace(/<title>[^<]*<\/title>/, `<title>${title}</title>`)
    .replace(/(<meta name="description"\s+content=")[^"]*("\s*\/?>)/, `$1${description}$2`)
    .replace(/(<meta name="robots"\s+content=")[^"]*("\s*\/?>)/, `$1${robots}$2`)
    .replace(/(<link rel="canonical" href=")[^"]*("\s*\/?>)/, `$1${canonical}$2`)
    .replace(/(<meta property="og:title" content=")[^"]*("\s*\/?>)/, `$1${title}$2`)
    .replace(/(<meta property="og:description"\s+content=")[^"]*("\s*\/?>)/, `$1${description}$2`)
    .replace(/(<meta property="og:url" content=")[^"]*("\s*\/?>)/, `$1${canonical}$2`)
    .replace(/(<meta name="twitter:title" content=")[^"]*("\s*\/?>)/, `$1${title}$2`)
    .replace(/(<meta name="twitter:description"\s+content=")[^"]*("\s*\/?>)/, `$1${description}$2`)
    .replace('<div id="root"></div>', `<div id="root" data-prerendered="${route}">${markup}</div>`);
  const destination =
    route === '/' ? path.join(root, 'index.html') : path.join(root, route.slice(1), 'index.html');
  await mkdir(path.dirname(destination), { recursive: true });
  await writeFile(destination, html);
  console.log(`Prerendered ${route}`);
}
await rm('dist-ssr', { recursive: true, force: true });
