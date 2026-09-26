import { test, expect, Page } from '@playwright/test';

// Browser API fixtures only: this suite never writes to the business API.
const user = {
  id: 1,
  role: 'admin',
  full_name: 'Quản trị viên kiểm tra giao diện',
  username: 'ui-test',
};
const token = `ui.${Buffer.from(JSON.stringify({ role: 'admin', exp: 4102444800 })).toString('base64url')}.fixture`;
const long = 'Thông tin MobiFone Sơn La dành cho khách hàng tại các xã phường trên địa bàn';
const blocks = [
  {
    type: 'section',
    title: long,
    content: 'Nội dung giới thiệu chi nhánh.\n'.repeat(5),
    enabled: true,
  },
  { type: 'mission', title: 'Sứ mệnh', content: 'Đồng hành cùng khách hàng.', enabled: false },
];

async function prepare(page: Page, theme = 'light', empty = false) {
  await page.context().addCookies([
    {
      name: 'mfsl_token',
      value: token,
      url: process.env.E2E_BASE_URL ?? 'http://127.0.0.1:3002',
    },
  ]);
  await page.addInitScript(
    ({ token, user, theme }) => {
      localStorage.setItem('mfsl_auth_token', token);
      localStorage.setItem('mfsl_auth_user', JSON.stringify(user));
      localStorage.setItem('mfsl_admin_theme', theme);
      localStorage.setItem('mfsl_cookie_consent_v1', JSON.stringify({ value: 'necessary' }));
    },
    { token, user, theme },
  );
  await page.route('**/api/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    let data: unknown = [];
    if (path.endsWith('/auth/me')) data = user;
    else if (path.endsWith('/admin/settings'))
      data = [
        { key: 'about_blocks', value: JSON.stringify(empty ? [] : blocks), group: 'general' },
      ];
    else if (path.endsWith('/public/settings'))
      data = { ai_chatbot_enabled: 'false', hotline: '18001090' };
    else if (path.endsWith('/public/stores')) data = [{ id: 1, name: long }];
    else if (path.endsWith('/admin/utilities'))
      data = empty ? [] : [{ id: 1, name: long, status: 'active' }];
    else if (path.includes('/admin/') && path.includes('download'))
      data = empty
        ? []
        : [{ id: 1, title: long, category: 'Tài liệu hướng dẫn', download_count: 18 }];
    else if (path.endsWith('/admin/jobs/applications'))
      data = empty
        ? []
        : [{ id: 1, code: 'HS-2026-0001', full_name: long, status: 'new', job: { title: long } }];
    else if (path.endsWith('/admin/jobs'))
      data = empty ? [] : [{ id: 1, title: long, status: 'draft', deadline: '2026-12-31' }];
    else if (path.includes('current-duty')) data = null;
    await route.fulfill({ json: { success: true, data, message: '' } });
  });
}

const routes = [
  { path: '/admin/utilities', ready: 'Tên', name: 'utilities' },
  { path: '/admin/jobs', ready: 'Tiêu đề', name: 'jobs' },
  { path: '/admin/settings?section=footer', ready: 'Tiêu đề giới thiệu', name: 'settings' },
  { path: '/lien-he', ready: 'Họ tên', name: 'contact' },
];

for (const theme of ['light', 'dark']) {
  for (const width of [360, 390, 768, 1024, 1280, 1536]) {
    test(`${theme} ${width}px — responsive forms`, async ({ page }) => {
      test.setTimeout(180_000);
      await page.setViewportSize({ width, height: 900 });
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await prepare(page, theme);
      for (const route of routes) {
        await page.goto(route.path);
        await expect(page.getByRole('textbox', { name: route.ready, exact: true })).toBeVisible();
        if (route.name === 'settings')
          await expect(page.getByText('Khối 1', { exact: true })).toBeVisible();
        await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
        const metrics = await page.evaluate(() => ({
          page: document.documentElement.scrollWidth,
          viewport: innerWidth,
        }));
        expect(metrics.page, `${route.path}: page overflow`).toBeLessThanOrEqual(metrics.viewport);
        const bad = await page
          .locator(
            'main input:not([type=hidden]):not([type=checkbox]):not([tabindex="-1"]), main select, main textarea',
          )
          .evaluateAll((els) =>
            els
              .filter((el) => {
                const rect = el.getBoundingClientRect(),
                  style = getComputedStyle(el);
                return (
                  rect.width > 0 &&
                  (Math.round(rect.height) < 44 ||
                    parseFloat(style.fontSize) < 16 ||
                    rect.right > innerWidth + 1 ||
                    rect.left < -1)
                );
              })
              .map((el) => el.outerHTML.slice(0, 160)),
          );
        expect(bad).toEqual([]);
        await page.screenshot({
          path: `ui-artifacts/${route.name}-${theme}-${width}.png`,
          fullPage: true,
          animations: 'disabled',
        });
      }
    });
  }
}

