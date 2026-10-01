import { test, expect } from '@playwright/test';
import { providers } from '../../server/src/services/llm/registry/providers';
test.setTimeout(90000);

const first = {
  id: '00000000-0000-4000-8000-000000000001',
  name: 'Tư vấn',
  provider: 'anthropic',
  model: 'claude-haiku-4-5',
  enabled: true,
  temperature: 0.2,
  max_tokens: 1024,
  top_p: 1,
  has_api_key: true,
  api_key_masked: '****1234',
  api_key_error: null,
};
const config = {
  ...first,
  profiles: [first],
  system_prompt: 'Trợ lý MobiFone',
  daily_limit: 20,
  rag_enabled: true,
  prices: [],
};
test.beforeEach(async ({ page, context }) => {
  const token = `test.${Buffer.from(JSON.stringify({ role: 'admin', exp: 4102444800 })).toString('base64url')}.test`;
  await context.addCookies([
    { name: 'mfsl_token', value: token, url: test.info().project.use.baseURL! },
  ]);
  await page.addInitScript((token) => {
    localStorage.setItem('mfsl_auth_token', token);
    localStorage.setItem(
      'mfsl_auth_user',
      JSON.stringify({ id: 1, role: 'admin', full_name: 'Admin' }),
    );
  }, token);
  await page.route('**/auth/me', (r) =>
    r.fulfill({ json: { success: true, data: { id: 1, role: 'admin', full_name: 'Admin' } } }),
  );
  await page.route('**/api/**/admin/ai/providers', (r) =>
    r.fulfill({ json: { success: true, data: providers } }),
  );
  await page.route('**/api/**/admin/ai-settings', (r) =>
    r.fulfill({
      json: {
        success: true,
        data:
          r.request().method() === 'PUT'
            ? {
                ...config,
                ...r.request().postDataJSON(),
                profiles: r
                  .request()
                  .postDataJSON()
                  .profiles.map((p: any) => ({
                    ...p,
                    api_key: undefined,
                    has_api_key: true,
                    api_key_masked: '****1234',
                  })),
              }
            : config,
      },
    }),
  );
  await page.route('**/api/**/admin/ai-stats', (r) =>
    r.fulfill({
      json: {
        success: true,
        data: {
          conversations: 12,
          input_tokens: 1200,
          output_tokens: 200,
          estimated_cost: 0.01,
          cost_missing: 1,
          daily: [{ day: '2026-09-29', calls: 12, errors: 1, cost: 0.01 }],
          models: [
            {
              provider: 'anthropic',
              model: first.model,
              calls: 12,
              errors: 1,
              cost: 0.01,
              cost_missing: 1,
            },
          ],
        },
      },
    }),
  );
  await page.route('**/api/**/admin/ai-playground', (r) =>
    r.fulfill({
      json: {
        success: true,
        data: {
          reply: 'Xin chào bạn',
          model: r.request().postDataJSON().profile.model,
          usage: { inputTokens: 12, outputTokens: 8 },
          estimated_cost: 0.00005,
        },
      },
    }),
  );
  await page.route('**/api/**/admin/ai-settings/test-connection', (r) =>
    r.fulfill({ status: 400, json: { success: false, message: 'API key không hợp lệ' } }),
  );
});

