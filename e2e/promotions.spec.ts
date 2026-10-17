import { test, expect, type Page } from '@playwright/test';
import { mkdirSync, readFileSync } from 'node:fs';

type Promotion = {
  id: number;
  title: string;
  content: string;
  image_url: string | null;
  coupon_code: string | null;
  cta_text: string | null;
  cta_link: string | null;
  effect_type: 'bounce' | 'shake' | 'popup';
  position: 'center' | 'bottom_right' | 'bottom_left';
  trigger_type: 'immediate' | 'delay' | 'scroll';
  trigger_value: number;
  target_pages: string[];
  frequency: 'visit' | 'daily' | 'once';
  device: 'desktop' | 'mobile' | 'all';
  start_at: string | null;
  end_at: string | null;
  is_active: boolean;
};
type PromotionEvent = { event: 'impression' | 'open' | 'cta'; visit_id: string };

const privacyPath = '/chinh-sach-bao-mat';
const termsPath = '/dieu-khoan-su-dung';
const gift = (page: Page) => page.getByRole('button', { name: 'Mở hộp quà khuyến mại' });
const popup = (page: Page) => page.getByRole('dialog', { name: 'Bạn nhận được một món quà!' });

function promotion(overrides: Partial<Promotion> = {}): Promotion {
  return {
    id: 101,
    title: 'Bạn nhận được một món quà!',
    content: 'Tặng ưu đãi 20% khi đăng ký gói cước.\nÁp dụng cho khách hàng mới.',
    image_url: null,
    coupon_code: 'MOBI20',
    cta_text: 'Xem ưu đãi',
    cta_link: termsPath,
    effect_type: 'bounce',
    position: 'bottom_left',
    trigger_type: 'immediate',
    trigger_value: 0,
    target_pages: [],
    frequency: 'visit',
    device: 'all',
    start_at: null,
    end_at: null,
    is_active: true,
    ...overrides,
  };
}

async function preparePage(page: Page) {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => {
    localStorage.setItem('mfsl_cookie_consent_v1', JSON.stringify({ value: 'necessary' }));
    sessionStorage.setItem('mfsl_initial_loader_seen_v1', '1');
  });
  await page.route('**/recaptcha/**', (route) => route.abort());
  await page.route('**/logo_ngan_cropped.png', (route) => route.fulfill({
    contentType: 'image/png', body: readFileSync('public/logo_ngan_cropped.png'),
  }));
  await page.route('**/public/**', (route) => {
    const path = new URL(route.request().url()).pathname;
    const data = path.endsWith('/settings')
      ? { ai_chatbot_enabled: 'false', contact_widget_enabled: 'false', hotline: '18001090' }
      : path.endsWith('/current-duty-staff')
        ? null
        : [];
    return route.fulfill({ json: { success: true, data } });
  });
}

async function mockPromotions(page: Page, initial: Promotion[]) {
  let campaigns = initial;
  const events: PromotionEvent[] = [];
  const requests: URL[] = [];
  await page.route(/\/public\/promotions(?:\?.*)?$/, (route) => {
    requests.push(new URL(route.request().url()));
    return route.fulfill({ json: { success: true, data: campaigns } });
  });
  await page.route(/\/public\/promotions\/\d+\/events(?:\?.*)?$/, (route) => {
    expect(route.request().method()).toBe('POST');
    events.push(route.request().postDataJSON());
    return route.fulfill({ status: 201, json: { success: true, data: { recorded: true } } });
  });
  return { events, requests, update: (next: Promotion[]) => { campaigns = next; } };
}

async function navigate(page: Page, path = privacyPath) {
  await Promise.all([
    page.waitForResponse((response) => /\/public\/promotions(?:\?|$)/.test(response.url())),
    page.goto(path),
  ]);
}

test.beforeEach(async ({ page }) => preparePage(page));

