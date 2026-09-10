import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('homepage puts its main actions above the fold and the product page preview supports keyboard use', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  const primary = page
    .locator('.home-premium-hero .canonical-ctas')
    .getByRole('link', { name: 'Experience LAMID ONE', exact: true });
  const bounds = (await primary.boundingBox())!;
  expect(bounds.y + bounds.height).toBeLessThan(900);
  await expect(primary).toHaveAttribute('href', '/start');
  await expect(page.getByRole('tab', { name: 'Clarity', exact: true })).toHaveCount(0);
  for (const link of await page.locator('.home-section-nav a').all()) {
    const target = await link.getAttribute('href');
    await expect(page.locator(target!)).toHaveCount(1);
  }
  await expect(page.locator('.home-objective-card')).toHaveCount(3);
  await page.goto('/product');
  const clarity = page.getByRole('tab', { name: 'Clarity', exact: true });
  await clarity.focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('tab', { name: 'Capability', exact: true })).toBeFocused();
  await expect(page.getByRole('tabpanel')).toContainText('Know What the Next Step Requires.');
  await page.keyboard.press('End');
  await expect(page.getByRole('tab', { name: 'Consistency', exact: true })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await expect(page.getByRole('tabpanel')).toContainText(
    'Turn Good Decisions Into Reliable Progress.',
  );
  await page.keyboard.press('Home');
  await expect(clarity).toHaveAttribute('aria-selected', 'true');
  for (const link of await page.locator('.home-section-nav a').all()) {
    const target = await link.getAttribute('href');
    await expect(page.locator(target!)).toHaveCount(1);
  }
  await page.evaluate(() =>
    Promise.all(
      document
        .getAnimations()
        .filter((animation) => animation.effect?.getTiming().iterations !== Infinity)
        .map((animation) => animation.finished.catch(() => {})),
    ),
  );
  const scan = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  expect(scan.violations.map((v) => ({ id: v.id, targets: v.nodes.map((n) => n.target) }))).toEqual(
    [],
  );
});

test('homepage and product page fit narrow screens and the preview remains usable', async ({
  page,
}) => {
  for (const width of [320, 390, 768]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/');
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      width,
    );
    await page.goto('/product');
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      width,
    );
    await page.getByRole('tab', { name: 'Consistency', exact: true }).click();
    await expect(page.getByRole('tabpanel')).toContainText(
      'Turn Good Decisions Into Reliable Progress.',
    );
    await expect(
      page.getByRole('button', { name: 'Explore the workspace', exact: true }),
    ).toBeVisible();
  }
});

test('homepage explains its cycle and changes relevant depth by audience', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('link', { name: 'Clarity Think clearly.' })).toHaveAttribute(
    'href',
    '/how-it-works/clarity',
  );
  const selector = page.getByRole('group', { name: 'Choose an audience context' });
  await selector.getByRole('button', { name: 'Enterprise', exact: true }).click();
  const example = page.locator('#home-context-example');
  await expect(example).toContainText('Governance');
  await expect(example).toContainText('Are teams aligned for the next launch?');
  await expect(example).not.toContainText('Companion');
  await selector.getByRole('button', { name: 'Personal', exact: true }).click();
  await expect(example).toContainText('Companion');
  await expect(example).toContainText('Is this role the right next move?');
  await selector.getByRole('button', { name: 'Founder', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(example).toContainText('Can we afford the next hire?');
  await selector.getByRole('button', { name: 'Team', exact: true }).click();
  await expect(example).toContainText('What should we prioritize this week?');
  await expect(example).not.toContainText('Governance');
  await expect(page.locator('.home-expansion-path li')).toHaveCount(5);
  await expect(page.getByRole('heading', { name: 'A project deadline changes.' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Explore the product workspace' })).toHaveAttribute(
    'href',
    '/product',
  );
  await page.evaluate(() =>
    Promise.all(
      document
        .getAnimations()
        .filter((animation) => animation.effect?.getTiming().iterations !== Infinity)
        .map((animation) => animation.finished.catch(() => {})),
    ),
  );
  const scan = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  expect(scan.violations.map((v) => ({ id: v.id, targets: v.nodes.map((n) => n.target) }))).toEqual(
    [],
  );
  await page.screenshot({ path: 'artifacts/homepage-content-improvements.png', fullPage: true });
});

test('outcome choices change content without moving the viewport or panel', async ({ page }) => {
  for (const width of [1280, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    const choices = page.getByRole('group', { name: 'Choose an outcome' });
    await choices.scrollIntoViewIfNeeded();
    const panel = page.locator('#home-outcome-display');
    const before = await panel.boundingBox();
    const scroll = await page.evaluate(() => window.scrollY);
    await choices.getByRole('button', { name: /Strengthen organizational alignment/ }).click();
    await expect(
      panel.getByRole('heading', { name: 'Strengthen organizational alignment' }),
    ).toBeVisible();
    await expect(
      panel.getByRole('img', { name: 'Connect teams and responsibilities to a shared priority.' }),
    ).toHaveCount(1);
    expect((await panel.boundingBox())!.height).toBe(before!.height);
    expect(await page.evaluate(() => window.scrollY)).toBe(scroll);
    await choices.getByRole('button', { name: /Choose your next professional move/ }).click();
    await expect(
      panel.getByRole('heading', { name: 'Choose your next professional move' }),
    ).toBeVisible();
  }
});

test('supporting homepage details expand and collapse with keyboard access', async ({ page }) => {
  await page.goto('/');
  for (const label of [
    'Explore the three ways progress continues',
    'Explore the intelligence cycle',
    'How your workspace grows with you',
    'This Week',
  ]) {
    const summary = page.locator('summary').filter({ hasText: label });
    const disclosure = summary.locator('..');
    await expect(disclosure).not.toHaveAttribute('open', '');
    await summary.focus();
    await page.keyboard.press('Enter');
    await expect(disclosure).toHaveAttribute('open', '');
    await page.keyboard.press('Enter');
    await expect(disclosure).not.toHaveAttribute('open', '');
  }
});
