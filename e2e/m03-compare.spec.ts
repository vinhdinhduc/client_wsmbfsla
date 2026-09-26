import { test, expect } from '@playwright/test';

test('Package catalog offers registration without comparison controls', async ({ page }) => {
  await page.goto('/goi-cuoc');
  await expect(page.getByRole('button', { name: 'ĐĂNG KÝ', exact: true }).first()).toBeVisible();
  await expect(page.getByRole('button', { name: /so sánh/i })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: /so sánh/i })).toHaveCount(0);
});