test('opens, copies the coupon and records each action once before following the CTA', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: async (value: string) => {
        (window as unknown as { copiedPromotionCode: string }).copiedPromotionCode = value;
      } },
    });
  });
  const { events, requests } = await mockPromotions(page, [promotion({ image_url: '/logo_ngan_cropped.png' })]);
  await navigate(page);
  await expect(gift(page)).toBeVisible();
  await expect.poll(() => events.map((entry) => entry.event)).toEqual(['impression']);
  expect(requests[0].searchParams.get('path')).toBe(privacyPath);
  expect(requests[0].searchParams.get('device')).toBe('desktop');
  await gift(page).click();
  const dialog = popup(page);
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveAttribute('aria-modal', 'true');
  await expect(dialog.getByText('Tặng ưu đãi 20%', { exact: false })).toBeVisible();
  await expect(dialog.getByRole('img')).toBeVisible();
  await dialog.getByRole('button', { name: 'Sao chép mã' }).click();
  await expect(dialog.getByText('Đã sao chép mã')).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as { copiedPromotionCode: string }).copiedPromotionCode)).toBe('MOBI20');
  await page.evaluate(() => window.dispatchEvent(new Event('resize')));
  await expect.poll(() => events.map((entry) => entry.event)).toEqual(['impression', 'open']);
  await dialog.getByRole('link', { name: 'Xem ưu đãi' }).click();
  await expect(page).toHaveURL(new RegExp(`${termsPath}$`));
  await expect.poll(() => events.map((entry) => entry.event)).toEqual(['impression', 'open', 'cta']);
  expect(new Set(events.map((entry) => entry.visit_id)).size).toBe(1);
  expect(events[0].visit_id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
});

test('a dismissed gift remains suppressed through reload and internal navigation in this visit', async ({ page }) => {
  const { events } = await mockPromotions(page, [promotion()]);
  await navigate(page);
  await expect(gift(page)).toBeVisible();
  await page.getByRole('button', { name: 'Đóng hộp quà' }).click();
  await expect(gift(page)).toHaveCount(0);
  await Promise.all([
    page.waitForResponse((response) => /\/public\/promotions(?:\?|$)/.test(response.url())),
    page.reload(),
  ]);
  await expect(gift(page)).toHaveCount(0);
  await page.locator(`footer a[href="${termsPath}"]:not([target])`).click();
  await expect(page).toHaveURL(new RegExp(`${termsPath}$`));
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(gift(page)).toHaveCount(0);
  expect(events.map((entry) => entry.event)).toEqual(['impression']);
});

for (const frequency of ['visit', 'daily', 'once'] as const) {
  test(`${frequency} frequency uses the configured scope across browser tabs`, async ({ page, context }) => {
    const campaign = promotion({ frequency });
    await mockPromotions(page, [campaign]);
    await navigate(page);
    await expect(gift(page)).toBeVisible();
    await page.getByRole('button', { name: 'Đóng hộp quà' }).click();
    const fresh = await context.newPage();
    await preparePage(fresh);
    const { events } = await mockPromotions(fresh, [campaign]);
    await navigate(fresh);
    if (frequency === 'visit') {
      await expect(gift(fresh)).toBeVisible();
      await expect.poll(() => events.map((entry) => entry.event)).toEqual(['impression']);
    } else {
      await expect(gift(fresh)).toHaveCount(0);
      expect(events).toHaveLength(0);
    }
    await fresh.close();
  });
}

test('delay waits for its configured time and records no premature impression', async ({ page }) => {
  const { events } = await mockPromotions(page, [promotion({ trigger_type: 'delay', trigger_value: 3 })]);
  await navigate(page);
  // This wait measures the configured delay itself, before the allowed display time.
  await page.waitForTimeout(1_500);
  await expect(gift(page)).toHaveCount(0);
  expect(events).toHaveLength(0);
  await expect(gift(page)).toBeVisible();
  await expect.poll(() => events.map((entry) => entry.event)).toEqual(['impression']);
});

test('scroll waits for the threshold before displaying the gift', async ({ page }) => {
  const { events } = await mockPromotions(page, [promotion({ trigger_type: 'scroll', trigger_value: 75 })]);
  await navigate(page);
  await expect(gift(page)).toHaveCount(0);
  await page.evaluate(() => {
    document.querySelector('main')!.setAttribute('style', 'min-height: 4000px');
    window.scrollTo(0, (document.documentElement.scrollHeight - innerHeight) * 0.5);
    window.dispatchEvent(new Event('scroll'));
  });
  await expect(gift(page)).toHaveCount(0);
  expect(events).toHaveLength(0);
  await page.evaluate(() => {
    window.scrollTo(0, (document.documentElement.scrollHeight - innerHeight) * 0.85);
    window.dispatchEvent(new Event('scroll'));
  });
  await expect(gift(page)).toBeVisible();
  await expect.poll(() => events.map((entry) => entry.event)).toEqual(['impression']);
});

