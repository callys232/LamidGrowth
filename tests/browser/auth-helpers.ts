import { expect, type Page } from '@playwright/test';

/** Exercise the real signup verification flow using the isolated server's development code. */
export async function verifySignup(page: Page) {
  await expect(page).toHaveURL(/\/verify\?/);
  const code = await page.getByTestId('development-otp').innerText();
  await page.getByLabel('Verification code', { exact: true }).fill(code);
  await page.getByRole('button', { name: 'Verify account', exact: true }).click();
  await page.getByRole('link', { name: 'Continue to workspace', exact: true }).click();
}
