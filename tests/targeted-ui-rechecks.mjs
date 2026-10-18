import { mkdirSync, writeFileSync } from 'node:fs';
import { auditHarness } from './full-ui-harness.mjs';
import { catalogSummary } from '../src/app/engines.mjs';
import { POINTS_UNIT_PRICE_MINOR } from '../src/app/billing.mjs';
const report = {
  boundary:
    'Production UI with local pricing data from the real catalog. Support submits are blocked; checkout returns simulated 401. No external message or purchase.',
  cases: [],
};
mkdirSync('test-results/full-ui', { recursive: true });
const harness = await auditHarness(report);
try {
  const session = await harness.session('Public', 'individual', true);
  try {
    await session.go('/support');
    const page = session.page;
    const topics = [];
    for (const label of ['Product use', 'Account access', 'Billing', 'Something else']) {
      await page.locator('.sf-topic').filter({ hasText: label }).click();
      topics.push({
        label,
        selected: await page.locator('input[name="topic"]:checked').inputValue(),
      });
    }
    await page.getByLabel('Full name', { exact: true }).fill('Audit Visitor');
    await page.getByLabel('Email address', { exact: true }).fill('audit@example.test');
    await page
      .getByLabel('How can we help?', { exact: true })
      .fill('Audit only: checking a clearly described product issue.');
    const before = session.requests.length;
    await page.getByRole('button', { name: 'Send message', exact: true }).click();
    await page.locator('.sf-alert').waitFor();
    report.cases.push({
      name: 'Support form proper visible-label interaction',
      topics,
      submission: session.requests.slice(before),
      message: await page.locator('.sf-alert').innerText(),
      outcome: 'visible-form-controls-work-real-delivery-unverified',
      supersedes:
        'Generic crawler timeouts on CSS-hidden radio inputs and honeypot are audit artifacts, not confirmed support defects.',
    });
  } finally {
    await session.context.close();
  }
  for (const cycle of ['One-time', 'Monthly']) {
    const session = await harness.session('Public', 'individual', true);
    try {
      const tools = catalogSummary().engines.map((tool) => ({
        id: tool.code.toLowerCase(),
        name: tool.engineName,
        home_engine: tool.homeEngine,
        max_authority: 'A1',
        human_gate: 'none',
        points_cost: tool.pointsCost,
      }));
      const billables = {
        pointsUnitPriceMinor: POINTS_UNIT_PRICE_MINOR,
        currency: 'USD',
        tools,
        learningPaths: [],
        deepReview: { name: 'Deep review', description: 'Recorded price', pointsCost: 100 },
      };
      await session.context.route('**/api/billables', (route) =>
        route.fulfill({ json: billables }),
      );
      await session.context.route('**/api/bundles', (route) => route.fulfill({ json: [] }));
      let checkout;
      await session.context.route('**/api/points/purchase', (route) => {
        checkout = route.request().postDataJSON();
        return route.fulfill({ status: 401, json: { error: 'Sign in to continue.' } });
      });
      await session.go('/pricing');
      const builder = session.page.locator('.pricing-bundle-builder');
      await builder.waitFor();
      const tool = tools.find((entry) => entry.home_engine === 'Finance') || tools[0];
      await builder.locator('label').filter({ hasText: tool.name }).locator('input').check();
      await builder.getByRole('button', { name: 'Increase extra points', exact: true }).click();
      await builder.getByRole('radio', { name: cycle, exact: true }).click();
      const total = await builder.locator('.pricing-bundle-total').innerText();
      await builder.getByRole('button', { name: 'Get this bundle', exact: true }).click();
      await session.page.waitForURL('**/signup');
      report.cases.push({
        name: 'Public custom engine bundle',
        cycle,
        selectedTool: tool,
        expectedPoints: tool.points_cost + 50,
        expectedPriceMinor: (tool.points_cost + 50) * POINTS_UNIT_PRICE_MINOR,
        total,
        checkout,
        destination: new URL(session.page.url()).pathname,
        pending: await session.page.evaluate(() =>
          JSON.parse(sessionStorage.getItem('lamid_pending_bundle')),
        ),
        outcome: 'checkout-captured-points-only-no-tool-ids-or-billing-cycle',
      });
    } finally {
      await session.context.close();
    }
  }
} finally {
  writeFileSync('test-results/full-ui/targeted-ui-rechecks.json', JSON.stringify(report, null, 2));
  await harness.close();
}
console.log(JSON.stringify(report, null, 2));
