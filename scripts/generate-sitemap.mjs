import { writeFileSync, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { readProductPages } from './lib/page-content.mjs';

const siteUrl = 'https://lamid.one';
const today = new Date().toISOString().split('T')[0];

function getPriority(route) {
  if (route === '/') return '1.0';
  if (
    route.startsWith('/product') ||
    route.startsWith('/how-it-works') ||
    route === '/pricing' ||
    route === '/experts'
  )
    return '0.9';
  if (route.startsWith('/who-its-for') || route.startsWith('/about')) return '0.8';
  if (
    route.startsWith('/insights') ||
    route.startsWith('/resources') ||
    route.startsWith('/case-studies')
  )
    return '0.7';
  if (route.startsWith('/help') || route.startsWith('/support') || route.startsWith('/developers'))
    return '0.6';
  return '0.5';
}

function getChangeFreq(route) {
  if (route === '/' || route === '/pricing' || route === '/experts') return 'daily';
  if (route.startsWith('/insights') || route.startsWith('/resources')) return 'weekly';
  return 'monthly';
}

export function generateSitemap() {
  const pages = readProductPages();
  // Filter for indexable public pages
  const indexablePages = pages.filter((page) => {
    if (page.indexing && page.indexing.includes('noindex')) return false;
    if (page.route.startsWith('/os') || page.route.startsWith('/workspace')) return false;
    if (
      [
        '/start',
        '/signup',
        '/login',
        '/password-recovery',
        '/reset-password',
        '/verify-account',
      ].includes(page.route)
    )
      return false;
    return true;
  });

  const urlsXml = indexablePages
    .map((page) => {
      const canonicalRoute = page.canonical || page.route;
      const loc = `${siteUrl}${canonicalRoute.startsWith('/') ? canonicalRoute : `/${canonicalRoute}`}`;
      const priority = getPriority(page.route);
      const changefreq = getChangeFreq(page.route);
      return `  <url>
    <loc>${loc}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
    })
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlsXml}
</urlset>
`;

  if (!existsSync('public')) {
    mkdirSync('public', { recursive: true });
  }

  writeFileSync(path.resolve('public/sitemap.xml'), xml, 'utf8');
  console.log(`Generated public/sitemap.xml with ${indexablePages.length} indexable URLs.`);

  const robotsTxt = `User-agent: *
Allow: /
Disallow: /api/
Disallow: /os/
Disallow: /workspace/
Disallow: /start
Disallow: /signup
Disallow: /login
Disallow: /reset-password
Disallow: /password-recovery
Disallow: /verify-account

Sitemap: ${siteUrl}/sitemap.xml
`;

  writeFileSync(path.resolve('public/robots.txt'), robotsTxt, 'utf8');
  console.log('Generated public/robots.txt');
}

generateSitemap();
