import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import AxeBuilder from '@axe-core/playwright';
import { auditHarness } from './full-ui-harness.mjs';
const report = { pages: [] },
  h = await auditHarness(report);
try {
  for (const path of [
    '/',
    '/pricing',
    '/guides',
    '/support',
    '/os',
    '/os/settings/payouts',
    '/os/commercial',
    '/os/finance',
    '/os/engines',
    '/os/scoping/new',
  ]) {
    const s = await h.session('Founder', 'team', !path.startsWith('/os'), true);
    try {
      await s.go(path);
      const result = await new AxeBuilder({ page: s.page }).analyze();
      const violations = result.violations.map((v) => ({
        id: v.id,
        impact: v.impact,
        nodes: v.nodes.map((n) => ({ target: n.target, summary: n.failureSummary })),
      }));
      report.pages.push({ path, violations });
      console.log(path, JSON.stringify(violations));
    } finally {
      await s.context.close();
    }
  }
} finally {
  mkdirSync('test-results/full-ui', { recursive: true });
  writeFileSync(
    'test-results/full-ui/accessibility-regression.json',
    JSON.stringify(report, null, 2),
  );
  await h.close();
}
assert.equal(
  report.pages
    .flatMap((p) => p.violations)
    .filter((v) => ['serious', 'critical'].includes(v.impact)).length,
  0,
);
