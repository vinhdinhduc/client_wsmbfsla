import { test, expect } from '@playwright/test';

test('AC-05.4: solution plan registration adds the plan to cart', async ({ page }) => {
  await page.goto('/giai-phap-so/chu-ky-so-mobifone-ca');
  const register = page.getByRole('table').getByRole('button', { name: 'Đăng ký' }).first();
  await expect(register).toBeVisible();
  await register.click();
  await expect.poll(async () => page.evaluate(() => {
    const items = JSON.parse(localStorage.getItem('mfsl_cart_items') || '[]');
    return items.some((item: { type: string; reference_id: number }) => item.type === 'solution_plan' && item.reference_id > 0);
  })).toBe(true);
});
