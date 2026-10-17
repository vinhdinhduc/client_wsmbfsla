import { test, expect } from '@playwright/test';
import * as XLSX from 'xlsx';

test.setTimeout(120_000);

const user = { id: 1, role: 'admin', full_name: 'Kiểm thử', username: 'fixture', status: 'active' };
const token = `ui.${Buffer.from(JSON.stringify({ role: 'admin', exp: 4102444800 })).toString('base64url')}.fixture`;
const seed = Array.from({ length: 105 }, (_, i) => ({
  id: i + 1,
  code: i === 0 ? 'XMH100' : `TEST${i + 1}`,
  name: i === 0 ? 'MXH100' : i === 1 ? 'Tên rất dài '.repeat(8) : `Gói ${i + 1}`,
  slug: `goi-${i + 1}`,
  group_type: i % 2 ? 'tra_sau' : 'tra_truoc',
  price: i * 1000,
  duration_value: 30,
  duration_unit: 'ngay',
  status: 'active',
  display_order: i,
  benefits: [],
  badges: [],
  data_desc: null,
  call_desc: null,
  sms_desc: null,
  data_per_day_gb: null,
  data_per_cycle_gb: null,
}));

test.beforeEach(async ({ page, context, baseURL }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await context.addCookies([{ name: 'mfsl_token', value: token, url: baseURL! }]);
  await page.addInitScript(
    ({ user, token }) => {
      localStorage.setItem('mfsl_auth_token', token);
      localStorage.setItem('mfsl_auth_user', JSON.stringify(user));
    },
    { user, token },
  );
  let packages = structuredClone(seed);
  await page.route('**/api/**', async (route) => {
    const url = new URL(route.request().url()),
      method = route.request().method();
    let data: unknown = [];
    if (url.pathname.endsWith('/auth/me')) data = user;
    else if (url.pathname.endsWith('/public/settings')) data = {};
    else if (url.pathname.endsWith('/admin/registration-groups'))
      data = { items: [{ id: 1, items: [{ type: 'goi_cuoc', reference_id: 1 }] }], total: 1 };
    else if (/\/admin\/packages\/\d+$/.test(url.pathname)) {
      const id = Number(url.pathname.split('/').at(-1));
      if (method === 'PUT') {
        const dto = route.request().postDataJSON();
        packages = packages.map((p) => (p.id === id ? { ...p, ...dto } : p));
      }
      if (method === 'DELETE') packages = packages.filter((p) => p.id !== id);
      data = packages.find((p) => p.id === id);
    } else if (url.pathname.endsWith('/admin/packages')) {
      if (method === 'POST') {
        const dto = route.request().postDataJSON();
        const created = { ...dto, id: 106 };
        packages.push(created);
        data = created;
      } else data = packages;
    }
    await route.fulfill({ json: { success: true, data } });
  });
  await page.goto('/admin/packages', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('tab', { name: 'Tất cả (105)' })).toBeVisible();
});

test('105 packages, dynamic groups, zero price, no benefits, filters and pagination', async ({
  page,
}) => {
  await expect(page.getByRole('columnheader', { name: 'Ưu đãi chính' })).toHaveCount(0);
  await expect(page.locator('tbody tr')).toHaveCount(10);
  await expect(page.locator('tbody tr').first()).toContainText('XMH100');
  await expect(page.locator('tbody tr').first()).toContainText('MXH100');
  await expect(page.locator('tbody tr').first()).toContainText('0₫');
  await page.getByLabel('Số dòng mỗi trang').selectOption('50');
  await expect(page.locator('tbody tr')).toHaveCount(50);
  await page.getByRole('tab', { name: 'Trả sau (52)' }).click();
  await expect(page.locator('tbody tr')).toHaveCount(50);
  await page.getByLabel('Tìm gói cước').fill('không tìm thấy');
  await expect(page.getByText('Không có gói cước phù hợp.')).toBeVisible();
});

