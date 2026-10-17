import { expect, test } from '@playwright/test';
const makeContact = (id: number) => ({
  id,
  name: `Khách ${id}`,
  phone: '0900000000',
  email: 'fixture@example.test',
  message: `Nội dung ${id}`,
  status: 'moi',
  assigned_to: null,
  internal_note: null,
  created_at: new Date(Date.now() - id * 3600000).toISOString(),
});
test.beforeEach(async ({ page, context }) => {
  const token = `test.${Buffer.from(JSON.stringify({ role: 'admin', exp: 4102444800 })).toString('base64url')}.test`;
  await context.addCookies([
    { name: 'mfsl_token', value: token, url: test.info().project.use.baseURL! },
  ]);
  await page.addInitScript((t) => {
    localStorage.setItem('mfsl_auth_token', t);
    localStorage.setItem(
      'mfsl_auth_user',
      JSON.stringify({ id: 1, role: 'admin', full_name: 'Admin' }),
    );
  }, token);
  await page.route('**/auth/me', (r) =>
    r.fulfill({ json: { success: true, data: { id: 1, role: 'admin', full_name: 'Admin' } } }),
  );
  await page.route('**/admin/users', (r) =>
    r.fulfill({
      json: { success: true, data: [{ id: 1, full_name: 'Nhân viên A', status: 'active' }] },
    }),
  );
  await page.route('**/admin/audit-logs*', (r) =>
    r.fulfill({ json: { success: true, data: { items: [], total: 0 } } }),
  );
});
test('100+ records: global search, pagination, mobile cards and empty filters', async ({
  page,
}) => {
  const contacts = Array.from({ length: 121 }, (_, i) => makeContact(i + 1));
  await page.route('**/api/**/admin/contacts?*', (r) => {
    const p = Number(new URL(r.request().url()).searchParams.get('page'));
    return r.fulfill({
      json: {
        success: true,
        data: { items: contacts.slice((p - 1) * 100, p * 100), total: contacts.length },
      },
    });
  });
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/admin/contacts');
  await expect(page.getByText('121 liên hệ', { exact: true })).toBeVisible();
  await expect(page.locator('article')).toHaveCount(10);
  await page.getByLabel('Số dòng').selectOption('50');
  await expect(page.locator('article')).toHaveCount(50);
  await page.getByLabel('Tìm kiếm').fill('Nội dung 121');
  await expect(page.locator('article')).toHaveCount(1);
  await expect(page.locator('article')).toContainText('Quá hạn');
  await page.getByLabel('Tìm kiếm').fill('không tìm thấy');
  await expect(page.getByText('Chưa có liên hệ phù hợp')).toBeVisible();
  await page.getByRole('button', { name: 'Xóa bộ lọc' }).click();
  await expect(page.locator('article')).toHaveCount(50);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
});
test('safe full content, missing email, dirty close, save and keyboard focus', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  let contact = {
    ...makeContact(1),
    email: '',
    message: '<script>window.injected = true</script>\n' + 'Nội dung rất dài '.repeat(300),
  };
  await page.route('**/api/**/admin/contacts**', async (r) => {
    if (r.request().method() === 'PATCH') {
      contact = { ...contact, ...r.request().postDataJSON() };
      return r.fulfill({ json: { success: true, data: contact } });
    }
    return r.fulfill({ json: { success: true, data: { items: [contact], total: 1 } } });
  });
  await page.goto('/admin/contacts');
  const row = page.locator('tbody tr');
  await row.click();
  const modal = page.getByRole('dialog');
  await expect(modal.getByText(contact.message, { exact: true })).toBeVisible();
  await modal.getByRole('button', { name: 'Đóng', exact: true }).first().focus();
  await page.keyboard.press('Shift+Tab');
  expect(await modal.evaluate((element) => element.contains(document.activeElement))).toBe(true);
  expect(await page.evaluate(() => 'injected' in window)).toBe(false);
  await expect(
    modal.getByText('Khách chưa có email. Vui lòng liên hệ qua điện thoại.'),
  ).toBeVisible();
  await expect(modal.getByRole('button', { name: 'Lưu', exact: true })).toBeDisabled();
  await modal.getByLabel('Ghi chú nội bộ').fill('Đã gọi khách');
  page.once('dialog', (d) => d.dismiss());
  await page.keyboard.press('Escape');
  await expect(modal).toBeVisible();
  await modal.getByLabel('Người phụ trách').selectOption('1');
  await modal.getByRole('button', { name: 'Đã phản hồi', exact: true }).click();
  await modal.getByRole('button', { name: 'Lưu', exact: true }).click();
  await expect(modal.getByRole('button', { name: 'Lưu', exact: true })).toBeDisabled();
  expect(contact).toMatchObject({
    status: 'da_phan_hoi',
    assigned_to: 1,
    internal_note: 'Đã gọi khách',
  });
  await page.keyboard.press('Escape');
  await expect(modal).not.toBeVisible();
  await expect(row).toBeFocused();
  expect(errors).toEqual([]);
});
test('empty list', async ({ page }) => {
  await page.route('**/api/**/admin/contacts?*', (r) =>
    r.fulfill({ json: { success: true, data: { items: [], total: 0 } } }),
  );
  await page.goto('/admin/contacts');
  await expect(page.getByText('Chưa có liên hệ phù hợp')).toBeVisible();
});
test('bulk confirmation and partial failures remain selected', async ({ page }) => {
  const contacts = [makeContact(1), makeContact(2)];
  await page.route('**/api/**/admin/contacts**', (r) => {
    if (r.request().method() === 'PATCH') {
      if (r.request().url().endsWith('/2'))
        return r.fulfill({ status: 500, json: { success: false, message: 'Failed' } });
      contacts[0].status = 'da_phan_hoi';
      return r.fulfill({ json: { success: true, data: contacts[0] } });
    }
    return r.fulfill({ json: { success: true, data: { items: contacts, total: 2 } } });
  });
  await page.goto('/admin/contacts');
  await page.getByLabel('Chọn tất cả trang này').check();
  page.once('dialog', (d) => d.accept());
  await page
    .getByRole('region', { name: 'Thao tác đã chọn' })
    .getByRole('button', { name: 'Đánh dấu đã phản hồi' })
    .click();
  await expect(page.getByText('Đã chọn 1', { exact: true })).toBeVisible();
});