test('drawer, keyboard, blocks and consent interactions', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await prepare(page);
  await page.goto('/admin/settings?section=footer');
  await expect(page.getByText('Khối 1', { exact: true })).toBeVisible();
  const menu = page.getByRole('button', { name: 'Mở menu', exact: true });
  await menu.click();
  await expect(page.locator('#admin-navigation')).toBeVisible();
  await page.keyboard.press('Tab');
  expect(
    await page.locator('#admin-navigation').evaluate((el) => el.contains(document.activeElement)),
  ).toBeTruthy();
  await page.keyboard.press('Escape');
  await expect(menu).toBeFocused();
  await expect(page.locator('#admin-navigation')).toBeHidden();
  await menu.click();
  await page.locator('#admin-navigation').getByRole('link', { name: 'Thông tin website' }).click();
  await expect(page.locator('#admin-navigation')).toBeHidden();
  await page.goto('/admin/settings?section=footer');
  await expect(page.getByRole('button', { name: 'Đưa khối 1 lên' })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Đưa khối 2 xuống' })).toBeDisabled();
  const type = page.getByLabel('Loại khối', { exact: true }).first();
  await type.fill('custom');
  await expect(type).toBeFocused();
  await page.getByRole('button', { name: 'Đưa khối 1 xuống' }).click();
  await expect(page.getByLabel('Loại khối', { exact: true }).last()).toHaveValue('custom');
  page.once('dialog', (dialog) => dialog.dismiss());
  await page.getByRole('button', { name: 'Xóa khối 1', exact: true }).click();
  await expect(page.getByLabel('Loại khối', { exact: true })).toHaveCount(2);
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Xóa khối 1', exact: true }).click();
  await expect(page.getByLabel('Loại khối', { exact: true })).toHaveCount(1);
  await page.goto('/lien-he');
  await expect(page.getByRole('button', { name: 'Gửi liên hệ' })).toBeDisabled();
  await page
    .getByLabel('Tôi đồng ý cho MobiFone Sơn La xử lý dữ liệu để phản hồi yêu cầu.')
    .check();
  await expect(page.getByRole('button', { name: 'Gửi liên hệ' })).toBeEnabled();
  await page.getByLabel('Chủ đề').focus();
  expect(await page.getByLabel('Chủ đề').evaluate((el) => getComputedStyle(el).boxShadow)).not.toBe(
    'none',
  );
  await page.getByRole('button', { name: 'Mở menu', exact: true }).click();
  await expect(
    page.locator('#public-mobile-menu').getByRole('link', { name: 'Liên hệ & Hỗ trợ' }),
  ).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('#public-mobile-menu')).toHaveCount(0);
});

test('empty states', async ({ page }) => {
  await prepare(page, 'light', true);
  await page.goto('/admin/jobs');
  await expect(page.getByText('Chưa có vị trí nào')).toBeVisible();
  await expect(page.getByText('Chưa có hồ sơ ứng tuyển')).toBeVisible();
  await page.goto('/admin/utilities');
  await expect(page.getByText('Chưa có tiện ích nào')).toBeVisible();
  await page.goto('/admin/settings?section=footer');
  await expect(page.getByText('Chưa có khối nội dung nào')).toBeVisible();
});

test('save feedback and keyboard field order preserve the utility payload', async ({ page }) => {
  await prepare(page);
  let releaseSave!: () => void;
  const gate = new Promise<void>((resolve) => {
    releaseSave = resolve;
  });
  await page.route('**/admin/utilities', async (route) => {
    if (route.request().method() !== 'POST') return route.fallback();
    await gate;
    await route.fulfill({ json: { success: true, data: { id: 2 }, message: '' } });
  });
  await page.goto('/admin/utilities');
  const name = page.getByRole('textbox', { name: 'Tên', exact: true });
  await name.fill('Tiện ích Sơn La');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('textbox', { name: 'Slug', exact: true })).toBeFocused();
  const request = page.waitForRequest(
    (req) => req.url().endsWith('/admin/utilities') && req.method() === 'POST',
  );
  await page.getByRole('button', { name: 'Lưu tiện ích', exact: true }).click();
  expect((await request).postDataJSON()).toMatchObject({
    name: 'Tiện ích Sơn La',
    slug: 'tien-ich-son-la',
    status: 'active',
    cta_type: 'website',
  });
  await expect(page.getByRole('button', { name: 'Lưu tiện ích', exact: true })).toBeDisabled();
  releaseSave();
  await expect(page.getByText('Đã lưu tiện ích', { exact: true })).toBeVisible();
  await expect(name).toHaveValue('');
});

test('query error remains readable', async ({ page }) => {
  await prepare(page, 'dark');
  await page.route('**/api/**/admin/jobs', (route) =>
    route.fulfill({
      status: 500,
      json: { success: false, message: 'Không tải được danh sách vị trí.', data: null },
    }),
  );
  await page.goto('/admin/jobs');
  await expect(
    page.getByRole('alert').filter({ hasText: 'Không tải được danh sách vị trí.' }),
  ).toBeVisible({ timeout: 20_000 });
});
