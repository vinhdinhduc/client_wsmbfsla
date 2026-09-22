import { test, expect } from '@playwright/test';

test('AC-03.3: compare at most three packages', async ({ page }) => {
  await page.goto('/goi-cuoc');
  await expect(page.getByRole('button', { name: 'So sánh', exact: true }).first()).toBeVisible();
  for (let index = 0; index < 4; index += 1) await page.getByRole('button', { name: 'So sánh', exact: true }).first().click();
  await expect(page.getByText('Chỉ có thể so sánh tối đa 3 gói.')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'So sánh gói cước (3/3)' })).toBeVisible();
});
