import { test, expect, request as playwrightRequest } from '@playwright/test';

test('TC-23: missing banner image shows a placeholder', async ({ page }) => {
  test.skip(!process.env.E2E_ADMIN_USERNAME || !process.env.E2E_ADMIN_PASSWORD, 'Admin test credentials required');
  const api = await playwrightRequest.newContext({ baseURL: `${process.env.E2E_API_URL || 'http://10.14.26.245:4001/api/v1'}/` });
  try {
    const response = await api.post('auth/login', { data: { username: process.env.E2E_ADMIN_USERNAME, password: process.env.E2E_ADMIN_PASSWORD } });
    expect(response.ok()).toBeTruthy();
    const { token, user } = (await response.json()).data;
    await page.context().addCookies([{ name: 'mfsl_token', value: token, url: 'http://localhost:3000' }]);
    await page.addInitScript(({ authToken, authUser }) => { localStorage.setItem('mfsl_auth_token', authToken); localStorage.setItem('mfsl_auth_user', JSON.stringify(authUser)); }, { authToken: token, authUser: user });
    await page.route('**/api/admin/sliders/items?*', async (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, message: '', data: [{ id: 99999, zone_id: 1, image_url: '/uploads/e2e-missing-banner.png', title: 'Ảnh lỗi E2E', caption: '', display_order: 0, status: 'active', effective_status: 'active', start_date: null, end_date: null, created_at: new Date().toISOString() }] }) }));
    await page.goto('/admin/sliders');
    await expect(page.getByTitle('Không thể tải ảnh')).toBeVisible();
  } finally { await api.dispose(); }
});
