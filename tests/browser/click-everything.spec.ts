import { test, expect } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';

// Finds every internal link and non-destructive button on each public page and actually clicks
// or navigates it, catching dead links (like the /pricing one just found), 404s, and console
// errors — the class of bug a scripted happy-path test never exercises, since it only ever
// clicks the buttons the script author already expected to be there.
const pagesToSweep = [
  '/', '/product', '/how-it-works', '/pricing', '/about', '/about/story', '/about/leadership',
  '/contact', '/help', '/security', '/responsible-ai', '/developers', '/careers', '/press',
  '/insights', '/case-studies', '/resources', '/guides', '/research', '/integrations',
  '/who-its-for', '/accessibility', '/support', '/legal/privacy', '/legal/terms',
];

// Buttons whose visible text signals a destructive/consequential or non-idempotent action —
// never auto-clicked, only logged as skipped.
const skipPatterns = [
  /sign out/i, /delete/i, /remove/i, /cancel/i, /disconnect/i, /revoke/i, /buy\b/i, /pay\b/i,
  /purchase/i, /subscribe/i, /submit/i, /send\b/i, /post\b/i, /create/i, /save\b/i, /approve/i,
  /dispute/i, /refund/i, /release/i, /award/i,
];

test('sweep every public page: click every internal link and safe button, report what breaks', async ({ page }) => {
  const results: Array<Record<string, unknown>> = [];
  const consoleErrors: string[] = [];
  page.on('pageerror', (error) => consoleErrors.push(`pageerror: ${error.message}`));
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(`console.error: ${msg.text()}`);
  });
  const out = 'artifacts/click-everything';
  mkdirSync(out, { recursive: true });
  const visited = new Set<string>();

  for (const path of pagesToSweep) {
    const pageResult: Record<string, unknown> = { page: path, links: [] as unknown[], buttons: [] as unknown[] };
    const linkResults = pageResult.links as Array<Record<string, unknown>>;
    const buttonResults = pageResult.buttons as Array<Record<string, unknown>>;
    const errorsBefore = consoleErrors.length;
    try {
      const response = await page.goto(path, { waitUntil: 'networkidle', timeout: 20000 });
      pageResult.status = response?.status();
      if (!response || response.status() >= 400) {
        pageResult.pageLoadFailed = true;
        results.push(pageResult);
        continue;
      }
    } catch (error) {
      pageResult.pageLoadFailed = true;
      pageResult.error = (error as Error).message;
      results.push(pageResult);
      continue;
    }

    // Every internal link on the page: follow it, check it loads, come back.
    const hrefs = await page.locator('a[href]').evaluateAll((links) =>
      links.map((l) => (l as HTMLAnchorElement).getAttribute('href')).filter(Boolean),
    );
    const internalHrefs = [...new Set(hrefs)].filter(
      (h): h is string => Boolean(h) && h.startsWith('/') && !h.startsWith('//'),
    );
    for (const href of internalHrefs) {
      const clean = href.split('#')[0].split('?')[0];
      if (!clean || visited.has(clean)) continue;
      visited.add(clean);
      try {
        const response = await page.request.get(clean);
        linkResults.push({ href, status: response.status(), ok: response.status() < 400 });
      } catch (error) {
        linkResults.push({ href, ok: false, error: (error as Error).message });
      }
    }
    await page.goto(path, { waitUntil: 'networkidle', timeout: 20000 }).catch(() => {});

    // Every visible, non-destructive button on the page: click it, see what happens, then
    // return to the original page before continuing (a click may open a modal or navigate).
    const buttonCount = await page.getByRole('button').count();
    for (let i = 0; i < buttonCount; i++) {
      const button = page.getByRole('button').nth(i);
      let label = '';
      try {
        label = (await button.innerText({ timeout: 2000 })).trim();
      } catch {
        continue;
      }
      if (!label || skipPatterns.some((p) => p.test(label))) {
        buttonResults.push({ label, skipped: true });
        continue;
      }
      try {
        if (!(await button.isVisible()) || !(await button.isEnabled())) {
          buttonResults.push({ label, skipped: true, reason: 'not visible/enabled' });
          continue;
        }
        await button.click({ timeout: 5000 });
        await page.waitForTimeout(400);
        buttonResults.push({ label, clicked: true });
        // Close anything that opened (dialog/modal) and return to a clean state.
        await page.keyboard.press('Escape').catch(() => {});
        if (page.url() !== new URL(path, page.url()).toString()) {
          await page.goto(path, { waitUntil: 'networkidle', timeout: 20000 }).catch(() => {});
        }
      } catch (error) {
        buttonResults.push({ label, clicked: false, error: (error as Error).message });
      }
    }

    pageResult.newConsoleErrors = consoleErrors.slice(errorsBefore);
    results.push(pageResult);
  }

  writeFileSync(`${out}/result.json`, JSON.stringify(results, null, 2));

  // Summarize failures for a quick read without opening the full JSON.
  const brokenLinks = results.flatMap((r) =>
    ((r.links as Array<Record<string, unknown>>) || [])
      .filter((l) => !l.ok)
      .map((l) => ({ page: r.page, ...l })),
  );
  const failedButtons = results.flatMap((r) =>
    ((r.buttons as Array<Record<string, unknown>>) || [])
      .filter((b) => b.clicked === false)
      .map((b) => ({ page: r.page, ...b })),
  );
  const pagesWithErrors = results.filter((r) => ((r.newConsoleErrors as string[]) || []).length > 0);
  writeFileSync(
    `${out}/summary.json`,
    JSON.stringify({ brokenLinks, failedButtons, pagesWithErrors, pagesSwept: results.length }, null, 2),
  );

  expect(results.length).toBeGreaterThan(0);
});
