import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { renderRoute } from '../dist-ssr/entry-server.js';

const routes = [
  '/',
  '/product',
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
const pages = JSON.parse((await readFile('src/content/pages.json', 'utf8')).replace(/^\uFEFF/, ''));
const template = await readFile('dist/index.html', 'utf8');
const root = path.resolve('dist');
const escapeAttribute = (value) => String(value ?? '').replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;');

for (const route of routes) {
  const page = pages.find((item) => item.route === route);
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
  const destination = route === '/' ? path.join(root, 'index.html') : path.join(root, route.slice(1), 'index.html');
  await mkdir(path.dirname(destination), { recursive: true });
  await writeFile(destination, html);
  console.log(`Prerendered ${route}`);
}
await rm('dist-ssr', { recursive: true, force: true });