test('inactive, scheduled, expired, wrong-page and wrong-device programs stay hidden', async ({ page }) => {
  const { events } = await mockPromotions(page, [
    promotion({ id: 201, is_active: false }),
    promotion({ id: 202, start_at: '2099-01-01T00:00:00Z' }),
    promotion({ id: 203, end_at: '2000-01-01T00:00:00Z' }),
    promotion({ id: 204, target_pages: ['/'] }),
    promotion({ id: 205, device: 'mobile' }),
  ]);
  await navigate(page);
  await expect(gift(page)).toHaveCount(0);
  expect(events).toHaveLength(0);
});

test('daily frequency becomes eligible again at the next Vietnam calendar day', async ({ page }) => {
  // Both instants are October 13 in UTC; the second is October 14 in Vietnam.
  await page.clock.setFixedTime(new Date('2026-10-13T16:59:00Z'));
  const { events } = await mockPromotions(page, [promotion({ frequency: 'daily' })]);
  await navigate(page);
  await expect(gift(page)).toBeVisible();
  await page.getByRole('button', { name: 'Đóng hộp quà' }).click();
  await page.clock.setFixedTime(new Date('2026-10-13T17:01:00Z'));
  await Promise.all([
    page.waitForResponse((response) => /\/public\/promotions(?:\?|$)/.test(response.url())),
    page.reload(),
  ]);
  await expect(gift(page)).toBeVisible();
  await expect.poll(() => events.map((entry) => entry.event)).toEqual(['impression', 'impression']);
  expect(events[0].visit_id).not.toBe(events[1].visit_id);
});

test('specific-page targeting resets a pending trigger when navigating away', async ({ page }) => {
  const { events } = await mockPromotions(page, [promotion({ target_pages: [termsPath], trigger_type: 'scroll', trigger_value: 70 })]);
  await navigate(page);
  await expect(gift(page)).toHaveCount(0);
  await page.locator(`footer a[href="${termsPath}"]:not([target])`).click();
  await expect(page).toHaveURL(new RegExp(`${termsPath}$`));
  await page.evaluate(() => {
    document.querySelector('main')!.setAttribute('style', 'min-height: 4000px');
    window.scrollTo(0, 0);
  });
  await expect(gift(page)).toHaveCount(0);
  await navigate(page);
  await page.evaluate(() => {
    window.scrollTo(0, document.documentElement.scrollHeight);
    window.dispatchEvent(new Event('scroll'));
  });
  await expect(gift(page)).toHaveCount(0);
  expect(events).toHaveLength(0);
});

test('mobile gift and popup fit a narrow screen, use reduced motion and close with Escape', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  const { requests } = await mockPromotions(page, [promotion({ device: 'mobile', effect_type: 'shake', position: 'bottom_right' })]);
  await navigate(page);
  await expect(gift(page)).toBeVisible();
  expect(requests[0].searchParams.get('device')).toBe('mobile');
  const animations = await gift(page).evaluate((element) => [element, ...element.querySelectorAll('*')].map((node) => getComputedStyle(node).animationName));
  expect(animations.every((name) => name === 'none')).toBe(true);
  await gift(page).click();
  await expect(popup(page)).toBeVisible();
  const bounds = (await popup(page).boundingBox())!;
  expect(bounds.x).toBeGreaterThanOrEqual(0);
  expect(bounds.y).toBeGreaterThanOrEqual(0);
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(320);
  expect(bounds.y + bounds.height).toBeLessThanOrEqual(640);
  await page.keyboard.press('Escape');
  await expect(popup(page)).toHaveCount(0);
});

