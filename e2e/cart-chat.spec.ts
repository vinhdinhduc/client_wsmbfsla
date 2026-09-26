import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.route('**/public/settings', (route) =>
    route.fulfill({
      json: {
        success: true,
        data: { ai_chatbot_enabled: 'true', contact_widget_enabled: 'false' },
      },
    }),
  );
  await page.addInitScript(() => {
    localStorage.setItem(
      'mfsl_cookie_consent_v1',
      JSON.stringify({ value: 'necessary', at: new Date().toISOString() }),
    );
    sessionStorage.setItem('mfsl_chat_intro_dismissed', 'true');
    localStorage.setItem(
      'mfsl_cart_items',
      JSON.stringify([
        {
          key: 'sim-1',
          type: 'sim',
          reference_id: 1,
          name: '0762468888',
          price: 4800000,
          image: null,
        },
        {
          key: 'goi_cuoc-2',
          type: 'goi_cuoc',
          reference_id: 2,
          name: 'Gói data 5G',
          price: 120000,
          image: null,
        },
        {
          key: 'solution_plan-3',
          type: 'solution_plan',
          reference_id: 3,
          name: 'Gói giải pháp doanh nghiệp',
          price: null,
          image: null,
        },
      ]),
    );
  });
});

for (const width of [390, 1440]) {
  test(`cart drawer at ${width}px: icons, removal, scroll lock and Escape`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/chinh-sach-bao-mat');
    await page.getByRole('button', { name: 'Xem giỏ hàng' }).click();
    const dialog = page.getByRole('dialog', { name: 'Giỏ hàng', exact: true });
    await expect(dialog).toBeVisible();
    await expect(dialog.locator('.lucide-card-sim')).toBeVisible();
    await expect(dialog.locator('.lucide-wifi')).toBeVisible();
    await expect(dialog.getByText('Liên hệ tư vấn')).toBeVisible();
    expect(await page.evaluate(() => document.body.style.overflow)).toBe('hidden');
    const bounds = await dialog.boundingBox();
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.height).toBeLessThanOrEqual(900);
    await page.screenshot({ path: `test-results/cart-${width}.png` });
    await dialog.getByRole('button', { name: 'Xóa 0762468888 khỏi giỏ hàng' }).click();
    await expect(dialog.getByText('0762468888')).toHaveCount(0);
    await dialog.getByRole('button', { name: 'Xóa Gói data 5G khỏi giỏ hàng' }).click();
    await dialog
      .getByRole('button', { name: 'Xóa Gói giải pháp doanh nghiệp khỏi giỏ hàng' })
      .click();
    await expect(dialog.getByRole('heading', { name: 'Giỏ hàng đang trống' })).toBeVisible();
    await expect(dialog.getByRole('link', { name: 'Khám phá SIM số' })).toHaveAttribute(
      'href',
      '/sim-so-dep',
    );
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    expect(await page.evaluate(() => document.body.style.overflow)).not.toBe('hidden');
  });
}

for (const width of [390, 1440]) {
  test(`chat at ${width}px preserves history, starts a new session, and offers retry on failure`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    const sessions: string[] = [];
    let fail = false;
    await page.route('**/chat', async (route) => {
      sessions.push(route.request().postDataJSON().session_id);
      await route.fulfill({
        status: fail ? 503 : 200,
        json: fail
          ? { success: false, message: 'Máy chủ đang bận' }
          : {
              success: true,
              data: {
                reply: 'Gói cước phù hợp với nhu cầu của bạn.\nBạn cần bao nhiêu data?',
                status: 'answered',
                sources: [
                  { title: 'Gói C90N', href: '/goi-cuoc/c90n' },
                  { title: 'Không được hiển thị', href: 'javascript:alert(1)' },
                ],
              },
            },
      });
    });
    await page.goto('/chinh-sach-bao-mat');
    await page.getByRole('button', { name: 'Chat với AI', exact: true }).click();
    const chat = page.getByRole('dialog', { name: 'Trợ lý AI MobiFone Sơn La' });
    await chat.getByRole('button', { name: 'Gói cước nào rẻ?' }).click();
    await expect(chat.getByText(/Bạn cần bao nhiêu data/)).toBeVisible();
    await expect(chat.getByRole('link', { name: 'Gói C90N' })).toHaveAttribute(
      'href',
      '/goi-cuoc/c90n',
    );
    await expect(chat.getByRole('link', { name: 'Không được hiển thị' })).toHaveCount(0);
    await page.reload();
    await page.getByRole('button', { name: 'Chat với AI', exact: true }).click();
    await expect(chat.getByText(/Bạn cần bao nhiêu data/)).toBeVisible();
    await chat.getByRole('button', { name: 'Xóa hội thoại' }).click();
    await expect(chat.getByText(/Bạn cần bao nhiêu data/)).toHaveCount(0);
    fail = true;
    await chat.getByRole('textbox', { name: 'Câu hỏi cho trợ lý AI' }).fill('Tư vấn SIM số đẹp');
    await chat.getByRole('button', { name: 'Gửi', exact: true }).click();
    await expect(chat.getByRole('button', { name: 'Thử gửi lại' })).toBeVisible();
    expect(sessions[1]).not.toBe(sessions[0]);
    fail = false;
    await chat.getByRole('button', { name: 'Thử gửi lại' }).click();
    await expect(chat.getByText(/Bạn cần bao nhiêu data/)).toBeVisible();
    expect(sessions[2]).toBe(sessions[1]);
    const bounds = await chat.boundingBox();
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.y).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width);
    await page.screenshot({ path: `test-results/chat-${width}.png` });
  });
}

test('provider unavailable offers human support and retry without exposing credentials', async ({
  page,
}) => {
  await page.route('**/chat', (route) =>
    route.fulfill({
      json: {
        success: true,
        data: {
          reply: 'Trợ lý đang gián đoạn. Vui lòng liên hệ nhân viên.',
          status: 'unavailable',
          sources: [],
        },
      },
    }),
  );
  await page.goto('/chinh-sach-bao-mat');
  await page.getByRole('button', { name: 'Chat với AI', exact: true }).click();
  const chat = page.getByRole('dialog', { name: 'Trợ lý AI MobiFone Sơn La' });
  await chat.getByRole('button', { name: 'Gói cước nào rẻ?' }).click();
  await expect(chat.getByRole('link', { name: 'Liên hệ nhân viên hỗ trợ' })).toHaveAttribute(
    'href',
    '/lien-he',
  );
  await expect(chat.getByRole('button', { name: 'Thử gửi lại' })).toBeVisible();
});
