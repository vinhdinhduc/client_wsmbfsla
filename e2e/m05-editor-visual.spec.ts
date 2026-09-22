import { test, expect, request as playwrightRequest } from '@playwright/test';

test('TC-10: editor visible in light and dark themes', async ({ page }) => {
  test.skip(!process.env.E2E_ADMIN_USERNAME || !process.env.E2E_ADMIN_PASSWORD, 'Admin test credentials required');
  const api = await playwrightRequest.newContext({ baseURL: `${process.env.E2E_API_URL || 'http://10.14.26.245:4001/api/v1'}/` });
  try {
    const response = await api.post('auth/login', { data: { username: process.env.E2E_ADMIN_USERNAME, password: process.env.E2E_ADMIN_PASSWORD } });
    expect(response.ok()).toBeTruthy();
    const { token, user } = (await response.json()).data;
    await page.context().addCookies([{ name: 'mfsl_token', value: token, url: 'http://localhost:3000' }]);
    await page.addInitScript(({ authToken, authUser }) => { localStorage.setItem('mfsl_auth_token', authToken); localStorage.setItem('mfsl_auth_user', JSON.stringify(authUser)); }, { authToken: token, authUser: user });
    await page.goto('/admin/solutions/new');
    const editor = page.locator('[contenteditable="true"]').first();
    await expect(editor).toBeVisible();
    await editor.fill('Kiểm tra vùng soạn thảo');
    for (const theme of ['light', 'dark']) {
      await page.evaluate((value) => { document.documentElement.dataset.theme = value; }, theme);
      await expect(editor).toBeVisible();
      const box = await editor.boundingBox();
      expect(box?.height).toBeGreaterThanOrEqual(320);
      const contrast = await editor.evaluate((element) => {
        const color = getComputedStyle(element).color.match(/\d+/g)!.slice(0, 3).map(Number);
        const background = getComputedStyle(element.parentElement!.parentElement!).backgroundColor.match(/\d+/g)!.slice(0, 3).map(Number);
        const luminance = (rgb: number[]) => rgb.map((value) => { const s = value / 255; return s <= .04045 ? s / 12.92 : ((s + .055) / 1.055) ** 2.4; }).reduce((sum, value, index) => sum + value * [.2126, .7152, .0722][index], 0);
        const [a, b] = [luminance(color), luminance(background)].sort((x, y) => y - x);
        return (a + .05) / (b + .05);
      });
      expect(contrast).toBeGreaterThanOrEqual(4.5);
      await editor.screenshot({ path: `test-results/m05-editor-${theme}.png` });
    }
  } finally { await api.dispose(); }
});
