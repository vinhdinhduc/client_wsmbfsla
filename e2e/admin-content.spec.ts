import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

const user = {
  id: 1,
  role: 'admin',
  full_name: 'Quản trị kiểm thử',
  username: 'ui-test',
  status: 'active',
};
const token = `ui.${Buffer.from(JSON.stringify({ role: 'admin', exp: 4102444800 })).toString('base64url')}.fixture`;
const news = [
  {
    id: 1,
    title: 'Tin có ảnh',
    slug: 'tin-co-anh',
    category: 'thong_bao',
    status: 'published',
    cover_url: '/uploads/news-test.png',
    content: '<p>Nội dung</p>',
    published_at: '2026-09-20T00:00:00Z',
  },
  {
    id: 2,
    title: 'Tin thiếu ảnh',
    slug: 'tin-thieu-anh',
    category: 'su_kien',
    status: 'draft',
    thumbnail: '/uploads/missing-test.png',
    content: '<p>Nội dung</p>',
  },
];
const jobs = [1, 2].map((id) => ({
  id,
  title: `Vị trí ${id}`,
  slug: `vi-tri-${id}`,
  category: 'Kinh doanh',
  location: 'Sơn La',
  quantity: 1,
  employment_type: 'full_time',
  salary_type: 'negotiable',
  deadline: '2027-12-31',
  status: 'draft',
  description: `<p><strong>Mô tả ${id}</strong></p>`,
  requirements: `<ul><li>Yêu cầu ${id}</li></ul>`,
  benefits: `<p>Quyền lợi ${id}</p>`,
}));

test.beforeEach(async ({ page, context, baseURL }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await context.addCookies([{ name: 'mfsl_token', value: token, url: baseURL! }]);
  await page.addInitScript(
    ({ token, user }) => {
      localStorage.setItem('mfsl_auth_token', token);
      localStorage.setItem('mfsl_auth_user', JSON.stringify(user));
    },
    { token, user },
  );
  await page.route('**/api/**', async (route) => {
    const url = new URL(route.request().url());
    let data: unknown = [];
    if (url.pathname.endsWith('/auth/me')) data = user;
    if (url.pathname.endsWith('/public/settings')) data = {};
    if (url.pathname.endsWith('/admin/news')) {
      const items = news.filter(
        (item) =>
          (!url.searchParams.get('status') || item.status === url.searchParams.get('status')) &&
          item.title.includes(url.searchParams.get('search') || ''),
      );
      data = { items, total: items.length, page: 1, page_size: 100 };
    }
    if (url.pathname.endsWith('/admin/jobs')) data = jobs;
    if (url.pathname.endsWith('/admin/packages'))
      data = [
        {
          id: 1,
          name: 'Gói đang bán',
          code: 'C90',
          group_type: 'hot',
          price: 90000,
          duration_value: 30,
          duration_unit: 'ngay',
          status: 'active',
        },
        {
          id: 2,
          name: 'Gói đã ẩn',
          code: 'H120',
          group_type: 'hot',
          price: 120000,
          duration_value: 30,
          duration_unit: 'ngay',
          status: 'hidden',
        },
      ];
    await route.fulfill({ json: { success: true, data } });
  });
  await page.route('**/uploads/news-test.png', (route) =>
    route.fulfill({ contentType: 'image/png', body: readFileSync('public/logo_ngan.png') }),
  );
  await page.route('**/uploads/missing-test.png', (route) =>
    route.fulfill({ status: 404, body: 'Not found' }),
  );
});

for (const width of [390, 1440]) {
  test(`news images and responsive filters at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('/admin/news');
    const image = page.getByRole('img', { name: 'Tin có ảnh', exact: true });
    await expect(image).toBeVisible();
    await expect
      .poll(() => image.evaluate((img) => (img as HTMLImageElement).naturalWidth))
      .toBeGreaterThan(0);
    expect(await image.getAttribute('src')).toMatch(/^https?:\/\/[^/]+\/uploads\/news-test\.png$/);
    await expect(
      page.getByRole('img', { name: 'Không tải được ảnh: Tin thiếu ảnh' }),
    ).toBeVisible();
    const filters = page.getByRole('region', { name: 'Lọc tin tức' });
    const bounds = await filters.boundingBox();
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width);
    const input = filters.getByRole('searchbox');
    expect((await input.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    expect(
      await input.evaluate((element) => parseFloat(getComputedStyle(element).paddingLeft)),
    ).toBeGreaterThanOrEqual(40);
    await page.screenshot({ path: `test-results/admin-news-${width}.png` });
    await filters.getByRole('combobox').selectOption('draft');
    await expect(page.getByText('Tin có ảnh', { exact: true })).toHaveCount(0);
    await filters.getByRole('button', { name: 'Xóa bộ lọc' }).click();
    await expect(page.getByText('Tin có ảnh', { exact: true })).toBeVisible();
  });
}

test('package search and status filters retain their behavior', async ({ page }) => {
  await page.goto('/admin/packages');
  const filters = page.getByRole('region', { name: 'Lọc gói cước' });
  await filters.getByRole('searchbox').fill('C90');
  await expect(page.getByRole('cell', { name: 'Gói đang bán', exact: true })).toBeVisible();
  await expect(page.getByRole('cell', { name: 'Gói đã ẩn', exact: true })).toHaveCount(0);
  await filters.getByRole('button', { name: 'Xóa bộ lọc' }).click();
  await filters.getByRole('combobox').selectOption('hidden');
  await expect(page.getByRole('cell', { name: 'Gói đã ẩn', exact: true })).toBeVisible();
  await page.screenshot({ path: 'test-results/admin-packages.png' });
});

test('job rich text loads the selected record, saves formatting and resets after save', async ({
  page,
}) => {
  let saved: Record<string, string> | undefined;
  await page.route(/\/admin\/jobs\/2$/, async (route) => {
    saved = route.request().postDataJSON();
    await route.fulfill({ json: { success: true, data: { ...jobs[1], ...saved } } });
  });
  await page.goto('/admin/jobs');
  const description = page.getByRole('textbox', { name: 'Mô tả công việc', exact: true });
  await expect(description).toHaveAttribute('contenteditable', 'true');
  await page.getByRole('button', { name: 'Sửa vị trí Vị trí 1', exact: true }).click();
  await expect(description.locator('strong')).toHaveText('Mô tả 1');
  await page.getByRole('button', { name: 'Sửa vị trí Vị trí 2', exact: true }).click();
  await expect(description.locator('strong')).toHaveText('Mô tả 2');
  await expect(
    page.getByRole('textbox', { name: 'Yêu cầu', exact: true }).locator('li'),
  ).toHaveText('Yêu cầu 2');
  await description.click();
  await description.press('ControlOrMeta+a');
  await page.getByRole('button', { name: 'Xóa định dạng', exact: true }).first().click();
  await description.fill('Nội dung mới');
  await description.press('ControlOrMeta+a');
  await description.press('ControlOrMeta+b');
  await expect(description.locator('strong')).toHaveText('Nội dung mới');
  await description.scrollIntoViewIfNeeded();
  await page.screenshot({ path: 'test-results/admin-jobs-richtext.png' });
  await page.getByRole('button', { name: 'Lưu vị trí', exact: true }).click();
  await expect.poll(() => saved?.description).toContain('<strong>Nội dung mới</strong>');
  expect(saved?.requirements).toContain('<li>');
  expect(saved?.benefits).toContain('Quyền lợi 2');
  await expect(description).toHaveText('');
});