test('date filters, status counts, priority and date sorting in dark mode', async ({ page }) => {
  const contacts = [
    { ...makeContact(1), name: 'Đã trả lời', status: 'da_phan_hoi' },
    { ...makeContact(25), name: 'Đang chờ' },
    { ...makeContact(80), name: 'Quá hạn lâu' },
  ];
  await page.route('**/api/**/admin/contacts?*', (r) =>
    r.fulfill({ json: { success: true, data: { items: contacts, total: 3 } } }),
  );
  await page.goto('/admin/contacts');
  await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await expect(page.locator('tbody tr').first()).toContainText('Đang chờ');
  await expect(page.locator('tbody')).toContainText('Chờ xử lý 1 ngày');
  await page.getByLabel('Sắp xếp').selectOption('asc');
  await expect(page.locator('tbody tr').first()).toContainText('Quá hạn lâu');
  await page.getByLabel('Lọc trạng thái').getByRole('button', { name: 'Mới' }).click();
  await expect(page.locator('tbody tr')).toHaveCount(2);
  await page.getByLabel('Ngày gửi', { exact: true }).selectOption('range');
  await page.getByLabel('Từ ngày').fill('2000-01-01');
  await page.getByLabel('Đến ngày').fill('2000-01-02');
  await expect(page.getByText('Chưa có liên hệ phù hợp')).toBeVisible();
});
