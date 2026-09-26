import { test, expect } from '@playwright/test';

for (const theme of ['light', 'dark']) {
  for (const width of [320, 390, 768, 1024, 1440]) {
    test(`SIM and package catalogs at ${width}px in ${theme} mode`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.addInitScript((value) => localStorage.setItem('mfsl_admin_theme', value), theme);
      await page.goto('/sim-so-dep');
      const consent = page.getByRole('button', { name: 'Chỉ cookie cần thiết', exact: true });
      if (await consent.isVisible()) await consent.click();
      await expect(page.getByRole('link', { name: '0762468888', exact: true })).toBeVisible();
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      const row = page.locator('tbody tr').first();
      const button = row.getByRole('button', { name: 'Chọn số', exact: true });
      expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(44);
      if (theme === 'dark') {
        expect(await row.evaluate((element) => getComputedStyle(element).backgroundColor)).toBe(
          'rgb(30, 34, 44)',
        );
      }
      if (width === 390 || width === 1440)
        await page.screenshot({ path: `test-results/sims-${width}-${theme}.png`, fullPage: true });
      await page.goto('/goi-cuoc');
      await expect(
        page.getByRole('button', { name: 'ĐĂNG KÝ', exact: true }).first(),
      ).toBeVisible();
      await expect(page.getByRole('button', { name: /so sánh/i })).toHaveCount(0);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      if (width === 390)
        await page.screenshot({
          path: `test-results/packages-${width}-${theme}.png`,
          fullPage: true,
        });
    });
  }
}

test('SIM filters preserve search and selection continues to package registration', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/sim-so-dep');
  const consent = page.getByRole('button', { name: 'Chỉ cookie cần thiết', exact: true });
  if (await consent.isVisible()) await consent.click();
  await page.getByRole('textbox', { name: 'Tìm số thuê bao' }).fill('8888');
  await page.getByRole('button', { name: 'Tìm kiếm', exact: true }).click();
  await expect(page).toHaveURL(/q=8888/);
  await expect(page.locator('tbody tr')).toHaveCount(1);
  await page.getByRole('button', { name: 'Chọn số', exact: true }).click();
  await expect(page).toHaveURL(/goi-cuoc\?sim_id=1/);
});
