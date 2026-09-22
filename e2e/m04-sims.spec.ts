import { test, expect, request as playwrightRequest, APIRequestContext, Page } from '@playwright/test';
import * as XLSX from 'xlsx';

const apiBase = `${(process.env.E2E_API_URL ?? 'http://localhost:4000/api/v1').replace(/\/+$/, '')}/`;
const isolated = process.env.E2E_DB_ISOLATED === '1';
let api: APIRequestContext;
let token = '';
let authUser: unknown;

test.beforeAll(async () => {
  test.skip(!isolated, 'Chỉ chạy trên CSDL E2E riêng: E2E_DB_ISOLATED=1');
  api = await playwrightRequest.newContext({ baseURL: apiBase });
  const response = await api.post('auth/login', { data: {
    username: process.env.E2E_ADMIN_USERNAME,
    password: process.env.E2E_ADMIN_PASSWORD,
  } });
  expect(response.ok()).toBeTruthy();
  const login = (await response.json()).data;
  token = login.token;
  authUser = login.user;
});

test.afterAll(async () => { await api?.dispose(); });

function auth() { return { Authorization: `Bearer ${token}` }; }
async function authPage(page: Page) {
  await page.context().addCookies([{ name: 'mfsl_token', value: token, url: process.env.E2E_BASE_URL ?? 'http://localhost:3000' }]);
  await page.addInitScript(({ value, user }) => {
    localStorage.setItem('mfsl_auth_token', value);
    localStorage.setItem('mfsl_auth_user', JSON.stringify(user));
  }, { value: token, user: authUser });
}
function phone(suffix: number) { return `099${String(suffix).padStart(7, '0')}`; }
async function createSim(number: string, type: 'prepaid' | 'postpaid') {
  const response = await api.post('admin/sims', { headers: auth(), data: {
    phone_number: number, subscription_type: type, catalog: 'so_dep', sim_type: 'thuong',
    commitment_months: 0, status: 'available',
  } });
  expect(response.ok()).toBeTruthy();
  return (await response.json()).data.id as number;
}

test('TC-04/05: đổi trả trước bằng chuột và bàn phím, F5 giữ lọc và phí đúng', async ({ page }) => {
  const seed = Math.floor(Date.now() / 1000) % 9_000_000;
  const prepaid = phone(seed);
  const postpaid = phone(seed + 1);
  await createSim(prepaid, 'prepaid');
  await createSim(postpaid, 'postpaid');
  await page.goto('/sim-so-dep?type=postpaid');
  await expect(page.getByRole('radio', { name: 'Trả sau' })).toBeChecked();
  await page.getByRole('radio', { name: 'Trả trước' }).check();
  await expect(page).toHaveURL(/type=prepaid/);
  await expect(page.getByRole('radio', { name: 'Trả trước' })).toBeChecked();
  await expect(page.getByRole('row', { name: new RegExp(prepaid) })).toContainText('50.000');
  await page.reload();
  await expect(page.getByRole('radio', { name: 'Trả trước' })).toBeChecked();
  await page.getByRole('radio', { name: 'Trả trước' }).focus();
  await page.keyboard.press('ArrowLeft');
  await expect(page.getByRole('radio', { name: 'Trả sau' })).toBeChecked();
  await expect(page.getByRole('row', { name: new RegExp(postpaid) })).toContainText('60.000');
});

test('TC-06: xuất XLSX theo bộ lọc giữ số 0 đầu và ghi nhật ký', async () => {
  const seed = Math.floor(Date.now() / 1000) % 9_000_000;
  const number = phone(seed + 2);
  await createSim(number, 'prepaid');
  const response = await api.get(`admin/sims/export?format=xlsx&scope=filtered&q=${number}`, { headers: auth() });
  expect(response.ok()).toBeTruthy();
  const workbook = XLSX.read(await response.body(), { type: 'buffer' });
  const rows = XLSX.utils.sheet_to_json<string[]>(workbook.Sheets[workbook.SheetNames[0]], { header: 1 });
  expect(rows).toHaveLength(2);
  expect(rows[1][0]).toBe(number);
  const csvResponse = await api.get(`admin/sims/export?format=csv&scope=filtered&q=${number}&columns=phone,fee`, { headers: auth() });
  expect(csvResponse.ok()).toBeTruthy();
  const csv = await csvResponse.text();
  expect(csv.startsWith('\uFEFF"Số thuê bao","Phí hòa mạng"')).toBeTruthy();
  expect(csv).toContain(`"${number}","50000"`);
  expect(csv.trim().split('\r\n')).toHaveLength(2);
  const invalidColumns = await api.get('admin/sims/export?columns=phone,password', { headers: auth() });
  expect(invalidColumns.status()).toBe(422);
  const audit = await api.get('admin/audit-logs?module=sims', { headers: auth() });
  expect(audit.ok()).toBeTruthy();
  expect(JSON.stringify(await audit.json())).toContain('Xuất 1 dòng kho sim');
});

test('TC-07: từ chối wildcard có SQL injection', async () => {
  const response = await api.get('public/sims?q=' + encodeURIComponent("090*'; DROP TABLE sims;--"));
  expect(response.status()).toBe(422);
});

test('TC-08: hai phiên cùng giữ một sim, chỉ một thành công', async () => {
  test.skip(!process.env.E2E_RECAPTCHA_TOKEN_A || !process.env.E2E_RECAPTCHA_TOKEN_B, 'Cần hai token reCAPTCHA hợp lệ trên môi trường E2E');
  const seed = Math.floor(Date.now() / 1000) % 9_000_000;
  const id = await createSim(phone(seed + 3), 'postpaid');
  const data = {
    customer_name: 'Khách kiểm thử', phone: '0912345678', email: 'e2e@example.test',
    delivery_method: 'store', sim_type: 'physical', delivery_store: 'Cửa hàng kiểm thử',
    province: 'Sơn La', ward: 'Phường Tô Hiệu', items: [{ type: 'sim', reference_id: id }],
  };
  const responses = await Promise.all([
    api.post('public/registrations', { data: { ...data, recaptcha_token: process.env.E2E_RECAPTCHA_TOKEN_A } }),
    api.post('public/registrations', { data: { ...data, recaptcha_token: process.env.E2E_RECAPTCHA_TOKEN_B } }),
  ]);
  expect(responses.map((response) => response.status()).sort()).toEqual([201, 409]);
});

test('TC-09: xem trước 1.000 dòng, 10 lỗi; xác nhận chỉ nhập 990', async ({ page }) => {
  // Millisecond resolution avoids overlapping the previous 990-number block on reruns.
  const seed = Date.now() % 7_000_000;
  const rows: unknown[][] = [['phone_number', 'subscription_type', 'catalog', 'sim_type', 'price', 'bundle_note', 'commitment_months', 'status']];
  for (let index = 0; index < 1000; index += 1) {
    rows.push([index < 10 ? `sai-${index}` : phone(seed + index), 'prepaid', 'so_dep', 'thuong', null, null, 0, 'available']);
  }
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(rows), 'Kho sim');
  const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' }) as Buffer;
  await authPage(page);
  await page.goto('/admin/sims');
  await page.locator('input[type=file]').setInputFiles({ name: 'kho-sim-e2e.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', buffer });
  await expect(page.getByText('Dự kiến thêm 990')).toBeVisible();
  await expect(page.getByText('10 dòng lỗi:')).toBeVisible();
  await page.getByRole('button', { name: 'Xác nhận nhập' }).click();
  await expect(page.getByText('Đã nhập thành công')).toBeVisible();
  await expect(page.getByText('990', { exact: true })).toBeVisible();
});
