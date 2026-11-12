import { chromium } from '@playwright/test';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.resolve(__dirname, '../dist');

async function run() {
  const app = express();
  app.use(express.static(distDir));
  app.use((req, res) => {
    res.sendFile(path.join(distDir, 'index.html'));
  });

  const server = app.listen(4199);
  console.log('Test server listening on http://localhost:4199');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const errors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });

  try {
    // 1. Check Homepage
    console.log('Verifying Homepage hero & product cards...');
    await page.goto('http://localhost:4199/', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('h1');

    const heroTitle = await page.textContent('h1');
    console.log('Homepage H1:', heroTitle?.trim());

    await page.waitForSelector('.lg-sub');
    const heroSubtitle = await page.locator('.lg-sub').textContent();
    console.log('Homepage Subtitle preview:', heroSubtitle?.trim().slice(0, 100));

    if (!heroSubtitle?.includes('Continuous intelligence creates the capability to decide')) {
      throw new Error(`Homepage subtitle missing expected text! Got: ${heroSubtitle}`);
    }

    await page.waitForSelector('.lg-card');
    const cards = await page.locator('.lg-card').all();
    console.log(`Found ${cards.length} product cards on homepage`);
    if (cards.length !== 8) {
      throw new Error(`Expected 8 product cards, found ${cards.length}`);
    }

    const cardHrefs = [];
    for (const card of cards) {
      const href = await card.getAttribute('href');
      const title = await card.locator('h3').textContent();
      cardHrefs.push({ title: title?.trim(), href });
    }
    console.log('Homepage card links:', cardHrefs);

    const expectedRoutes = [
      '/product/strategy',
      '/product/decisions',
      '/product/people',
      '/product/operations',
      '/product/finance',
      '/product/risk-governance',
      '/product/growth-change',
      '/product/advisory',
    ];

    for (const route of expectedRoutes) {
      const match = cardHrefs.find((c) => c.href === route);
      if (!match) throw new Error(`Missing expected route ${route} in homepage cards`);
    }

    // 2. Test each of the 8 product suite pages
    console.log('\nVerifying 8 dedicated product suite pages...');
    for (const route of expectedRoutes) {
      console.log(`Checking ${route}...`);
      await page.goto(`http://localhost:4199${route}`, { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('.suite-title');

      // Check no "Page not found"
      const pageText = await page.textContent('body');
      if (pageText?.includes('Page not found')) {
        throw new Error(`Route ${route} displayed "Page not found"!`);
      }

      // Check title and hero
      const title = await page.locator('.suite-title').textContent();
      const lede = await page.locator('.suite-lede').textContent();
      const pillarBadge = await page.locator('.suite-pillar-badge').textContent();
      const tags = await page.locator('.suite-tag-pill').allTextContents();
      const engineCards = await page.locator('.suite-engine-card').all();
      const video = await page.locator('video').count();

      console.log(`  -> Title: ${title?.trim()}`);
      console.log(`  -> Pillar: ${pillarBadge?.trim()}`);
      console.log(`  -> Tags (${tags.length}): ${tags.slice(0, 3).join(', ')}...`);
      console.log(`  -> Engines count: ${engineCards.length}`);
      console.log(`  -> Video present: ${video > 0}`);

      if (!title || !lede) {
        throw new Error(`Missing title or lede on ${route}`);
      }
      if (video === 0) {
        throw new Error(`Missing video on ${route}`);
      }
      if (route !== '/product/advisory' && engineCards.length === 0) {
        throw new Error(`Expected engine cards on ${route}`);
      }
    }

    console.log('\nAll 8 product suite pages verified successfully with 0 errors!');
  } finally {
    await browser.close();
    server.close();
  }
}

run().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