for (const width of [375, 768, 1280])
  for (const theme of ['light', 'dark']) {
    test(`provider grid and editor ${width}px ${theme}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 1000 });
      await page.addInitScript((theme) => localStorage.setItem('mfsl_admin_theme', theme), theme);
      await page.goto('/admin/ai-settings');
      await expect(page.getByLabel('Chỉ dẫn cho trợ lý')).toHaveValue(config.system_prompt);
      await page.getByRole('button', { name: 'Đổi', exact: true }).click();
      await expect(
        page.getByRole('group', { name: 'Nhà cung cấp', exact: true }).getByRole('button'),
      ).toHaveCount(24);
      await expect(page.getByRole('button', { name: /OpenAI Hội thoại/ })).toBeVisible();
      const columns = await page
        .getByRole('group', { name: 'Nhà cung cấp', exact: true })
        .evaluate((node) => getComputedStyle(node).gridTemplateColumns.split(' ').length);
      expect(columns).toBe(width === 375 ? 1 : width === 768 ? 2 : 4);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      await page.screenshot({
        path: `.playwright-results/ai-providers-${width}-${theme}.png`,
        fullPage: true,
      });
      await page.getByLabel('Tìm nhà cung cấp').fill('OpenAI');
      await page.getByRole('button', { name: /OpenAI Hội thoại/ }).click();
      await expect(page.getByRole('combobox', { name: 'Model', exact: true })).toHaveValue(
        'gpt-4.1-mini',
      );
      await expect(page.getByLabel('Chế độ trả lời')).toHaveValue('0.2');
    });
  }
test('keeps draft keys per provider, supports keyboard model selection and unsaved preview', async ({
  page,
}) => {
  await page.goto('/admin/ai-settings');
  await page.getByLabel('API key mới', { exact: true }).fill('anthropic-draft');
  await page.getByRole('button', { name: 'Đổi', exact: true }).click();
  await page.getByRole('button', { name: /OpenAI Hội thoại/ }).click();
  await page.getByLabel('API key mới', { exact: true }).fill('openai-draft');
  await page.getByRole('button', { name: 'Đổi', exact: true }).click();
  await page.getByRole('button', { name: /Claude \(Anthropic\) Trợ lý/ }).click();
  await expect(page.getByLabel('API key mới', { exact: true })).toHaveValue('anthropic-draft');
  await page.getByRole('combobox', { name: 'Model', exact: true }).focus();
  await page.keyboard.press('End');
  await page.keyboard.press('Enter');
  await page.getByLabel('Model tùy chỉnh').fill('brand-new-model');
  await page.getByLabel('Chỉ dẫn cho trợ lý').fill('Chỉ dẫn chưa lưu');
  await page.getByLabel('Câu hỏi thử chatbot').fill('Xin chào');
  const request = page.waitForRequest((r) => r.url().endsWith('/admin/ai-playground'));
  await page.getByRole('button', { name: 'Gửi thử' }).click();
  expect((await request).postDataJSON()).toMatchObject({
    system_prompt: 'Chỉ dẫn chưa lưu',
    profile: { model: 'brand-new-model', api_key: 'anthropic-draft' },
  });
  await expect(page.getByRole('log')).toContainText('12 token vào');
  await page.getByRole('button', { name: 'Kiểm tra kết nối' }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'API key không hợp lệ' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Lưu cấu hình' })).toBeEnabled();
});
test('live models remain selectable after changing model; profiles reorder and cancel', async ({
  page,
}) => {
  await page.route('**/api/**/admin/ai/providers/*/models', (r) =>
    r.fulfill({
      json: {
        success: true,
        data: {
          source: 'api',
          models: [
            {
              ...providers[0].models[0],
              id: 'new-api-model',
              label: 'Model từ API',
              source: 'api',
            },
          ],
        },
      },
    }),
  );
  await page.goto('/admin/ai-settings');
  await page.getByRole('button', { name: 'Lấy danh sách từ nhà cung cấp' }).click();
  await page.getByRole('combobox', { name: 'Model', exact: true }).focus();
  await page.keyboard.press('Home');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('combobox', { name: 'Model', exact: true })).toHaveValue(
    'new-api-model',
  );
  await page.getByRole('combobox', { name: 'Model', exact: true }).click();
  await expect(page.getByRole('option', { name: /Model từ API/ })).toBeVisible();
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Thêm profile' }).click();
  await expect(page.getByRole('tab')).toHaveCount(2);
  await page.getByRole('button', { name: 'Đưa profile lên' }).click();
  await expect(page.getByRole('tab').first()).toContainText('Profile 2');
  await page.getByRole('button', { name: 'Hủy', exact: true }).click();
  await expect(page.getByRole('tab')).toHaveCount(1);
  await expect(page.getByRole('combobox', { name: 'Model', exact: true })).toHaveValue(first.model);
});