test('ordinary popup opens immediately, renders text safely and supports outside dismissal', async ({ page }) => {
  const { events } = await mockPromotions(page, [promotion({ effect_type: 'popup', content: '<img src=x onerror=alert(1)> Điều kiện áp dụng', coupon_code: null, cta_text: null, cta_link: null })]);
  await navigate(page);
  const dialog = popup(page);
  await expect(dialog).toBeVisible();
  await expect(gift(page)).toHaveCount(0);
  await expect(dialog.getByText('<img src=x onerror=alert(1)> Điều kiện áp dụng', { exact: true })).toBeVisible();
  await expect(dialog.locator('img[onerror], script')).toHaveCount(0);
  await expect(dialog.getByRole('button', { name: 'Sao chép mã' })).toHaveCount(0);
  await expect(dialog.getByRole('link')).toHaveCount(0);
  await page.mouse.click(5, 5);
  await expect(dialog).toHaveCount(0);
  await expect.poll(() => events.map((entry) => entry.event)).toEqual(['impression', 'open']);
});

test('a failed public request leaves browsing usable without a gift or modal', async ({ page }) => {
  await page.route(/\/public\/promotions(?:\?.*)?$/, (route) => route.fulfill({ status: 503, json: { success: false, message: 'Temporarily unavailable' } }));
  await navigate(page);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(gift(page)).toHaveCount(0);
  await expect(popup(page)).toHaveCount(0);
  await page.locator(`footer a[href="${termsPath}"]:not([target])`).click();
  await expect(page).toHaveURL(new RegExp(`${termsPath}$`));
});

test('polling applies activation, effect and coupon changes, and deactivation without duplicate analytics', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-10-13T03:00:00Z') });
  await page.addInitScript(() => Object.defineProperty(navigator, 'clipboard', {
    configurable: true, value: { writeText: async () => {} },
  }));
  const mock = await mockPromotions(page, []);
  await navigate(page);
  await expect(gift(page)).toHaveCount(0);
  mock.update([promotion()]);
  const enabledResponse = page.waitForResponse((response) => /\/public\/promotions(?:\?|$)/.test(response.url()));
  await page.clock.runFor(30_100);
  await enabledResponse;
  await expect(gift(page)).toBeVisible();
  mock.update([promotion({ effect_type: 'popup' })]);
  const changedEffect = page.waitForResponse((response) => /\/public\/promotions(?:\?|$)/.test(response.url()));
  await page.clock.runFor(30_100);
  await changedEffect;
  await expect(popup(page)).toBeVisible();
  await popup(page).getByRole('button', { name: 'Sao chép mã' }).click();
  await expect(popup(page).getByRole('status')).toHaveText('Đã sao chép mã');
  mock.update([promotion({ effect_type: 'popup', coupon_code: 'MOBI30' })]);
  const changedCoupon = page.waitForResponse((response) => /\/public\/promotions(?:\?|$)/.test(response.url()));
  await page.clock.runFor(30_100);
  await changedCoupon;
  await expect(popup(page).getByText('MOBI30', { exact: true })).toBeVisible();
  await expect(popup(page).getByRole('status')).toHaveText('');
  mock.update([]);
  const disabledResponse = page.waitForResponse((response) => /\/public\/promotions(?:\?|$)/.test(response.url()));
  await page.clock.runFor(30_100);
  await disabledResponse;
  await expect(popup(page)).toHaveCount(0);
  expect(mock.events.map((entry) => entry.event)).toEqual(['impression', 'open']);
});

test('the close button remains visible after scrolling a long promotion on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await mockPromotions(page, [promotion({ effect_type: 'popup', content: 'Ưu đãi áp dụng theo các điều kiện của chương trình.\n'.repeat(100) })]);
  await navigate(page);
  const dialog = popup(page);
  await expect(dialog).toBeVisible();
  await dialog.evaluate((element) => { element.scrollTop = element.scrollHeight; });
  expect(await dialog.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
  const close = dialog.getByRole('button', { name: 'Đóng khuyến mại' });
  const bounds = (await close.boundingBox())!;
  expect(bounds.y).toBeGreaterThanOrEqual(0);
  expect(bounds.y + bounds.height).toBeLessThanOrEqual(640);
  await expect(close).toBeInViewport();
  await close.click();
  await expect(dialog).toHaveCount(0);
});

