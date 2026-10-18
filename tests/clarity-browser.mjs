import assert from 'node:assert/strict';
import { expect } from '@playwright/test';
import { auditHarness } from './full-ui-harness.mjs';
const h = await auditHarness({});
try {
  const s = await h.session('Founder', 'team');
  s.page.setDefaultTimeout(10000);
  const p = s.page;
  await s.go('/os');
  await expect(
    p.getByRole('heading', {
      name: 'Diagnose one bottleneck. Make a plan you can follow.',
      exact: true,
    }),
  ).toBeVisible();
  const remote = s.snapshots.get('Founder:team'),
    original = structuredClone(remote.data),
    objective = original.state.objectives[0];
  async function state(actions, objectives = [objective]) {
    remote.data = {
      ...structuredClone(original),
      state: { ...structuredClone(original.state), objectives, actions },
    };
    await s.go('/os');
  }
  await state([], []);
  await expect(
    p.getByRole('button', { name: 'Set my first objective', exact: true }),
  ).toBeVisible();
  await state([]);
  await p.getByRole('button', { name: 'Create the first action', exact: true }).click();
  await expect(p.getByRole('dialog')).toBeVisible();
  await p.keyboard.press('Escape');
  const action = {
    id: 'clarity-action',
    objectiveId: objective.id,
    title: 'Check the evidence',
    status: 'Planned',
    dueDate: '',
    owner: 'Me',
    requiresApproval: false,
    notes: '',
    version: 1,
    createdAt: new Date().toISOString(),
  };
  await state([action]);
  await expect(
    p.getByRole('link', { name: 'Work on the next action', exact: true }),
  ).toHaveAttribute('href', '/os/today');
  await state([{ ...action, status: 'Needs review' }]);
  await expect(p.getByRole('link', { name: 'Review submitted work', exact: true })).toHaveAttribute(
    'href',
    '/os/consistency',
  );
  await state([{ ...action, status: 'Done' }]);
  await expect(p.getByRole('link', { name: 'Review what changed', exact: true })).toHaveAttribute(
    'href',
    '/os/rhythm',
  );
  await s.go('/os/pricing');
  await expect(
    p.getByRole('heading', { name: 'Understand access and usage before you pay', exact: true }),
  ).toBeVisible();
  await s.go('/os/engines?engine=F01');
  const form = p
    .locator('form')
    .filter({ has: p.getByRole('button', { name: 'Run diagnostic', exact: true }) });
  for (const input of await form.locator('input[type="number"]').all()) await input.fill('5');
  await form.getByRole('button', { name: 'Run diagnostic', exact: true }).click();
  await expect(
    p.getByRole('heading', { name: 'Use the result to choose your next action', exact: true }),
  ).toBeVisible();
  await p.getByText('Review the submitted inputs', { exact: true }).click();
  const inputSnapshot = JSON.parse(
    await p
      .locator('details')
      .filter({ has: p.getByText('Review the submitted inputs', { exact: true }) })
      .locator('pre')
      .innerText(),
  );
  assert.ok(Object.keys(inputSnapshot).length);
  assert.deepEqual(s.errors, []);
  await s.context.close();
  const pub = await h.session('Founder', 'team', true, true);
  await pub.go('/pricing');
  await expect(
    pub.page.getByRole('heading', {
      name: 'Understand access and usage before you pay',
      exact: true,
    }),
  ).toBeVisible();
  assert.equal(
    await pub.page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 2),
    false,
  );
  await pub.context.close();
  console.log(
    'Saved-state journey, action CTA, pricing access/usage explanation, mobile layout and submitted assessment inputs passed.',
  );
} finally {
  await h.close();
}
