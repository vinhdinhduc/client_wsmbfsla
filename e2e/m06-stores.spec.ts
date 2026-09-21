import { test, expect, request as playwrightRequest, APIRequestContext, Page } from '@playwright/test';

const apiBase = `${(process.env.E2E_API_URL ?? 'http://localhost:4000/api/v1').replace(/\/+$/, '')}/`;
let api: APIRequestContext;
let token = '';
let authUser: unknown;

test.beforeAll(async () => {
  test.skip(process.env.E2E_DB_ISOLATED !== '1', 'Chỉ chạy trên CSDL E2E đã migrate/seed riêng');
  api = await playwrightRequest.newContext({ baseURL: apiBase });
  const response = await api.post('auth/login', { data: {
    username: process.env.E2E_ADMIN_USERNAME, password: process.env.E2E_ADMIN_PASSWORD,
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

test('TC-13/14: form dùng xã/phường, tạo địa chỉ đầy đủ và chặn giờ đóng trước giờ mở', async ({ page }) => {
  await authPage(page);
  await page.goto('/admin/stores');
  await page.getByRole('button', { name: 'Thêm cửa hàng' }).click();
  await expect(page.getByLabel('Xã/Phường *')).toBeVisible();
  await expect(page.getByText('Huyện/Thành phố')).toHaveCount(0);
  const name = `Cửa hàng E2E ${Date.now()}`;
  await page.getByLabel('Tên cửa hàng').fill(name);
  await page.getByLabel('Số nhà, đường, tổ/bản *').fill('96B Đường 3/2');
  await page.getByLabel('Xã/Phường *').selectOption('03646');
  await page.getByLabel('Hotline').fill('0912345678');
  await page.getByLabel('Giờ mở').fill('08:00');
  await page.getByLabel('Giờ đóng').fill('07:00');
  await page.getByRole('button', { name: 'Lưu' }).click();
  await expect(page.getByText('Giờ đóng phải sau giờ mở')).toBeVisible();
  await page.getByLabel('Giờ đóng').fill('17:30');
  await page.getByRole('button', { name: 'Lưu' }).click();
  await expect(page.getByText(name)).toBeVisible();
  const list = await api.get('admin/stores', { headers: auth() });
  const store = (await list.json()).data.find((item: { name: string }) => item.name === name);
  expect(store.full_address).toBe('96B Đường 3/2, Phường Tô Hiệu, Tỉnh Sơn La');
  expect(store.needs_review).toBe(false);
});

test('TC-15: bấm bản đồ đổi tọa độ; tìm địa chỉ đặt marker', async ({ page }) => {
  await authPage(page);
  await page.route('**/admin/stores/geocode?**', async (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: { lat: 21.326, lng: 103.919, label: 'Phường Tô Hiệu', source: 'nominatim' }, message: '' }) }));
  await page.goto('/admin/stores');
  await page.getByRole('button', { name: 'Thêm cửa hàng' }).click();
  const before = await page.getByLabel('Vĩ độ (lat)').inputValue();
  await page.locator('.leaflet-container').click({ position: { x: 180, y: 130 } });
  await expect(page.getByLabel('Vĩ độ (lat)')).not.toHaveValue(before);
  await page.getByLabel('Số nhà, đường, tổ/bản *').fill('96B Đường 3/2');
  await page.getByLabel('Xã/Phường *').selectOption('03646');
  await page.getByRole('button', { name: 'Tìm vị trí từ địa chỉ' }).click();
  await expect(page.getByLabel('Vĩ độ (lat)')).toHaveValue('21.326');
});

test('TC-16: cửa hàng ngoài giờ hiển thị Đã đóng cửa', async ({ page }) => {
  const name = `Cửa hàng đóng E2E ${Date.now()}`;
  const response = await api.post('admin/stores', { headers: auth(), data: {
    name, street_address: 'Số 1 Đường kiểm thử', ward_code: '03646', phone: '0912345678',
    lat: 21.3256, lng: 103.9188, status: 'active',
    opening_hours_json: [{ days: [1, 2, 3, 4, 5, 6, 7], open: '00:00', close: '00:01' }],
  } });
  expect(response.ok()).toBeTruthy();
  await page.goto('/cua-hang');
  await expect(page.getByText(name)).toBeVisible();
  await expect(page.getByText('Đã đóng cửa').first()).toBeVisible();
});

test('AC-06.4: chỉ công bố giao dịch viên đồng ý hiển thị và dùng số công việc', async ({ page }) => {
  const stamp = Date.now();
  const storeResponse = await api.post('admin/stores', { headers: auth(), data: {
    name: `Cửa hàng nhân viên E2E ${stamp}`, street_address: 'Số 2 Đường kiểm thử', ward_code: '03646', phone: '0912345678',
    lat: 21.3256, lng: 103.9188, status: 'active',
    opening_hours_json: [{ days: [1, 2, 3, 4, 5, 6, 7], open: '07:30', close: '17:30' }],
  } });
  expect(storeResponse.status()).toBe(201);
  const storeId = (await storeResponse.json()).data.id;
  const base = { password: 'TestPassword123!', phone: '0987654321', role: 'giao_dich_vien', status: 'active', store_id: storeId };
  const missingStore = await api.post('admin/users', { headers: auth(), data: { ...base, username: `missing${stamp}`, full_name: 'Thiếu cửa hàng', email: `missing${stamp}@example.test`, store_id: null } });
  expect(missingStore.status()).toBe(422);
  const visible = await api.post('admin/users', { headers: auth(), data: { ...base, username: `visible${stamp}`, full_name: 'Nhân viên công khai', email: `visible${stamp}@example.test`, is_public_profile: true, public_phone: '0911222333' } });
  expect(visible.status()).toBe(201);
  const hidden = await api.post('admin/users', { headers: auth(), data: { ...base, username: `hidden${stamp}`, full_name: 'Nhân viên riêng tư', email: `hidden${stamp}@example.test`, is_public_profile: false, public_phone: '0944555666' } });
  expect(hidden.status()).toBe(201);
  const publicResponse = await api.get('public/stores');
  expect(publicResponse.ok()).toBeTruthy();
  const publicStore = (await publicResponse.json()).data.find((item: { id: number }) => item.id === storeId);
  expect(publicStore.staff).toHaveLength(1);
  expect(publicStore.staff[0].full_name).toBe('Nhân viên công khai');
  expect(publicStore.staff[0].public_phone).toBe('0911222333');
  expect(JSON.stringify(publicStore.staff)).not.toContain('0987654321');
  await page.goto('/cua-hang');
  await expect(page.getByText('Nhân viên công khai').first()).toBeVisible();
  await expect(page.getByText('Nhân viên riêng tư')).toHaveCount(0);
});