test('a promotion expiring during its delay never shows or records an impression', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-10-13T03:00:00Z') });
  await page.clock.pauseAt(new Date('2026-10-13T03:00:01Z'));
  const { events } = await mockPromotions(page, [promotion({ trigger_type: 'delay', trigger_value: 5, end_at: '2026-10-13T03:00:03Z' })]);
  await navigate(page);
  await page.clock.runFor(6_000);
  await expect(gift(page)).toHaveCount(0);
  expect(events).toHaveLength(0);
});

test('blocked promotion storage still permits opening and suppresses this visit in memory', async ({ page }) => {
  await page.addInitScript(() => {
    const getItem = Storage.prototype.getItem;
    const setItem = Storage.prototype.setItem;
    Storage.prototype.getItem = function (key) {
      if (key.startsWith('mfsl_promotion')) throw new DOMException('Storage disabled', 'SecurityError');
      return getItem.call(this, key);
    };
    Storage.prototype.setItem = function (key, value) {
      if (key.startsWith('mfsl_promotion')) throw new DOMException('Storage disabled', 'SecurityError');
      return setItem.call(this, key, value);
    };
  });
  const { events } = await mockPromotions(page, [promotion()]);
  await navigate(page);
  await gift(page).click();
  await expect(popup(page)).toBeVisible();
  await popup(page).getByRole('button', { name: 'Đóng khuyến mại' }).click();
  await Promise.all([
    page.waitForResponse((response) => /\/public\/promotions(?:\?|$)/.test(response.url())),
    page.locator(`footer a[href="${termsPath}"]:not([target])`).click(),
  ]);
  await expect(page).toHaveURL(new RegExp(`${termsPath}$`));
  await expect(gift(page)).toHaveCount(0);
  expect(events.map((entry) => entry.event)).toEqual(['impression', 'open']);
});

