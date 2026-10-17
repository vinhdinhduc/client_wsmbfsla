import { test, expect, type Page } from '@playwright/test';

const settings = {
  ai_chatbot_enabled: 'true',
  contact_widget_enabled: 'true',
  hotline: '0212 3758 758',
  site_logo: '/logo_ngan_cropped.png',
  working_hours: 'Thứ Hai – Chủ Nhật: 07:30 – 19:00',
  footer_zalo_url: 'https://zalo.me/02123758758',
};
const dialog = (page: Page) => page.getByRole('dialog', { name: 'Trợ lý AI MobiFone Sơn La' });
async function open(page: Page) {
  await page.goto('/chinh-sach-bao-mat');
  await page.getByRole('button', { name: 'Chat với AI', exact: true }).click();
  await expect(dialog(page)).toBeVisible();
  await expect(dialog(page).getByRole('textbox', { name: 'Câu hỏi cho trợ lý AI' })).toBeFocused();
}
test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() =>
    localStorage.setItem(
      'mfsl_cookie_consent_v1',
      JSON.stringify({ value: 'necessary', at: new Date().toISOString() }),
    ),
  );
  await page.route('**/public/settings', (route) =>
    route.fulfill({ json: { success: true, data: settings } }),
  );
  await page.route('**/public/current-duty-staff', (route) =>
    route.fulfill({ json: { success: true, data: null } }),
  );
  await page.route('**/public/chat', (route) =>
    route.fulfill({
      json: {
        success: true,
        data: {
          answer_id: 41,
          reply:
            '**Thông tin đã xác nhận**\n- Gọi 0212 3758 758\n- [Chính sách](https://example.com/privacy)',
          status: 'answered',
          sources: [],
        },
      },
    }),
  );
});