test('duplicate stays local, requires unique code, preview and unsaved Esc warning', async ({
  page,
}) => {
  let posts = 0;
  page.on('request', (request) => {
    if (request.method() === 'POST') posts++;
  });
  await page.getByRole('button', { name: 'Nhân bản XMH100', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Thêm gói cước' });
  await expect(dialog.getByLabel('Mã gói', { exact: true })).toHaveValue('');
  await expect(dialog.getByLabel('Tên gói', { exact: true })).toHaveValue('MXH100 (bản sao)');
  await expect(dialog.getByLabel('Trạng thái', { exact: true })).toHaveValue('hidden');
  await dialog.getByLabel('Mã gói', { exact: true }).fill('test2');
  await expect(dialog.getByText('Mã gói đã tồn tại')).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Lưu & đăng bán' })).toBeDisabled();
  await expect(dialog.getByRole('region', { name: 'Xem trước thẻ gói cước' })).toBeVisible();
  page.once('dialog', (d) => d.dismiss());
  await page.keyboard.press('Escape');
  await expect(dialog).toBeVisible();
  page.once('dialog', (d) => d.accept());
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  expect(posts).toBe(0);
});

test('referenced package stops selling; unreferenced delete requires code', async ({ page }) => {
  await expect(page.getByRole('columnheader', { name: 'Đăng ký' })).toBeVisible();
  await page.getByRole('button', { name: 'Xóa XMH100', exact: true }).click();
  await expect(page.getByText('Gói này có 1 đăng ký. Chuyển sang Ngừng bán?')).toBeVisible();
  await page.getByRole('button', { name: 'Chuyển sang Ngừng bán', exact: true }).click();
  await expect(page.locator('tbody tr').first()).toContainText('Ngừng bán');
  await page.getByRole('button', { name: 'Xóa TEST2', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Xác nhận xóa' });
  await expect(dialog.getByRole('button', { name: 'Xóa', exact: true })).toBeDisabled();
  await dialog.getByLabel('Nhập lại mã gói').fill('TEST2');
  await dialog.getByRole('button', { name: 'Xóa', exact: true }).click();
  await expect(page.getByRole('tab', { name: 'Tất cả (104)' })).toBeVisible();
});

test('keyboard reorder has explicit save and cancel; bulk status confirms', async ({ page }) => {
  await page.getByRole('tab', { name: 'Trả trước (53)' }).click();
  await page.getByRole('button', { name: 'Sắp xếp thứ tự', exact: true }).click();
  const handle = page.getByRole('button', { name: 'Di chuyển XMH100', exact: true });
  await handle.focus();
  await page.keyboard.press('Space');
  await page.keyboard.press('ArrowDown');
  await expect(page.locator('tbody tr').first()).toContainText('TEST3');
  await page.getByRole('button', { name: 'Lưu', exact: true }).click();
  await expect(page.getByText('Đã lưu thứ tự hiển thị')).toBeVisible();
  await expect(page.locator('tbody tr').first()).toContainText('TEST3');
  await page.getByRole('checkbox', { name: 'Chọn TEST3', exact: true }).first().check();
  await page.getByRole('button', { name: 'Ngừng bán', exact: true }).click();
  await page.getByRole('button', { name: 'Xác nhận', exact: true }).click();
  await expect(page.locator('tbody tr').first()).toContainText('Ngừng bán');
});

test('Excel rejects formulas and previews duplicate codes before update', async ({ page }) => {
  const headers = [
    'Mã gói',
    'Tên gói',
    'Nhóm',
    'Giá',
    'Chu kỳ',
    'Đơn vị chu kỳ',
    'Data',
    'Thoại',
    'SMS',
    'Cú pháp đăng ký',
    'Trạng thái',
    'Thứ tự',
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([
      headers,
      ['XMH100', '=BAD()', 'Trả trước', 0, 30, 'Ngày', '', '', '', '', 'Đang bán', 0],
    ]),
    'Gói',
  );
  await page.getByLabel('Nhập từ file').setInputFiles({
    name: 'goi.xlsx',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    buffer: XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }),
  });
  await expect(page.getByText(/Nội dung hoặc công thức Excel không an toàn/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Xác nhận nhập' })).toBeDisabled();
  await page
    .getByRole('dialog', { name: 'Xem trước nhập gói cước' })
    .getByRole('button', { name: 'Đóng', exact: true })
    .click();
  const valid = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    valid,
    XLSX.utils.aoa_to_sheet([
      headers,
      ['XMH100', 'MXH100', 'Trả trước', 123000, 30, 'Ngày', '5GB/ngày', '', '', '', 'Đang bán', 0],
    ]),
    'Gói',
  );
  await page
    .getByLabel('Nhập từ file')
    .setInputFiles({
      name: 'valid.xlsx',
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      buffer: XLSX.write(valid, { type: 'buffer', bookType: 'xlsx' }),
    });
  await expect(page.getByText('1 dòng · 1 mã đã tồn tại · 0 dòng lỗi')).toBeVisible();
  await page.getByLabel('Xử lý mã trùng').selectOption('update');
  await page.getByRole('button', { name: 'Xác nhận nhập' }).click();
  await expect(page.locator('tbody tr').first()).toContainText('123.000₫');
  await page.getByLabel('Tìm gói cước').fill('XMH100');
  const pendingDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Xuất Excel · Xuất 1 gói' }).click();
  const path = await (await pendingDownload).path();
  const exported = XLSX.readFile(path!);
  const values = XLSX.utils.sheet_to_json<unknown[]>(exported.Sheets[exported.SheetNames[0]], {
    header: 1,
  });
  expect(values).toHaveLength(2);
  expect(values[1][0]).toBe('XMH100');
  expect(values[1][3]).toBe(123000);
});

test('375px dark mode uses cards, accessible drawer and focus trap', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.evaluate(() => {
    document.documentElement.setAttribute('data-theme', 'dark');
  });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await expect(page.locator('table')).not.toBeVisible();
  await page.getByRole('button', { name: 'XMH100', exact: true }).last().click();
  const dialog = page.getByRole('dialog', { name: 'Sửa gói cước' });
  await expect(dialog).toBeVisible();
  const box = await dialog.boundingBox();
  expect(box?.y).toBe(0);
  expect(box?.height).toBe(812);
  for (let i = 0; i < 50; i++) await page.keyboard.press('Tab');
  expect(await dialog.evaluate((e) => e.contains(document.activeElement))).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.screenshot({ path: 'test-results/admin-packages-375-dark.png', fullPage: true });
  expect(errors).toEqual([]);
});
