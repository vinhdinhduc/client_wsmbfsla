import { test, expect } from '@playwright/test';
test.setTimeout(120_000);

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.route('**/public/settings', (route) =>
    route.fulfill({
      json: {
        success: true,
        data: { ai_chatbot_enabled: 'false', contact_widget_enabled: 'false' },
      },
    }),
  );
  await page.addInitScript(() => {
    localStorage.setItem('mfsl_cookie_consent_v1', JSON.stringify({ value: 'necessary' }));
    localStorage.setItem(
      'mfsl_cart_items',
      JSON.stringify([
        {
          key: 'sim-1',
          type: 'sim',
          reference_id: 1,
          name: '0901234567',
          price: 100000,
          image: null,
        },
      ]),
    );
  });
});

for (const width of [390, 1440]) {
  for (const [path, sections] of [
    ['dieu-khoan-su-dung', 7],
    ['chinh-sach-bao-mat', 8],
  ] as const) {
    test(`${path}: headings, TOC, anchors and print at ${width}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`/${path}`);
      const article = page.locator('article');
      await expect(article.getByRole('heading', { level: 2 })).toHaveCount(sections);
      await expect(article.getByText(/Cập nhật lần cuối: 27\/09\/2026/)).toBeVisible();
      await expect(article.getByText(/Phiên bản: v1.0/)).toBeVisible();
      const toc = page.locator('#legal-toc');
      if (width < 768) {
        await expect(toc).toBeHidden();
        await page.getByRole('button', { name: 'Mục lục' }).click();
      }
      await toc.getByRole('link').last().click();
      await expect(page).toHaveURL(new RegExp(`#muc-${sections}$`));
      await expect(toc.locator('a').last()).toHaveAttribute('aria-current', 'location');
      await page.evaluate(() => window.scrollTo(0, 0));
      await expect(toc.locator('a').first()).toHaveAttribute('aria-current', 'location');
      await page.evaluate(() => {
        (window as any).printCalls = 0;
        window.print = () => {
          (window as any).printCalls++;
        };
      });
      await page.getByRole('button', { name: 'In trang này' }).click();
      expect(await page.evaluate(() => (window as any).printCalls)).toBe(1);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      await page.screenshot({ path: `test-results/${path}-${width}.png`, fullPage: true });
    });
  }
  test(`OTP flow supports paste, cooldown, strong password and redirect at ${width}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.route('**/auth/forgot-password', (route) => {
      expect(route.request().postDataJSON().identifier).toBe('tester');
      return route.fulfill({
        json: {
          success: true,
          data: {
            challenge: 'a'.repeat(64),
            expires_in: 300,
            resend_after: 60,
            message: 'Nếu tài khoản tồn tại, mã OTP đã được gửi tới email đăng ký',
          },
        },
      });
    });
    await page.route('**/auth/verify-reset-otp', (route) => {
      expect(route.request().postDataJSON().otp).toBe('123456');
      return route.fulfill({ json: { success: true, data: { reset_token: 'b'.repeat(64) } } });
    });
    await page.route('**/auth/reset-password', (route) => {
      expect(route.request().postDataJSON()).toMatchObject({
        password: 'NewPassword123',
        confirm_password: 'NewPassword123',
        reset_token: 'b'.repeat(64),
      });
      return route.fulfill({ json: { success: true, data: null } });
    });
    await page.goto('/admin/login');
    await page.getByRole('button', { name: 'Quên mật khẩu?' }).click();
    await page.getByLabel('Email hoặc tên đăng nhập').fill('tester');
    await page.getByRole('button', { name: 'Gửi mã OTP' }).click();
    await expect(page.getByRole('button', { name: /Gửi lại mã/ })).toBeDisabled();
    await expect(page.getByText(/Hết hạn sau: 0[45]:/)).toBeVisible();
    await page.getByLabel('Chữ số OTP 1', { exact: true }).fill('123456');
    await expect(page.getByLabel('Chữ số OTP 6', { exact: true })).toBeFocused();
    await page.screenshot({ path: `test-results/otp-${width}.png` });
    await page.getByRole('button', { name: 'Xác nhận OTP' }).click();
    await page.getByLabel('Mật khẩu mới', { exact: true }).fill('weak');
    await expect(
      page.getByRole('button', { name: 'Đặt lại mật khẩu', exact: true }),
    ).toBeDisabled();
    await page.getByLabel('Mật khẩu mới', { exact: true }).fill('NewPassword123');
    await page.getByLabel('Xác nhận mật khẩu').fill('NewPassword123');
    await page.getByRole('button', { name: 'Đặt lại mật khẩu', exact: true }).click();
    await expect(page.getByRole('status')).toContainText('Đặt lại mật khẩu thành công');
    await expect(page).toHaveURL(/\/admin\/login$/);
  });
}
test('contact/newsletter consent is required, links open another tab and preserve form input', async ({
  page,
}) => {
  await page.goto('/lien-he');
  const form = page
    .locator('form')
    .filter({ has: page.getByRole('button', { name: 'Gửi liên hệ' }) });
  const submit = form.getByRole('button', { name: 'Gửi liên hệ' });
  await expect(submit).toBeDisabled();
  await form.getByLabel('Họ tên').fill('Khách kiểm thử');
  const checkbox = form.getByRole('checkbox');
  await checkbox.check();
  await expect(submit).toBeEnabled();
  const popupPromise = page.waitForEvent('popup');
  await form.getByRole('link', { name: 'Điều khoản sử dụng' }).click();
  const popup = await popupPromise;
  await popup.waitForURL('**/dieu-khoan-su-dung');
  await popup.close();
  await expect(form.getByLabel('Họ tên')).toHaveValue('Khách kiểm thử');
  await expect(checkbox).toBeChecked();
  await checkbox.uncheck();
  await expect(submit).toBeDisabled();
  const footer = page.locator('footer');
  await expect(footer.getByRole('button', { name: 'Đăng ký', exact: true })).toBeDisabled();
  await footer.getByRole('checkbox').check();
  await expect(footer.getByRole('button', { name: 'Đăng ký', exact: true })).toBeEnabled();
});
test('newsletter sends explicit consent and cart submit is disabled until acceptance', async ({
  page,
}) => {
  await page.route('**/newsletter/subscribe', (route) => {
    expect(route.request().postDataJSON()).toEqual({
      email: 'test@example.com',
      agreed_terms: true,
    });
    return route.fulfill({ json: { success: true, data: { status: 'pending' } } });
  });
  await page.goto('/chinh-sach-bao-mat');
  const footer = page.locator('footer');
  await footer.getByPlaceholder('Email của bạn').fill('test@example.com');
  await footer.getByRole('checkbox').check();
  await footer.getByRole('button', { name: 'Đăng ký', exact: true }).click();
  await expect(footer.getByRole('checkbox')).not.toBeChecked();
  await page.goto('/gio-hang?step=customer');
  const checkbox = page.locator('main input[name="agreed_terms"]').first();
  await expect(checkbox).toBeVisible();
  const form = page.locator('main form').filter({ has: page.locator('input[name="agreed_terms"]') });
  await expect(form.locator('button[type="submit"]')).toBeDisabled();
  await checkbox.check();
  await expect(form.locator('button[type="submit"]')).toBeEnabled();
});