for (const width of [390, 1440]) {
  test(`welcome, keyboard, menu, history and confirmation at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const chunks: string[] = [];
    page.on('request', (request) => {
      if (request.resourceType() === 'script') chunks.push(request.url());
    });
    await page.goto('/chinh-sach-bao-mat');
    await expect(page.getByText('Hỏi trợ lý', { exact: true })).toBeVisible();
    expect(chunks.some((url) => url.includes('ChatPanel'))).toBe(false);
    await page.getByRole('button', { name: 'Chat với AI', exact: true }).click();
    const chat = dialog(page);
    await expect(chat).toBeVisible();
    const textbox = chat.getByRole('textbox', { name: 'Câu hỏi cho trợ lý AI' });
    await expect(textbox).toBeFocused();
    const greeting = await chat.getByText(/Xin chào! Tôi là trợ lý/).boundingBox();
    const suggestion = await chat.getByRole('button', { name: 'Gói cước nào rẻ?' }).boundingBox();
    expect(suggestion!.y).toBeGreaterThan(greeting!.y + greeting!.height);
    await expect(chat.getByRole('button', { name: 'Gửi', exact: true })).toBeDisabled();
    await textbox.fill('Hotline');
    await expect(chat.getByRole('button', { name: 'Gói cước nào rẻ?' })).toHaveCount(0);
    await textbox.press('Shift+Enter');
    await textbox.type('Sơn La');
    await expect(textbox).toHaveValue('Hotline\nSơn La');
    await textbox.press('Enter');
    await expect(chat.locator('strong').filter({ hasText: 'Thông tin đã xác nhận' })).toBeVisible();
    await expect(chat.getByRole('link', { name: '0212 3758 758', exact: true })).toHaveAttribute(
      'href',
      'tel:02123758758',
    );
    await expect(chat.getByRole('link', { name: 'Chính sách', exact: true })).toHaveAttribute(
      'target',
      '_blank',
    );
    await chat.getByRole('button', { name: 'Tùy chọn hội thoại' }).click();
    await expect(chat.getByRole('menuitem', { name: 'Gọi hotline' })).toHaveAttribute(
      'href',
      'tel:02123758758',
    );
    await page.keyboard.press('Escape');
    await expect(chat.getByRole('menu')).toHaveCount(0);
    await chat.getByRole('button', { name: 'Cuộc trò chuyện mới' }).click();
    await expect(chat.getByRole('alertdialog')).toBeVisible();
    await chat.getByRole('button', { name: 'Giữ hội thoại' }).click();
    await expect(chat.getByText('Hotline\nSơn La', { exact: true })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(chat).not.toBeVisible();
    await expect(page.getByRole('button', { name: 'Chat với AI', exact: true })).toBeFocused();
    await page.reload();
    await page.getByRole('button', { name: 'Chat với AI', exact: true }).click();
    await expect(chat.getByText('Hotline\nSơn La', { exact: true })).toBeVisible();
    await chat.getByRole('button', { name: 'Cuộc trò chuyện mới' }).click();
    await chat.getByRole('button', { name: 'Xóa và bắt đầu mới' }).click();
    await expect(chat.getByText('Hotline\nSơn La', { exact: true })).toHaveCount(0);
    await expect(chat.getByRole('button', { name: 'Gói cước nào rẻ?' })).toBeVisible();
    const bounds = (await chat.boundingBox())!;
    expect(bounds.x).toBeGreaterThanOrEqual(0);
    expect(bounds.y).toBeGreaterThanOrEqual(0);
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(width);
    if (width < 480) {
      expect(bounds.height).toBe(900);
      await expect(page.locator('[data-contact-buttons]')).not.toBeVisible();
    } else {
      const controls = (await page.locator('[data-contact-buttons]').boundingBox())!;
      expect(bounds.x + bounds.width).toBeLessThan(controls.x);
    }
    await page.screenshot({ path: `test-results/chat-widget-${width}.png` });
  });
}

test('safe Markdown, raw HTML and unsafe links remain inert', async ({ page }) => {
  await page.route('**/public/chat', (route) =>
    route.fulfill({
      json: {
        success: true,
        data: {
          answer_id: 42,
          reply:
            '<script>window.chatXss=1</script> <img src=x onerror=alert(1)>\n[Unsafe](javascript:alert(1))\n[Data](data:text/html,boom)\n**An toàn**\n1. Gọi 0212.3758.758',
          status: 'answered',
          sources: [{ title: 'Unsafe source', href: 'javascript:alert(1)' }],
        },
      },
    }),
  );
  await open(page);
  const chat = dialog(page);
  const question = '<svg onload=alert(1)> hotline';
  await chat.getByRole('textbox', { name: 'Câu hỏi cho trợ lý AI' }).fill(question);
  await chat.getByRole('button', { name: 'Gửi', exact: true }).click();
  await expect(chat.getByText(question, { exact: true })).toBeVisible();
  await expect(chat.locator('strong').filter({ hasText: 'An toàn' })).toBeVisible();
  expect(
    await page.evaluate(() => (window as unknown as Record<string, unknown>).chatXss),
  ).toBeUndefined();
  await expect(
    chat.locator('script, img[onerror], svg[onload], a[href^="javascript:"], a[href^="data:"]'),
  ).toHaveCount(0);
  await expect(chat.getByRole('link', { name: 'Unsafe source' })).toHaveCount(0);
});

test('placeholder answer and unavailable answer offer human support', async ({ page }) => {
  await page.route('**/public/chat', (route) =>
    route.fulfill({
      json: {
        success: true,
        data: {
          reply: 'Địa chỉ: [ĐIỀN: địa chỉ]. Giá {{price}}',
          answer_id: 43,
          status: 'answered',
          sources: [],
        },
      },
    }),
  );
  await open(page);
  const chat = dialog(page);
  await chat.getByRole('button', { name: 'Gói cước nào rẻ?' }).click();
  await expect(chat.getByText(/Tôi chưa có thông tin đã được xác nhận/)).toBeVisible();
  await expect(chat.getByText(/\[ĐIỀN:|\{\{price/)).toHaveCount(0);
  await chat.getByRole('button', { name: 'Gặp nhân viên tư vấn', exact: true }).first().click();
  await expect(chat.getByRole('link', { name: 'Gọi 0212 3758 758' })).toHaveAttribute(
    'href',
    'tel:02123758758',
  );
  await expect(chat.getByText(/Giờ làm việc: Thứ Hai/)).toBeVisible();
});

test('stop cancels waiting, late responses do not appear, unread survives closing', async ({
  page,
}) => {
  let release: () => void = () => {};
  await page.route('**/public/chat', async (route) => {
    await new Promise<void>((resolve) => {
      release = resolve;
    });
    await route
      .fulfill({
        json: {
          success: true,
          data: {
            answer_id: 44,
            reply: 'Câu trả lời sau khi chờ',
            status: 'answered',
            sources: [],
          },
        },
      })
      .catch(() => {});
  });
  await open(page);
  const chat = dialog(page);
  await chat.getByRole('button', { name: 'Gói cước nào rẻ?' }).click();
  await expect(chat.getByRole('status', { name: 'Trợ lý đang soạn tin' })).toBeVisible();
  await expect(chat.getByRole('button', { name: 'Gửi', exact: true })).toHaveCount(0);
  await chat.getByRole('button', { name: 'Dừng trả lời' }).click();
  release();
  await expect(chat.getByText(/Đã dừng chờ câu trả lời/)).toBeVisible();
  await expect(chat.getByText('Câu trả lời sau khi chờ')).toHaveCount(0);
  await chat.getByRole('textbox', { name: 'Câu hỏi cho trợ lý AI' }).fill('Giờ làm việc');
  await chat.getByRole('button', { name: 'Gửi', exact: true }).click();
  await expect(chat.getByRole('status', { name: 'Trợ lý đang soạn tin' })).toBeVisible();
  await chat.getByRole('button', { name: 'Đóng chat' }).click();
  release();
  await expect(page.getByText('Có tin nhắn mới')).toHaveCount(1);
  await page.getByRole('button', { name: 'Chat với AI', exact: true }).click();
  await expect(chat.getByText('Câu trả lời sau khi chờ')).toBeVisible();
});

test('feedback saves against the answer/session and retains optional comment', async ({ page }) => {
  const submissions: Record<string, unknown>[] = [];
  await page.route('**/public/chat/feedback', (route) => {
    submissions.push(route.request().postDataJSON());
    return route.fulfill({ json: { success: true, data: { saved: true } } });
  });
  await open(page);
  const chat = dialog(page);
  await chat.getByRole('button', { name: 'Gói cước nào rẻ?' }).click();
  await chat.getByRole('button', { name: 'Câu trả lời chưa hữu ích' }).click();
  await chat
    .getByRole('textbox', { name: /Câu trả lời chưa đúng ở đâu/ })
    .fill('Cần rõ chu kỳ gói cước');
  await chat.getByRole('button', { name: 'Gửi đánh giá' }).click();
  await expect(chat.getByText('Cảm ơn bạn đã góp ý.')).toBeVisible();
  expect(submissions[0]).toMatchObject({
    answer_id: 41,
    was_helpful: false,
    comment: 'Cần rõ chu kỳ gói cước',
  });
  expect(submissions[0].session_id).toBe(
    await page.evaluate(() => sessionStorage.getItem('mfsl_chat_session_id')),
  );
  await expect(chat.getByRole('button', { name: 'Câu trả lời chưa hữu ích' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
});

test('contact uses chatbot source, validates phone and requires privacy consent', async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.grecaptcha = {
      ready: (callback) => callback(),
      execute: async () => 'widget-test-token',
    };
  });
  await page.route('https://www.google.com/recaptcha/**', (route) =>
    route.fulfill({ contentType: 'text/javascript', body: '' }),
  );
  const submissions: Record<string, unknown>[] = [];
  await page.route('**/public/contacts', (route) => {
    submissions.push(route.request().postDataJSON());
    return route.fulfill({
      status: 201,
      json: { success: true, data: { id: 1, code: 'LH-TEST-00001', source: 'chatbot' } },
    });
  });
  await open(page);
  const chat = dialog(page);
  await chat.getByRole('button', { name: 'Gặp nhân viên tư vấn', exact: true }).click();
  await chat.getByRole('button', { name: 'Để lại thông tin tư vấn' }).click();
  await expect(chat.getByRole('textbox', { name: 'Họ tên', exact: true })).toBeFocused();
  await expect(chat.getByText(/trước khi nhập số điện thoại/)).toBeVisible();
  await expect(chat.getByRole('button', { name: 'Gửi yêu cầu tư vấn' })).toBeDisabled();
  await chat.getByRole('textbox', { name: 'Họ tên', exact: true }).fill('Khách kiểm thử');
  await chat.getByRole('textbox', { name: 'Số điện thoại', exact: true }).fill('123');
  await chat.getByRole('textbox', { name: 'Nhu cầu tư vấn', exact: true }).fill('Tư vấn gói cước');
  await chat.getByRole('checkbox').check();
  await chat.getByRole('button', { name: 'Gửi yêu cầu tư vấn' }).click();
  await expect(chat.getByRole('alert')).toHaveText(/Số điện thoại không hợp lệ/);
  expect(submissions).toHaveLength(0);
  await chat.getByRole('textbox', { name: 'Số điện thoại', exact: true }).fill('0912345678');
  await chat.getByRole('button', { name: 'Gửi yêu cầu tư vấn' }).click();
  await expect(chat.getByText(/Mã liên hệ: LH-TEST-00001/)).toBeVisible();
  expect(submissions[0]).toMatchObject({
    source: 'chatbot',
    email: '',
    agreed_terms: true,
    topic: 'support',
    recaptcha_token: 'widget-test-token',
  });
  expect(await page.evaluate(() => sessionStorage.getItem('mfsl_chat_history'))).not.toContain(
    '0912345678',
  );
});

test('rich cards read current public catalog, never exceed three and support horizontal scroll', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await page.route('**/public/packages/mxh100', (route) =>
    route.fulfill({
      json: {
        success: true,
        data: {
          id: 1,
          code: 'MXH100',
          name: 'MXH100',
          slug: 'mxh100',
          price: 100000,
          duration_value: 30,
          duration_unit: 'ngay',
          data_desc: '1GB/ngày',
          benefits: ['1GB/ngày', '[ĐIỀN: ưu đãi]', 'Ưu đãi gọi'],
          sms_syntax: '[XÁC NHẬN: cú pháp]',
          call_desc: 'Ưu đãi gọi',
          status: 'active',
        },
      },
    }),
  );
  await page.route('**/public/stores', (route) =>
    route.fulfill({
      json: {
        success: true,
        data: [1, 2, 3].map((id) => ({
          id,
          name: `Cửa hàng ${id}`,
          address: `Địa chỉ ${id}`,
          phone: '02123758758',
          opening_hours: '07:30 – 19:00',
          status: 'active',
        })),
      },
    }),
  );
  await page.route('**/public/chat', (route) =>
    route.fulfill({
      json: {
        success: true,
        data: {
          answer_id: 45,
          reply: 'Bạn có thể xem gói MXH100 và các cửa hàng.',
          status: 'answered',
          sources: [
            { title: 'MXH100', href: '/goi-cuoc/mxh100' },
            { title: 'Cửa hàng', href: '/cua-hang' },
          ],
        },
      },
    }),
  );
  await open(page);
  const chat = dialog(page);
  await chat.getByRole('button', { name: 'Gói cước nào rẻ?' }).click();
  const cards = chat.getByLabel('Thông tin dịch vụ hiện hành');
  await expect(cards.locator('article')).toHaveCount(3);
  await expect(cards.getByText(/\[ĐIỀN:|\[XÁC NHẬN:/)).toHaveCount(0);
  await expect(cards.getByText('100.000đ', { exact: false })).toBeVisible();
  expect(await cards.evaluate((element) => element.scrollWidth > element.clientWidth)).toBe(true);
  await expect(cards.getByRole('link', { name: 'Chi tiết' })).toHaveAttribute(
    'href',
    '/goi-cuoc/mxh100',
  );
  await expect(cards.getByRole('link', { name: 'Gọi', exact: true }).first()).toHaveAttribute(
    'href',
    'tel:02123758758',
  );
  await cards.getByRole('button', { name: 'Đăng ký', exact: true }).click();
  await expect(chat.getByRole('textbox', { name: 'Nhu cầu tư vấn', exact: true })).toHaveValue(
    'Tôi muốn đăng ký gói MXH100.',
  );
});

test('new-message control preserves reading position and enforces 500 characters', async ({
  page,
}) => {
  await page.addInitScript(() => {
    sessionStorage.setItem('mfsl_chat_session_id', 'reading-session');
    sessionStorage.setItem(
      'mfsl_chat_history',
      JSON.stringify(
        Array.from({ length: 20 }, (_, index) => ({
          id: `history-${index}`,
          role: index % 2 ? 'assistant' : 'user',
          text: `Tin nhắn ${index}. `.repeat(12),
        })),
      ),
    );
  });
  await open(page);
  const chat = dialog(page);
  const log = chat.getByRole('log');
  await log.evaluate((element) => {
    element.scrollTop = 0;
    element.dispatchEvent(new Event('scroll'));
  });
  const input = chat.getByRole('textbox', { name: 'Câu hỏi cho trợ lý AI' });
  await input.fill('a'.repeat(501));
  await expect(input).toHaveValue('a'.repeat(500));
  await expect(chat.getByText('500/500')).toBeVisible();
  await input.fill('Hotline');
  await chat.getByRole('button', { name: 'Gửi', exact: true }).click();
  await expect(chat.getByRole('button', { name: 'Tin mới' })).toBeVisible();
  expect(await log.evaluate((element) => element.scrollTop)).toBeLessThan(80);
  await chat.getByRole('button', { name: 'Tin mới' }).click();
  await expect(chat.getByText('Thông tin đã xác nhận', { exact: true })).toBeVisible();
});

test('dark mode, viewport keyboard, reduced motion and focus trap at 320px', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await open(page);
  const chat = dialog(page);
  await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await expect(chat).toHaveAttribute('aria-modal', 'true');
  const input = chat.getByRole('textbox', { name: 'Câu hỏi cho trợ lý AI' });
  await expect(input).toBeFocused();
  const focusables = await chat.locator('button:not(:disabled), a[href], textarea').all();
  await focusables.at(-1)!.focus();
  await page.keyboard.press('Tab');
  await expect(chat.getByRole('button', { name: 'Cuộc trò chuyện mới' })).toBeFocused();
  await page.evaluate(() => {
    Object.defineProperty(window.visualViewport!, 'height', { configurable: true, value: 430 });
    Object.defineProperty(window.visualViewport!, 'offsetTop', { configurable: true, value: 20 });
    window.visualViewport!.dispatchEvent(new Event('resize'));
  });
  await expect.poll(async () => (await chat.boundingBox())!.height).toBe(430);
  expect((await chat.boundingBox())!.y).toBe(20);
  expect(await chat.evaluate((element) => getComputedStyle(element).animationName)).toBe('none');
  await page.screenshot({ path: 'test-results/chat-widget-320-dark-keyboard.png' });
});

test('configured suggestions use current admin values', async ({ page }) => {
  await page.route('**/public/settings', (route) =>
    route.fulfill({
      json: {
        success: true,
        data: { ...settings, ai_chatbot_quick_replies: '["Đăng ký SIM/gói cước","Giờ làm việc"]' },
      },
    }),
  );
  await open(page);
  await expect(dialog(page).getByRole('button', { name: 'Đăng ký SIM/gói cước' })).toBeVisible();
  await expect(
    dialog(page).getByRole('button', { name: 'Giờ làm việc', exact: true }),
  ).toBeVisible();
  await expect(dialog(page).getByRole('button', { name: 'Gói cước nào rẻ?' })).toHaveCount(0);
});
