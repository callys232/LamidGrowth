import { test, expect } from '@playwright/test';

test('workspace job posting charges once and knowledge can be edited and deleted', async ({
  page,
}) => {
  await page.goto('/start');
  await page.getByRole('button', { name: 'Founder', exact: true }).click();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByLabel('Your name').fill('Commercial Knowledge Tester');
  await page.getByLabel('Email address').fill(`commercial-knowledge-${Date.now()}@example.test`);
  await page.getByLabel('Password', { exact: true }).fill('secure-commercial-knowledge-password');
  await page.getByRole('button', { name: 'Create your workspace', exact: true }).click();
  await expect(page).toHaveURL('/os');
  await page.getByRole('link', { name: 'Commercial', exact: true }).click();
  await page.getByRole('button', { name: 'Post a job', exact: true }).click();
  await page.getByLabel('Job title', { exact: true }).fill('Evaluate the service offer');
  await page
    .getByLabel('Project description')
    .fill('Evaluate the scope and document a clear service offer.');
  await page.getByLabel('Deliverables', { exact: true }).fill('A written service brief');
  await page.getByLabel('Minimum budget').fill('50');
  await page.getByLabel('Maximum budget').fill('100');
  await page.getByLabel('Timeline', { exact: true }).fill('One week');
  await page.getByRole('button', { name: 'Post job · 10 points' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByText(/90 development points available/)).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Evaluate the service offer' })).toBeVisible();
  await page.getByRole('link', { name: 'Knowledge', exact: true }).click();
  await page.getByRole('button', { name: 'Add knowledge' }).click();
  await page.getByLabel('Knowledge title').fill('Service research');
  await page
    .getByLabel('Knowledge content')
    .fill('Interview evidence and human review requirements.');
  await page.getByRole('button', { name: 'Save knowledge' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByLabel('Search knowledge').fill('human');
  await page.getByRole('button', { name: 'Read and edit' }).click();
  await page.getByLabel('Knowledge content').fill('Updated human review requirements.');
  await page.getByRole('button', { name: 'Save knowledge' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByText(/Version 2/)).toBeVisible();
  await page.getByRole('button', { name: 'Read and edit' }).click();
  await page.getByRole('button', { name: 'Delete knowledge', exact: true }).click();
  await page.getByRole('button', { name: 'Confirm deletion' }).click();
  await expect(page.getByRole('heading', { name: 'No matching knowledge' })).toBeVisible();
});
