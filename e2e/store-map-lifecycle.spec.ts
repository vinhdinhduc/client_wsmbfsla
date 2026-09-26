import { test, expect } from '@playwright/test';

test('store map survives selection, filtering, navigation and remounts', async ({ page }) => {
  test.skip(process.env.E2E_UI_FIXTURES !== '1', 'Requires the isolated UI fixture server');
  test.setTimeout(180_000);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.addInitScript(() =>
    localStorage.setItem('mfsl_cookie_consent_v1', JSON.stringify({ value: 'necessary' })),
  );
  await page.goto('/cua-hang');
  const map = page.getByRole('region', { name: 'Bản đồ cửa hàng MobiFone Sơn La' });
  await expect(map).toBeVisible();
  await expect(map.locator('.leaflet-control-zoom')).toHaveCount(1);
  const markers = map.locator('.store-map-marker');
  await expect(markers).toHaveCount(2);
  await page.getByRole('button', { name: 'Xem trên bản đồ' }).last().click();
  await markers.last().click();
  await expect(map.locator('.leaflet-popup-content')).toContainText('Cửa hàng kiểm tra 2');
  await page.getByLabel('Lọc cửa hàng theo xã/phường').selectOption('ward-1');
  await expect(markers).toHaveCount(1);
  await page.getByLabel('Lọc cửa hàng theo xã/phường').selectOption('all');
  await expect(markers).toHaveCount(2);
  for (let pass = 0; pass < 3; pass++) {
    await page.getByRole('link', { name: 'Đặt lịch đến cửa hàng' }).first().click();
    await expect(map).toHaveCount(0);
    await page.goBack();
    await expect(map).toBeVisible();
    await expect(map.locator('.leaflet-control-zoom')).toHaveCount(1);
    await expect(markers).toHaveCount(2);
  }
  await page.reload();
  await expect(map).toBeVisible();
  await expect(markers).toHaveCount(2);
  expect(errors).toEqual([]);
  await page.screenshot({ path: 'ui-artifacts/stores-map.png', fullPage: true });
});
