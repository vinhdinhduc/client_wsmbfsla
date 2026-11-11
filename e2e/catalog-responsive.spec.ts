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

test('SIM filters preserve search and selection continues to checkout', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/sim-so-dep');
  const consent = page.getByRole('button', { name: 'Chỉ cookie cần thiết', exact: true });
  if (await consent.isVisible()) await consent.click();
  await page.getByRole('textbox', { name: 'Tìm số thuê bao' }).fill('8888');
  await page.getByRole('button', { name: 'Tìm kiếm', exact: true }).click();
  await expect(page).toHaveURL(/q=8888/);
  await expect(page.locator('tbody tr')).toHaveCount(1);
  await page.getByRole('button', { name: 'Chọn số', exact: true }).click();
  const packageDialog = page.getByRole('dialog', { name: 'Chọn gói cước' });
  await expect(packageDialog).toBeVisible();
  await packageDialog.getByRole('button', { name: 'Bỏ qua — chỉ mua SIM' }).click();
  await expect(page).toHaveURL(/dat-hang\?step=customer/);
});

test('SIM pagination keeps the URL state, continuous row numbers and browser history', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/sim-so-dep?page=2&pageSize=10&type=postpaid&tab=all');
  await expect(page.getByText('Hiển thị 11–20 / 28 số')).toBeVisible();
  await expect(page.locator('tbody tr').first().locator('td').first()).toHaveText('11');
  await expect(page.getByRole('navigation', { name: 'Phân trang' })).toBeVisible();
  await page.getByRole('button', { name: 'Trang sau' }).click();
  await expect(page).toHaveURL(/page=3/);
  await expect(page.getByText('Hiển thị 21–28 / 28 số')).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL(/page=2/);
  await expect(page.locator('tbody tr').first().locator('td').first()).toHaveText('11');
  await page.goto('/sim-so-dep?page=99&pageSize=10&type=postpaid&tab=all');
  await expect(page).toHaveURL(/page=3/);
  await expect(page.getByText('Hiển thị 21–28 / 28 số')).toBeVisible();
  await page.getByLabel('Số số hiển thị mỗi trang').selectOption('50');
  await expect(page).toHaveURL(/page=1.*pageSize=50/);
  await page.getByRole('textbox', { name: 'Tìm số thuê bao' }).fill('8888');
  await page.getByRole('button', { name: 'Tìm kiếm', exact: true }).click();
  await expect(page).toHaveURL(/page=1.*q=8888/);
  await expect(page.getByText('Hiển thị 1–1 / 1 số')).toBeVisible();
});

test('package registration syntax copies the message only and opens a prepared SMS on mobile', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/goi-cuoc');
  const copyButton = page.getByRole('button', { name: 'Sao chép cú pháp DK MXH100' }).first();
  await expect(copyButton).toBeVisible();
  await copyButton.click();
  await expect(page.getByText('Đã sao chép', { exact: true }).first()).toBeVisible();
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe('DK MXH100');
  await expect(
    page.getByRole('link', { name: 'Cú pháp đăng ký DK MXH100 gửi 9199' }).first(),
  ).toHaveAttribute('href', 'sms:9199?body=DK%20MXH100');
});
