import { test, expect, type Page } from '@playwright/test';
import jobs from './fixtures/recruitment.json';
import { writeFileSync } from 'node:fs';
const slug = '/tuyen-dung/giao-dich-vien-cua-hang-trung-tam';
const validCv = {
  name: 'ho-so.pdf',
  mimeType: 'application/pdf',
  buffer: Buffer.from('%PDF-1.7\nCV kiểm thử\n%%EOF'),
};
async function fill(page: Page) {
  await page.getByLabel('Họ và tên', { exact: false }).fill('Ứng viên kiểm thử');
  await page.getByLabel('Số điện thoại', { exact: false }).fill('+84 912 345 678');
  await page
    .locator('#application')
    .getByRole('textbox', { name: /^Email/ })
    .fill('candidate@example.com');
  await page.getByLabel('Giới thiệu về bạn').fill('Kinh nghiệm chăm sóc khách hàng.');
  await page.locator('input[type=file]').setInputFiles(validCv);
  await page.locator('#job-consent').check();
}
test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => {
    localStorage.setItem(
      'mfsl_cookie_consent_v1',
      JSON.stringify({ value: 'necessary', at: new Date().toISOString() }),
    );
    (window as any).grecaptcha = {
      ready: (cb: () => void) => cb(),
      execute: () => Promise.resolve('e2e-local-token'),
    };
  });
  await page.route('**/recaptcha/**', (route) => route.abort());
  await page.route('**/public/current-duty-staff', (route) =>
    route.fulfill({ json: { success: true, data: null } }),
  );
});
for (const width of [375, 768, 1024, 1440]) {
  test(`responsive content, CTA and accessible form at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(slug);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(jobs[0].title);
    const requirements = page
      .locator('section')
      .filter({ has: page.getByRole('heading', { name: 'Yêu cầu', exact: true }) });
    const benefits = page
      .locator('section')
      .filter({ has: page.getByRole('heading', { name: 'Quyền lợi', exact: true }) });
    await expect(requirements.locator('li')).toHaveCount(4);
    await expect(benefits.locator('li')).toHaveCount(4);
    await expect(benefits.locator('li').first()).toContainText('7 - 10 triệu đồng/tháng');
    await expect(page.locator('#job-consent')).not.toBeChecked();
    await expect(page.getByRole('button', { name: 'Gửi hồ sơ ứng tuyển' })).toBeDisabled();
    const form = page.locator('#application');
    const sticky = page.locator('[class*="mobileApply"]');
    if (width < 1024) await expect(sticky).toBeVisible();
    else await expect(page.getByRole('complementary', { name: 'Tóm tắt vị trí' })).toBeVisible();
    await page.getByRole('link', { name: 'Ứng tuyển ngay', exact: true }).first().click();
    await expect(form).toBeFocused();
    await expect(page.getByRole('button', { name: 'Chọn tệp', exact: true })).toBeVisible();
    if (width < 1024) await expect(sticky).toHaveCount(0);
    const top = (await form.boundingBox())!.y;
    expect(top).toBeGreaterThanOrEqual(85);
    const inputHeight = (await page.getByLabel('Số điện thoại', { exact: false }).boundingBox())!
      .height;
    expect(inputHeight).toBeGreaterThanOrEqual(44);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({ path: `docs/screenshots/recruitment-${width}.png`, fullPage: true });
  });
}
test('inline validation, file errors, counter, failed request preservation and success card', async ({
  page,
}) => {
  await page.goto(slug);
  await page.getByLabel('Họ và tên', { exact: false }).fill('A');
  await page.getByLabel('Số điện thoại', { exact: false }).fill('0212345678');
  await page
    .locator('#application')
    .getByRole('textbox', { name: /^Email/ })
    .fill('bad');
  await page.getByLabel('Giới thiệu về bạn').click();
  await expect(page.getByText('Họ tên cần ít nhất 2 ký tự.')).toBeVisible();
  await expect(page.getByText('Nhập địa chỉ email hợp lệ.')).toBeVisible();
  await page
    .locator('input[type=file]')
    .setInputFiles({ name: 'cv.exe', mimeType: 'application/pdf', buffer: Buffer.from('MZ') });
  await expect(page.getByText('Chọn CV đúng định dạng PDF hoặc DOCX.')).toBeVisible();
  await page.locator('input[type=file]').setInputFiles({
    name: 'large.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.alloc(5 * 1024 * 1024 + 1),
  });
  await expect(page.getByText('CV vượt quá 5MB. Vui lòng chọn tệp nhỏ hơn.')).toBeVisible();
  await fill(page);
  await expect(
    page.getByText(`${'Kinh nghiệm chăm sóc khách hàng.'.length}/1000`, { exact: true }),
  ).toBeVisible();
  let count = 0;
  await page.route('**/public/job-applications', async (route) => {
    count++;
    expect(route.request().postDataBuffer()!.toString()).toContain('name="job_id"');
    await new Promise((resolve) => setTimeout(resolve, 250));
    await route.fulfill(
      count === 1
        ? { status: 503, json: { success: false, message: 'SQL leaked detail' } }
        : { status: 201, json: { success: true, data: { id: 42, code: 'UV-E2E-42' } } },
    );
  });
  await page.getByRole('button', { name: 'Gửi hồ sơ ứng tuyển' }).click();
  await expect(page.getByRole('button', { name: 'Đang gửi…' })).toBeDisabled();
  await expect(page.locator('#application').getByRole('alert')).toContainText(
    'Máy chủ chưa thể nhận hồ sơ',
  );
  await expect(page.locator('#application').getByRole('alert')).not.toContainText('SQL');
  await expect(page.getByLabel('Họ và tên', { exact: false })).toHaveValue('Ứng viên kiểm thử');
  await expect(page.getByText('ho-so.pdf', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Gửi hồ sơ ứng tuyển' }).click();
  await expect(page.getByRole('heading', { name: 'Đã gửi hồ sơ thành công' })).toBeVisible();
  await expect(page.getByText('UV-E2E-42', { exact: true })).toBeVisible();
  await expect(page.locator('form#application')).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Ứng tuyển ngay', exact: true })).toHaveCount(0);
  expect(count).toBe(2);
});
for (const closed of ['vi-tri-het-han', 'vi-tri-tam-dung']) {
  test(`closed job ${closed} remains available and suggests open positions`, async ({ page }) => {
    const response = await page.goto(`/tuyen-dung/${closed}`);
    expect(response!.status()).toBe(200);
    await expect(page.getByRole('heading', { name: 'Vị trí đã ngừng nhận hồ sơ' })).toBeVisible();
    await expect(page.locator('form#application')).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Ứng tuyển ngay', exact: true })).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Vị trí khác đang tuyển' })).toBeVisible();
    if (closed === 'vi-tri-het-han')
      await expect(page.locator('meta[name=robots]')).toHaveAttribute('content', /noindex/);
  });
}
test('share controls, JSON-LD and canonical metadata', async ({ page }) => {
  await page.goto(slug);
  await expect(page).toHaveTitle(/Giao dịch viên cửa hàng Trung tâm/);
  await expect(page.locator('link[rel=canonical]')).toHaveAttribute(
    'href',
    /tuyen-dung\/giao-dich-vien-cua-hang-trung-tam$/,
  );
  const schemas = await page.locator('script[type="application/ld+json"]').allTextContents();
  const posting = schemas
    .flatMap((value) => JSON.parse(value))
    .find((value) => value['@type'] === 'JobPosting');
  expect(posting.employmentType).toBe('FULL_TIME');
  expect(posting.baseSalary.currency).toBe('VND');
  await page.getByRole('button', { name: 'Chia sẻ', exact: true }).click();
  await expect(page.getByRole('link', { name: 'Facebook', exact: true })).toHaveAttribute(
    'rel',
    'noopener noreferrer',
  );
  await page.getByRole('button', { name: 'Zalo', exact: true }).click();
  const image = await page.request.get('/tuyen-dung/opengraph-image');
  expect(image.ok()).toBe(true);
  expect(image.headers()['content-type']).toContain('image/png');
  writeFileSync('docs/screenshots/recruitment-og.png', await image.body());
});
test('warns before leaving an unfinished form and supports dark mode', async ({ page }) => {
  await page.goto('/tuyen-dung');
  await page.getByRole('link', { name: 'Xem chi tiết', exact: true }).first().click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(jobs[0].title);
  await page.getByLabel('Họ và tên', { exact: false }).fill('Đang nhập');
  let warning = '';
  page.once('dialog', async (dialog) => {
    warning = dialog.message();
    await dialog.dismiss();
  });
  await page.getByRole('link', { name: 'Xem vị trí', exact: false }).first().click();
  expect(warning).toContain('Bạn chưa gửi hồ sơ');
  await expect(page.getByLabel('Họ và tên', { exact: false })).toHaveValue('Đang nhập');
  await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await page.screenshot({ path: 'docs/screenshots/recruitment-dark.png', fullPage: true });
  const historyWarning = page.waitForEvent('dialog');
  page.once('dialog', async (dialog) => {
    await dialog.dismiss();
  });
  await page.evaluate(() => history.back());
  const backDialog = await historyWarning;
  expect(['confirm', 'beforeunload']).toContain(backDialog.type());
  if (backDialog.type() === 'confirm') expect(backDialog.message()).toContain('Bạn chưa gửi hồ sơ');
  await expect(page.getByLabel('Họ và tên', { exact: false })).toHaveValue('Đang nhập');
});
test('drag-and-drop CV selection can be removed without losing entered fields', async ({
  page,
}) => {
  await page.goto(slug);
  await page.getByLabel('Họ và tên', { exact: false }).fill('Ứng viên kéo thả');
  const files = await page.evaluateHandle(() => {
    const transfer = new DataTransfer();
    transfer.items.add(
      new File(['%PDF-1.7\nCV\n%%EOF'], 'keo-tha.pdf', { type: 'application/pdf' }),
    );
    return transfer;
  });
  await page.locator('[class*="_dropzone_"]').dispatchEvent('drop', { dataTransfer: files });
  await expect(page.getByText('keo-tha.pdf', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Xóa tệp CV', exact: true }).click();
  await expect(page.getByText('keo-tha.pdf', { exact: true })).toHaveCount(0);
  await expect(page.getByLabel('Họ và tên', { exact: false })).toHaveValue('Ứng viên kéo thả');
});
test('admin sidebar logo, unpublished preview and linked application CV download', async ({
  page,
  context,
  baseURL,
}) => {
  const user = {
    id: 1,
    role: 'admin',
    full_name: 'Quản trị kiểm thử',
    username: 'ui-test',
    status: 'active',
  };
  const token = `ui.${Buffer.from(JSON.stringify({ role: 'admin', exp: 4102444800 })).toString('base64url')}.fixture`;
  await context.addCookies([{ name: 'mfsl_token', value: token, url: baseURL! }]);
  await page.addInitScript(
    ({ user, token }) => {
      localStorage.setItem('mfsl_auth_token', token);
      localStorage.setItem('mfsl_auth_user', JSON.stringify(user));
    },
    { user, token },
  );
  await page.route('**/api/**', async (route) => {
    const pathname = new URL(route.request().url()).pathname;
    if (pathname.endsWith('/applications/42/cv')) {
      await route.fulfill({ contentType: 'application/pdf', body: validCv.buffer });
      return;
    }
    const data = pathname.endsWith('/auth/me')
      ? user
      : pathname.endsWith('/admin/jobs')
        ? jobs.slice(0, 1)
        : pathname.endsWith('/admin/jobs/applications')
          ? [
              {
                id: 42,
                code: 'UV-E2E-42',
                full_name: 'Ứng viên kiểm thử',
                phone: '0912345678',
                email: 'candidate@example.com',
                status: 'new',
                cv_mime: 'application/pdf',
                job: { id: 1002, title: jobs[0].title },
              },
            ]
          : [];
    await route.fulfill({ json: { success: true, data } });
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/admin/jobs');
  await expect(
    page.getByRole('main').getByRole('heading', { name: 'Tuyển dụng', exact: true }),
  ).toBeVisible();
  const logo = page
    .locator('#admin-navigation')
    .getByRole('img', { name: 'MobiFone', exact: true });
  await expect(logo).toBeVisible();
  await page.screenshot({ path: 'docs/screenshots/recruitment-admin-logo.png', fullPage: true });
  expect((await logo.boundingBox())!.y).toBeGreaterThan(600);
  await page.getByRole('button', { name: `Sửa vị trí ${jobs[0].title}` }).click();
  await page.getByRole('button', { name: 'Xem trước tin', exact: true }).click();
  await expect(page.locator('#job-preview li')).toHaveCount(11);
  await expect(page.locator('#applications')).toContainText(jobs[0].title);
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Tải CV', exact: true }).click();
  expect((await download).suggestedFilename()).toBe('cv-UV-E2E-42.pdf');
  await page.screenshot({ path: 'docs/screenshots/recruitment-admin-logo.png', fullPage: true });
  await page.setViewportSize({ width: 375, height: 900 });
  await page.getByRole('button', { name: 'Mở menu', exact: true }).click();
  await expect(logo).toBeVisible();
  expect((await logo.boundingBox())!.y).toBeGreaterThan(600);
  await page.screenshot({ path: 'docs/screenshots/recruitment-admin-mobile-logo.png' });
});
