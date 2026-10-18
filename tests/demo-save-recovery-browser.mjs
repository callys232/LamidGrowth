import assert from 'node:assert/strict';
import { expect } from '@playwright/test';
import { auditHarness, tiers } from './full-ui-harness.mjs';
const h = await auditHarness({});
try {
  for (const tier of tiers) {
    const s = await h.session('Founder', tier),
      p = s.page;
    p.setDefaultTimeout(10000);
    try {
      await s.go('/os/teams');
      await p.getByPlaceholder('Team name', { exact: true }).fill('Committed sample team');
      await p.getByRole('button', { name: 'Create team', exact: true }).click();
      await expect(p.getByText('Committed sample team', { exact: true })).toBeVisible();
      await expect(p.getByText('Demo progress saved', { exact: true })).toBeVisible();
      await p.evaluate(() => {
        const key = Object.keys(sessionStorage).find(
          (k) => k.startsWith('lamid-sandbox-v1:') && k.endsWith(':sync'),
        );
        const meta = JSON.parse(sessionStorage.getItem(key));
        sessionStorage.setItem(
          key,
          JSON.stringify({ revision: Math.max(0, meta.revision - 1), dirty: true }),
        );
      });
      await s.go('/os/teams');
      await p.getByPlaceholder('Team name', { exact: true }).fill('After acknowledgement recovery');
      await p.getByRole('button', { name: 'Create team', exact: true }).click();
      await expect(p.getByText('After acknowledgement recovery', { exact: true })).toBeVisible();
      await expect(p.getByText('Demo progress saved', { exact: true })).toBeVisible();
      const before = s.snapshots.get(`Founder:${tier}`).revision;
      await p.evaluate(() => {
        const key = Object.keys(sessionStorage).find(
          (k) => k.startsWith('lamid-sandbox-v1:') && k.endsWith(':sync'),
        );
        const meta = JSON.parse(sessionStorage.getItem(key));
        const base = key.slice(0, -5),
          data = JSON.parse(sessionStorage.getItem(base));
        data.state.user.name = 'Local unsaved conflicting edit';
        sessionStorage.setItem(base, JSON.stringify(data));
        sessionStorage.setItem(
          key,
          JSON.stringify({ revision: Math.max(0, meta.revision - 1), dirty: true }),
        );
      });
      await s.go('/os/teams');
      await p
        .getByPlaceholder('Team name', { exact: true })
        .fill('Must not overwrite remote changes');
      await p.getByRole('button', { name: 'Create team', exact: true }).click();
      await expect(
        p.getByText('Reload to load the latest demo progress before making changes.', {
          exact: true,
        }),
      ).toBeVisible();
      assert.equal(s.snapshots.get(`Founder:${tier}`).revision, before);
      console.log(
        `${tier}: lost acknowledgement recovers; different unsaved content remains blocked`,
      );
    } finally {
      await s.context.close();
    }
  }
} finally {
  await h.close();
}
