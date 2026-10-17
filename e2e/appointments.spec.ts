import { expect, test } from '@playwright/test';

function dateInVietnam(daysFromToday = 0) {
  const current = new Date();
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(current);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  const date = new Date(`${values.year}-${values.month}-${values.day}T12:00:00+07:00`);
  date.setDate(date.getDate() + daysFromToday);
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function appointment(id: number, overrides: Record<string, unknown> = {}) {
  return {
    id,
    customer_name: `Khách ${id}`,
    phone: `0912345${String(id).padStart(3, '0')}`,
    email: `khach${id}@example.test`,
    store_id: 7,
    appointment_date: dateInVietnam(1),
    appointment_time: '08:30:00',
    note: null,
    status: 'moi',
    assigned_to: null,
    created_at: new Date().toISOString(),
    store: { id: 7, name: 'Cửa hàng Sơn La', address: '96 Đường 3/2', district: 'Sơn La' },
    assignee: null,
    ...overrides,
  };
}

test.beforeEach(async ({ page, context }) => {
  const token = `test.${Buffer.from(JSON.stringify({ role: 'admin', exp: 4102444800 })).toString('base64url')}.test`;
  await context.addCookies([
    { name: 'mfsl_token', value: token, url: test.info().project.use.baseURL! },
  ]);
  await page.addInitScript((authToken) => {
    localStorage.setItem('mfsl_auth_token', authToken);
    localStorage.setItem(
      'mfsl_auth_user',
      JSON.stringify({ id: 1, role: 'admin', full_name: 'Admin' }),
    );
  }, token);
  await page.route('**/auth/me', (route) =>
    route.fulfill({
      json: { success: true, data: { id: 1, role: 'admin', full_name: 'Admin' } },
    }),
  );
  await page.route('**/api/**/admin/stores', (route) =>
    route.fulfill({
      json: {
        success: true,
        data: [{ id: 7, name: 'Cửa hàng Sơn La', address: '96 Đường 3/2', status: 'active' }],
      },
    }),
  );
  await page.route('**/api/**/admin/shifts', (route) =>
    route.fulfill({ json: { success: true, data: [] } }),
  );
});

test('lists 100+ appointments as mobile cards at 375px', async ({ page }) => {
  const appointments = Array.from({ length: 101 }, (_, index) => appointment(index + 1));
  await page.route('**/api/**/admin/appointments**', (route) =>
    route.fulfill({ json: { success: true, data: appointments } }),
  );
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/admin/appointments');

  await expect(page.getByText('101 lịch hẹn')).toBeVisible();
  await expect(page.getByRole('button', { name: /^Mở lịch hẹn của/ })).toHaveCount(10);
  await expect(page.locator('table')).toBeHidden();
  await expect(page.getByLabel('Số dòng')).toHaveValue('10');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
});

test('shows today and overdue indicators and handles a customer without email', async ({
  page,
}) => {
  const overdue = appointment(1, {
    customer_name: 'Khách Không Email',
    email: null,
    appointment_date: dateInVietnam(),
    appointment_time: '00:01:00',
  });
  await page.route('**/api/**/admin/appointments**', async (route) => {
    if (route.request().method() === 'PATCH') {
      const changes = route.request().postDataJSON();
      return route.fulfill({
        json: { success: true, data: { ...overdue, ...changes }, message: 'Đã lưu' },
      });
    }
    return route.fulfill({ json: { success: true, data: [overdue] } });
  });
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/admin/appointments');
  await page.getByLabel('Ngày').selectOption('today');
  await expect(page.getByRole('button', { name: /^Mở lịch hẹn của/ }).getByText('Quá hạn')).toBeVisible();

  await page.getByRole('button', { name: /^Mở lịch hẹn của/ }).click();
  const dialog = page.getByRole('dialog', { name: 'Chi tiết lịch hẹn' });
  await expect(dialog.getByText('Khách không để lại email.')).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Gửi lại email xác nhận' })).toBeHidden();
  await dialog.getByRole('button', { name: 'Đã xác nhận' }).click();
  await expect(dialog.getByRole('button', { name: 'Lưu' })).toBeEnabled();
  await dialog.getByRole('button', { name: 'Lưu' }).click();
  await expect(page.getByText('Đã lưu thay đổi lịch hẹn')).toBeVisible();
});

test('shows a helpful empty state', async ({ page }) => {
  await page.route('**/api/**/admin/appointments**', (route) =>
    route.fulfill({ json: { success: true, data: [] } }),
  );
  await page.goto('/admin/appointments');
  await expect(page.getByRole('heading', { name: 'Chưa có lịch hẹn' })).toBeVisible();
});