test('desktop and mobile gift and popup screenshots keep visible close controls', async ({ page }) => {
  mkdirSync('docs/screenshots', { recursive: true });
  for (const [width, name] of [[1440, 'desktop'], [390, 'mobile']] as const) {
    await page.setViewportSize({ width, height: 900 });
    await mockPromotions(page, [promotion({ id: width, position: 'bottom_right', image_url: '/logo_ngan_cropped.png' })]);
    await navigate(page);
    await expect(gift(page)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Đóng hộp quà' })).toBeVisible();
    await page.screenshot({ path: `docs/screenshots/promotions-${name}-gift.png`, animations: 'disabled' });
    await gift(page).click();
    await expect(popup(page)).toBeVisible();
    await expect(popup(page).getByRole('button', { name: 'Đóng khuyến mại' })).toBeVisible();
    await page.screenshot({ path: `docs/screenshots/promotions-${name}-popup.png`, animations: 'disabled' });
    await popup(page).getByRole('button', { name: 'Đóng khuyến mại' }).click();
  }
});

test.describe('admin promotions', () => {
  const admin = { id: 1, role: 'admin', full_name: 'Quản trị kiểm thử', username: 'promotion-test', status: 'active' };
  const token = `ui.${Buffer.from(JSON.stringify({ role: 'admin', exp: 4102444800 })).toString('base64url')}.fixture`;

  test.beforeEach(async ({ page, context, baseURL }) => {
    await context.addCookies([{ name: 'mfsl_token', value: token, url: baseURL! }]);
    await page.addInitScript(({ user, authToken }) => {
      localStorage.setItem('mfsl_auth_token', authToken);
      localStorage.setItem('mfsl_auth_user', JSON.stringify(user));
    }, { user: admin, authToken: token });
  });

  async function mockAdmin(page: Page) {
    type AdminPromotion = Promotion & { name: string; impression_count: number; open_count: number; cta_count: number; created_at: string; updated_at: string };
    let campaigns: AdminPromotion[] = [];
    const mutations: { method: string; body: Record<string, unknown> | null }[] = [];
    const analytics: string[] = [];
    await page.route('**/api/**', async (route) => {
      const request = route.request();
      const path = new URL(request.url()).pathname;
      const method = request.method();
      let data: unknown = [];
      if (path.endsWith('/auth/me')) data = admin;
      if (path.endsWith('/public/settings')) data = {};
      if (/\/public\/promotions\/\d+\/events$/.test(path)) analytics.push(path);
      if (/\/admin\/promotions(?:\/\d+)?$/.test(path)) {
        const id = Number(path.split('/').at(-1));
        if (method === 'POST') {
          const body = request.postDataJSON();
          mutations.push({ method, body });
          const created = { ...promotion(), ...body, id: 301, impression_count: 0, open_count: 0, cta_count: 0, created_at: '2026-10-13T03:00:00Z', updated_at: '2026-10-13T03:00:00Z' } as AdminPromotion;
          campaigns = [...campaigns, created];
          data = created;
        } else if (method === 'PUT') {
          const body = request.postDataJSON();
          mutations.push({ method, body });
          campaigns = campaigns.map((item) => item.id === id ? { ...item, ...body } : item);
          data = campaigns.find((item) => item.id === id);
        } else if (method === 'DELETE') {
          mutations.push({ method, body: null });
          campaigns = campaigns.filter((item) => item.id !== id);
          data = null;
        } else {
          data = Number.isFinite(id) ? campaigns.find((item) => item.id === id) : campaigns;
        }
      }
      await route.fulfill({ status: method === 'POST' ? 201 : 200, json: { success: true, data } });
    });
    return { mutations, analytics };
  }

  test('preview preserves unsaved values, then create, edit, toggle and delete persist their intended payloads', async ({ page }) => {
    test.setTimeout(90_000);
    const { mutations, analytics } = await mockAdmin(page);
    await page.goto('/admin/promotions');
    await expect(page.getByRole('main').getByRole('heading', { name: 'Hộp quà khuyến mại' })).toBeVisible();
    await page.getByRole('button', { name: 'Thêm chương trình', exact: true }).click();
    const editor = page.getByRole('dialog', { name: 'Thêm chương trình khuyến mại', exact: true });
    await editor.getByLabel('Tên chương trình (nội bộ)').fill('Chiến dịch kiểm thử');
    await editor.getByLabel('Tiêu đề hiển thị').fill('Bạn nhận được một món quà!');
    await editor.getByLabel('Nội dung khuyến mại').fill('Ưu đãi dành riêng cho khách hàng mới.');
    await editor.getByLabel('Mã giảm giá', { exact: true }).fill('MOBI20');
    await editor.getByLabel('Nội dung nút').fill('Xem ưu đãi');
    await editor.getByLabel('Đường dẫn nút').fill(termsPath);
    await editor.getByLabel('Kiểu hiệu ứng').selectOption('bounce');
    await editor.getByLabel('Vị trí hộp quà').selectOption('bottom_left');
    await editor.getByLabel('Thời điểm kích hoạt').selectOption('delay');
    await editor.getByLabel('Sau bao nhiêu giây?').fill('12');
    await editor.getByLabel('Trang áp dụng', { exact: true }).selectOption('specific');
    await editor.getByLabel('Các đường dẫn áp dụng').fill(`${privacyPath}\n${termsPath}\n${privacyPath}`);
    await editor.getByLabel('Tần suất hiển thị').selectOption('once');
    await editor.getByLabel('Thiết bị', { exact: true }).selectOption('mobile');
    await editor.getByLabel('Bắt đầu (giờ Việt Nam)').fill('2026-11-01T09:30');
    await editor.getByLabel('Kết thúc (giờ Việt Nam)').fill('2026-11-02T10:45');
    mkdirSync('docs/screenshots', { recursive: true });
    await page.screenshot({ path: 'docs/screenshots/promotions-admin-editor.png', animations: 'disabled' });
    await editor.getByRole('button', { name: 'Xem trước', exact: true }).click();
    await expect(gift(page)).toBeVisible();
    await gift(page).click();
    await expect(popup(page)).toBeVisible();
    await expect(popup(page).getByText('Ưu đãi dành riêng cho khách hàng mới.')).toBeVisible();
    await popup(page).getByRole('button', { name: 'Đóng khuyến mại' }).click();
    await expect(editor).toBeVisible();
    await expect(editor.getByLabel('Tên chương trình (nội bộ)')).toHaveValue('Chiến dịch kiểm thử');
    await expect(editor.getByLabel('Sau bao nhiêu giây?')).toHaveValue('12');
    expect(mutations).toHaveLength(0);
    expect(analytics).toHaveLength(0);
    await editor.getByRole('button', { name: 'Lưu chương trình' }).click();
    await expect(editor).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Sửa Chiến dịch kiểm thử', exact: true })).toBeVisible();
    await page.screenshot({ path: 'docs/screenshots/promotions-admin-list.png', animations: 'disabled' });
    expect(mutations[0]).toMatchObject({ method: 'POST', body: {
      name: 'Chiến dịch kiểm thử', title: 'Bạn nhận được một món quà!',
      effect_type: 'bounce', position: 'bottom_left', trigger_type: 'delay', trigger_value: 12,
      target_pages: [privacyPath, termsPath], frequency: 'once', device: 'mobile', is_active: false,
      start_at: '2026-11-01T02:30:00.000Z', end_at: '2026-11-02T03:45:00.000Z',
      image_url: null, coupon_code: 'MOBI20', cta_text: 'Xem ưu đãi', cta_link: termsPath,
    } });
    await page.getByRole('button', { name: 'Sửa Chiến dịch kiểm thử', exact: true }).click();
    const edit = page.getByRole('dialog', { name: 'Sửa chương trình khuyến mại', exact: true });
    await expect(edit.getByLabel('Bắt đầu (giờ Việt Nam)')).toHaveValue('2026-11-01T09:30');
    await edit.getByLabel('Tên chương trình (nội bộ)').fill('Chiến dịch đã sửa');
    await edit.getByLabel('Mã giảm giá', { exact: true }).fill('');
    await edit.getByLabel('Thời điểm kích hoạt').selectOption('immediate');
    await edit.getByRole('button', { name: 'Lưu chương trình' }).click();
    await expect(edit).toHaveCount(0);
    expect(mutations[1]).toMatchObject({ method: 'PUT', body: { name: 'Chiến dịch đã sửa', coupon_code: null, trigger_type: 'immediate', trigger_value: 0 } });
    await page.getByRole('button', { name: 'Bật Chiến dịch đã sửa', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Tắt Chiến dịch đã sửa', exact: true })).toBeVisible();
    expect(mutations[2]).toEqual({ method: 'PUT', body: { is_active: true } });
    await page.getByRole('button', { name: 'Xóa Chiến dịch đã sửa', exact: true }).click();
    await page.getByRole('button', { name: 'Xóa chương trình', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Sửa Chiến dịch đã sửa', exact: true })).toHaveCount(0);
    expect(mutations.map((entry) => entry.method)).toEqual(['POST', 'PUT', 'PUT', 'DELETE']);
  });

  test('invalid dates and an unsafe CTA cannot be saved or previewed', async ({ page }) => {
    const { mutations, analytics } = await mockAdmin(page);
    await page.goto('/admin/promotions');
    await page.getByRole('button', { name: 'Thêm chương trình', exact: true }).click();
    const editor = page.getByRole('dialog', { name: 'Thêm chương trình khuyến mại', exact: true });
    await editor.getByLabel('Tên chương trình (nội bộ)').fill('Chương trình không hợp lệ');
    await editor.getByLabel('Nội dung khuyến mại').fill('Nội dung thử nghiệm');
    await editor.getByLabel('Nội dung nút').fill('Đăng ký');
    await editor.getByLabel('Đường dẫn nút').fill('javascript:alert(1)');
    await editor.getByLabel('Bắt đầu (giờ Việt Nam)').fill('2026-11-02T09:30');
    await editor.getByLabel('Kết thúc (giờ Việt Nam)').fill('2026-11-01T09:30');
    await editor.getByRole('button', { name: 'Lưu chương trình' }).click();
    await expect(editor.getByText('Thời gian kết thúc phải sau thời gian bắt đầu')).toBeVisible();
    await expect(editor.getByText('Dùng đường dẫn /... hoặc URL http/https')).toBeVisible();
    await editor.getByRole('button', { name: 'Xem trước', exact: true }).click();
    await expect(editor).toBeVisible();
    await expect(gift(page)).toHaveCount(0);
    expect(mutations).toHaveLength(0);
    expect(analytics).toHaveLength(0);
  });
});
