import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import AxeBuilder from '@axe-core/playwright';
import { auditHarness } from './full-ui-harness.mjs';
const report = {
  started: new Date().toISOString(),
  boundary:
    '390x844 Chromium emulation with reduced motion; not a physical-device certification. Public real API requests blocked; workspace demo handlers execute.',
  pages: [],
  errors: [],
};
mkdirSync('test-results/full-ui', { recursive: true });
const save = () =>
  writeFileSync('test-results/full-ui/mobile-accessibility.json', JSON.stringify(report, null, 2));
const harness = await auditHarness(report);
const source = readFileSync('src/App.tsx', 'utf8');
const workspace = [
  '/os',
  ...[...source.slice(source.indexOf('path="/os"')).matchAll(/<Route path="([^":*]+)"/g)]
    .filter((match) => !match[1].startsWith('/'))
    .map((match) => `/os/${match[1]}`),
];
try {
  for (const publicOnly of [true, false]) {
    let session = await harness.session('Founder', 'team', publicOnly, true);
    const paths = publicOnly
      ? JSON.parse(readFileSync('src/content/pages.json', 'utf8'))
          .map((page) => page.route)
          .filter((path) => !path.startsWith('/os'))
      : workspace;
    try {
      for (const path of paths) {
        const row = { path, kind: publicOnly ? 'public' : 'demo', outcome: 'unconfirmed' };
        report.pages.push(row);
        save();
        const watchdog = setTimeout(() => {
          row.watchdog = true;
          void session.page.close().catch(() => {});
        }, 12000);
        try {
          await session.go(path);
          row.documentOverflow = await session.page.evaluate(
            () => document.documentElement.scrollWidth > innerWidth + 2,
          );
          row.controlsOutsideViewport = await session.page
            .locator(
              'main button:visible,main input:visible,main select:visible,main textarea:visible',
            )
            .evaluateAll((els) =>
              els
                .map((el) => ({
                  label: (
                    el.getAttribute('aria-label') ||
                    el.innerText ||
                    el.getAttribute('placeholder') ||
                    el.name ||
                    el.type
                  ).slice(0, 100),
                  left: el.getBoundingClientRect().left,
                  right: el.getBoundingClientRect().right,
                }))
                .filter((el) => el.left >= 0 && el.right > innerWidth + 2),
            );
          row.outcome = 'layout-inspected';
          if (
            publicOnly
              ? ['/', '/guides', '/pricing', '/support'].includes(path)
              : [
                  '/os',
                  '/os/engines',
                  '/os/commercial',
                  '/os/finance',
                  '/os/scoping/new',
                  '/os/settings/payouts',
                ].includes(path)
          ) {
            const result = await new AxeBuilder({ page: session.page }).analyze();
            row.accessibility = result.violations.map((violation) => ({
              id: violation.id,
              impact: violation.impact,
              description: violation.description,
              nodes: violation.nodes.map((node) => ({
                target: node.target,
                summary: node.failureSummary,
              })),
            }));
            await session.page.screenshot({
              path: `test-results/full-ui/mobile-${path.replaceAll('/', '-') || 'home'}.png`,
              fullPage: true,
            });
          }
          if (path === '/os') {
            const menu = session.page
              .getByRole('button', { name: /open navigation|open menu|menu/i })
              .first();
            if (await menu.count()) {
              await menu.click();
              row.menuOpened = await session.page.locator('.sidebar').isVisible();
            }
          }
        } catch (error) {
          row.outcome = 'failed-or-unconfirmed';
          row.error = error.message.split('\n')[0];
        } finally {
          clearTimeout(watchdog);
          save();
          if (session.page.isClosed()) {
            await session.context.close();
            session = await harness.session('Founder', 'team', publicOnly, true);
          }
        }
        console.log(`Mobile ${path}: ${row.outcome}`);
      }
      report.errors.push(...session.errors);
    } finally {
      await session.context.close();
    }
  }
} finally {
  report.finished = new Date().toISOString();
  save();
  await harness.close();
}
