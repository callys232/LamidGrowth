import assert from 'node:assert/strict';
import { expect } from '@playwright/test';
import { auditHarness, tiers } from './full-ui-harness.mjs';
const h = await auditHarness({});
try {
  for (const tier of tiers) {
    const s = await h.session('Founder', tier),
      p = s.page;
    p.setDefaultTimeout(10000);
    const saved = () => s.snapshots.get(`Founder:${tier}`)?.data;
    try {
      await s.go('/os/scoping/new');
      await p
        .getByPlaceholder('What outcome do you want?', { exact: true })
        .fill('Publish a complete sample scope');
      await p.getByRole('button', { name: 'Continue', exact: true }).click();
      await p.getByRole('button', { name: 'Suggest for me', exact: true }).click();
      await expect
        .poll(() => saved()?.scopes?.[0].deliverables)
        .toBe('A reviewed draft and final handover package.');
      await p.getByLabel('Category', { exact: true }).selectOption('Software engineering');
      await expect.poll(() => saved()?.scopes?.[0].category).toBe('Software engineering');
      await p.getByRole('button', { name: 'Continue to review', exact: true }).click();
      await p.getByLabel('Project title', { exact: true }).fill('Published scoped sample');
      await p.getByLabel('Engagement type', { exact: true }).selectOption('Fixed-scope project');
      await p.getByPlaceholder('Min', { exact: true }).fill('100');
      await p.getByPlaceholder('Max', { exact: true }).fill('200');
      await p.getByPlaceholder('e.g. 3 weeks', { exact: true }).fill('3 weeks');
      await p.getByRole('button', { name: 'Publish project', exact: true }).click();
      await expect.poll(() => saved()?.scopes?.[0].status).toBe('published');
      assert.ok(saved().jobs.some((j) => j.title === 'Published scoped sample'));
      await p.getByText('Demo progress saved', { exact: true }).waitFor();
      const client = saved().projects.find((project) => project.isClient);
      await s.go(`/os/commercial/projects/${client.id}`);
      await p.getByPlaceholder('Milestone title', { exact: true }).fill('Sample funding lifecycle');
      await p.getByPlaceholder('Amount', { exact: true }).fill('50');
      await p.getByRole('button', { name: 'Add milestone', exact: true }).click();
      const card = p
        .locator('li.activity-feed-row')
        .filter({ has: p.getByText('Sample funding lifecycle', { exact: true }) });
      await card.getByRole('button', { name: 'Fund milestone', exact: true }).click();
      const milestone = () =>
        saved()
          ?.projects.find((project) => project.id === client.id)
          ?.milestones.find((m) => m.title === 'Sample funding lifecycle');
      await expect.poll(() => saved()?.fundings[milestone()?.id]?.status).toBe('held');
      await expect(card.getByText('held', { exact: true })).toBeVisible();
      await p.getByPlaceholder('Write a message', { exact: true }).fill('A sample project message');
      await p.getByRole('button', { name: 'Send', exact: true }).click();
      await expect(p.getByText(/A sample project message/)).toBeVisible();
      assert.deepEqual(s.errors, []);
      assert.equal(s.popups.length, 0, 'Sample funding must not open a real checkout');
      console.log(
        `${tier}: scoping suggestions, category, publish, add milestone, sample funding and messaging passed`,
      );
    } finally {
      await s.context.close();
    }
  }
} finally {
  await h.close();
}
