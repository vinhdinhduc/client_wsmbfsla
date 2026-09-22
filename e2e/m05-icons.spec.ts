import { test, expect, request as playwrightRequest, type APIRequestContext, type Page } from '@playwright/test';

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

async function authPage(page: Page) {
  await page.context().addCookies([{ name: 'mfsl_token', value: token, url: process.env.E2E_BASE_URL ?? 'http://localhost:3000' }]);
  await page.addInitScript(({ value, user }) => {
    localStorage.setItem('mfsl_auth_token', value);
    localStorage.setItem('mfsl_auth_user', JSON.stringify(user));
  }, { value: token, user: authUser });
}

test('TC-11: tìm khóa/lock, chọn icon, lưu và xem đúng ở trang công khai', async ({ page }) => {
  const stamp = Date.now();
  const slug = `giai-phap-icon-e2e-${stamp}`;
  const featureTitle = `Bảo mật E2E ${stamp}`;
  await authPage(page);
  await page.goto('/admin/solutions/new');
  await page.getByLabel('Tên giải pháp').fill(`Giải pháp E2E ${stamp}`);
  await page.getByLabel('Slug').fill(slug);
  await page.locator('[contenteditable="true"]').first().fill('Nội dung kiểm thử icon.');
  await page.getByRole('button', { name: 'Thêm tính năng' }).click();
  const search = page.getByRole('searchbox', { name: 'Tìm biểu tượng bằng tiếng Việt hoặc tiếng Anh' });
  await search.fill('khóa');
  await expect(page.getByRole('button', { name: /Chọn biểu tượng .*lock/ }).first()).toBeVisible();
  await search.fill('lock-keyhole');
  await page.getByRole('button', { name: 'Chọn biểu tượng lock-keyhole', exact: true }).click();
  await expect(page.getByText('lock-keyhole', { exact: true })).toBeVisible();
  await page.setViewportSize({ width: 375, height: 812 });
  await page.evaluate(() => { document.documentElement.dataset.theme = 'dark'; });
  await expect(search).toBeVisible();
  expect(await page.locator('[aria-label="Danh sách biểu tượng"]').evaluate((element) => element.getBoundingClientRect().right <= window.innerWidth)).toBe(true);
  await page.getByRole('textbox', { name: 'Tiêu đề *' }).fill(featureTitle);
  await page.getByRole('button', { name: 'Tạo giải pháp' }).click();
  await expect(page).toHaveURL(/\/admin\/solutions$/);
  const response = await api.get(`public/solutions/${slug}`);
  expect(response.ok()).toBeTruthy();
  expect((await response.json()).data.features[0].icon).toBe('lock-keyhole');
  await page.goto(`/giai-phap-so/${slug}`);
  await expect(page.getByText(featureTitle)).toBeVisible();
  await expect(page.locator('article').filter({ hasText: featureTitle }).locator('svg')).toBeVisible();
});
