import { chromium } from '@playwright/test';
import { statSync } from 'node:fs';
import assert from 'node:assert/strict';
const origin = 'http://127.0.0.1:3100';
const { engines } = await (await fetch(`${origin}/api/engines/catalog`)).json();
for (const engine of engines)
  assert(statSync(`public/videos/engines/${engine.code}.webm`).size > 1000);
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await page.goto(`${origin}/demo`);
  await page.locator('#all-engine-demos .catalog-demo-grid > li').last().waitFor();
  assert.equal(
    await page.locator('#all-engine-demos .catalog-demo-grid > li').count(),
    engines.length,
  );
  for (const engine of engines) {
    await page
      .locator('#all-engine-demos')
      .getByRole('button', { name: `Demo engine: ${engine.engineName}`, exact: true })
      .click();
    const dialog = page.getByRole('dialog', { name: `${engine.engineName} demo`, exact: true });
    await dialog.waitFor();
    assert.equal(
      await dialog.locator('video').getAttribute('src'),
      `/videos/engines/${engine.code}.webm`,
    );
    await dialog.locator('video').evaluate(
      (video) =>
        new Promise((resolve, reject) => {
          if (video.readyState >= 2) return resolve();
          video.addEventListener('loadeddata', resolve, { once: true });
          video.addEventListener('error', reject, { once: true });
        }),
    );
    assert.equal(
      await dialog.getByRole('link', { name: 'Get your diagnosis' }).getAttribute('href'),
      `/os/engines?tool=${engine.code}`,
    );
    assert((await dialog.innerText()).includes(engine.computes));
    await page.keyboard.press('Escape');
  }
  await page.locator('#all-engine-demos input').fill(engines[0].engineName);
  assert.equal(await page.locator('#all-engine-demos .catalog-demo-grid > li').count(), 1);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('#all-engine-demos button').click();
  await page.getByRole('dialog').waitFor();
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  assert(
    await page.getByRole('dialog').evaluate((dialog) => dialog.scrollWidth <= dialog.clientWidth),
  );
  await page.getByRole('link', { name: 'Get your diagnosis' }).click();
  await page.waitForURL(/\/login/);
  assert(new URL(page.url()).searchParams.get('returnTo').includes(engines[0].code));
  await page.goto(`${origin}/product/intelligence`);
  await page.locator('.engine-catalog-card button').last().waitFor();
  assert.equal(await page.locator('.engine-catalog-card button').count(), engines.length);
  console.log(
    `PASS: ${engines.length} matching playable demos, search, mobile layout, Escape, sign-in return path, and public catalog coverage.`,
  );
} finally {
  await browser.close();
}
