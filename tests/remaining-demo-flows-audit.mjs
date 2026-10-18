import { writeFileSync } from 'node:fs';
import { auditHarness, profiles, tiers } from './full-ui-harness.mjs';
const report = {
  boundary:
    'Actual demo UI/sandbox with fake identity and cloud-save boundary. Explicit valid inputs for initially-disabled controls.',
  cases: [],
};
const save = () =>
  writeFileSync('lamiddoc/test-results/full-ui/remaining-demo-flows.json', JSON.stringify(report, null, 2));
const harness = await auditHarness(report);
try {
  for (const profile of profiles)
    for (const tier of tiers) {
      const session = await harness.session(profile, tier);
      try {
        for (const name of ['Guided scoping Continue', 'Create team']) {
          const row = { profile, tier, name, outcome: 'unconfirmed' };
          report.cases.push(row);
          try {
            await session.go(name === 'Create team' ? '/os/teams' : '/os/scoping/new');
            if (name === 'Create team') {
              await session.page
                .getByPlaceholder('Team name', { exact: true })
                .fill('Audit sample team');
              await session.page
                .getByPlaceholder('Description (optional)', { exact: true })
                .fill('A synthetic team for auditing this control.');
              await session.page.getByRole('button', { name: 'Create team', exact: true }).click();
            } else {
              await session.page
                .getByPlaceholder('What outcome do you want?', { exact: true })
                .fill('Deliver a documented customer onboarding plan');
              await session.page.getByRole('button', { name: 'Continue', exact: true }).click();
            }
            await session.page.waitForTimeout(100);
            row.alerts = (
              await session.page
                .locator('.form-error,[role="alert"],.activity-feed-error')
                .allTextContents()
            )
              .map((v) => v.trim())
              .filter(Boolean);
            row.outcome = row.alerts.length ? 'visible-error' : 'needs-business-outcome-review';
            row.text = (await session.page.locator('.workspace-main').innerText()).slice(-600);
          } catch (error) {
            row.outcome = 'unconfirmed-test-or-ui-failure';
            row.error = error.message;
          }
          save();
        }
      } finally {
        await session.context.close();
      }
    }
} finally {
  report.finished = new Date().toISOString();
  save();
  await harness.close();
}
console.log('Recorded scoped-project and team-creation controls for all demo combinations.');
