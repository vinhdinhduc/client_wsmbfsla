import { test, expect } from '@playwright/test';
import * as XLSX from 'xlsx';

const config = {
  provider: 'anthropic',
  model: 'test-model',
  temperature: 0.4,
  max_tokens: 500,
  top_p: 1,
  system_prompt: 'Trợ lý MobiFone',
  daily_limit: 20,
  rag_enabled: true,
  enabled: true,
  has_api_key: true,
  api_key_masked: '***',
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
    localStorage.setItem('mfsl_admin_theme', 'dark');
  }, token);
  await page.route('**/auth/me', (route) =>
    route.fulfill({ json: { success: true, data: { id: 1, role: 'admin', full_name: 'Admin' } } }),
  );
  await page.route('**/api/**/admin/ai-settings', (route) =>
    route.fulfill({
      json: {
        success: true,
        data:
          route.request().method() === 'PUT'
            ? { ...config, ...route.request().postDataJSON() }
            : config,
      },
    }),
  );
  await page.route('**/api/**/admin/ai-stats', (route) =>
    route.fulfill({
      json: {
        success: true,
        data: { conversations: 12, input_tokens: 100, output_tokens: 200, estimated_cost: 0.01 },
      },
    }),
  );
  await page.route('**/api/**/admin/ai-playground', (route) =>
    route.fulfill({
      json: {
        success: true,
        data: { reply: `Trả lời: ${route.request().postDataJSON().message}` },
      },
    }),
  );
});

test('one configuration form, validation, chat history and tablet layout', async ({ page }) => {
  await page.setViewportSize({ width: 820, height: 1180 });
  await page.goto('/admin/ai-settings');
  await expect(page.getByLabel('System prompt')).toHaveValue(config.system_prompt);
  await expect(page.getByText('Thống kê 30 ngày')).toBeHidden();
  await page.getByLabel('System prompt').fill('Cấu hình mới');
  await page.getByRole('switch', { name: 'Chế độ nâng cao' }).check();
  await expect(page.getByLabel('System prompt')).toHaveValue('Cấu hình mới');
  await expect(page.getByText('Số hội thoại', { exact: true })).toBeVisible();
  await page.getByLabel('Max tokens').fill('4001');
  await expect(page.getByRole('button', { name: 'Lưu cấu hình' })).toBeDisabled();
  await page.getByLabel('Max tokens').fill('1000');
  await page.getByLabel('Giới hạn câu hỏi/ngày').fill('1.5');
  await expect(page.getByRole('button', { name: 'Lưu cấu hình' })).toBeDisabled();
  await page.getByLabel('Giới hạn câu hỏi/ngày').fill('25');
  await page.getByRole('switch').uncheck();
  const request = page.waitForRequest(
    (request) => request.method() === 'PUT' && request.url().endsWith('/admin/ai-settings'),
  );
  await page.getByRole('button', { name: 'Lưu cấu hình' }).click();
  expect((await request).postDataJSON()).toMatchObject({
    system_prompt: 'Cấu hình mới',
    max_tokens: 1000,
    daily_limit: 25,
  });
  await page.getByRole('switch').check();
  for (const message of ['Xin chào', 'Gói cước nào?']) {
    await page.getByLabel('Câu hỏi thử chatbot').fill(message);
    await page.getByRole('button', { name: 'Gửi thử' }).click();
    await expect(
      page.getByRole('log').getByText(`Trả lời: ${message}`, { exact: true }),
    ).toBeVisible();
  }
  await expect(page.getByRole('log').getByText('Xin chào', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await expect(page.getByRole('navigation', { name: 'Breadcrumb' })).toContainText('Cài đặt');
  await page.screenshot({ path: '.playwright-results/ai-settings-tablet.png', fullPage: true });
});

test('xlsx and csv preview, duplicates, row selection and template', async ({ page }) => {
  const saved: string[] = [];
  await page.route('**/api/**/admin/ai-knowledge*', (route) => {
    if (route.request().method() === 'POST') {
      const body = route.request().postDataJSON();
      saved.push(body.title);
      return route.fulfill({ json: { success: true, data: { id: 2, ...body } } });
    }
    return route.fulfill({
      json: {
        success: true,
        data: [{ id: 1, title: 'Có sẵn', content: 'Nội dung', tags: '', status: 'active' }],
      },
    });
  });
  await page.goto('/admin/ai-knowledge');
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Tải file mẫu' }).click();
  expect((await download).suggestedFilename()).toBe('mau-tri-thuc-ai.xlsx');
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    book,
    XLSX.utils.aoa_to_sheet([
      ['Tiêu đề', 'Nội dung', 'Tags', 'Trạng thái'],
      ['Có sẵn', 'Trùng', '', 'active'],
      ['Mới', 'Nội dung mới', 'tag', 'active'],
      ['Bỏ qua', 'Nội dung', '', 'inactive'],
      ['Sai', '', '', 'active'],
    ]),
    'Data',
  );
  await page
    .getByLabel('File tri thức')
    .setInputFiles({
      name: 'test.xlsx',
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      buffer: XLSX.write(book, { type: 'buffer', bookType: 'xlsx' }),
    });
  await expect(page.getByLabel('Chọn dòng 1: Có sẵn')).not.toBeChecked();
  await expect(page.getByLabel('Chọn dòng 4: Sai')).toBeDisabled();
  await page.getByLabel('Chọn dòng 3: Bỏ qua').uncheck();
  await page.getByRole('button', { name: 'Lưu 1 dòng đã chọn' }).click();
  await expect(page.getByText('Đã lưu', { exact: true })).toBeVisible();
  expect(saved).toEqual(['Mới']);
  await page.getByRole('button', { name: 'Đóng xem trước' }).click();
  await page
    .getByLabel('File tri thức')
    .setInputFiles({
      name: 'test.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(
        '\ufeffTiêu đề,Nội dung,Tags,Trạng thái\nCSV mới,"Nội dung, có dấu phẩy",tag,active',
      ),
    });
  await expect(page.getByLabel('Chọn dòng 1: CSV mới')).toBeChecked();
});
