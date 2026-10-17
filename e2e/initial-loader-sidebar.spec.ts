import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { initialLoaderBootstrap, INITIAL_LOADER_SESSION_KEY } from '../lib/initial-loader';

const url = '/chinh-sach-bao-mat';
const overlay = (page: Page) => page.locator('[data-initial-page-loader]');

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('mfsl_cookie_consent_v1', JSON.stringify({ value: 'necessary' }));
  });
  await page.route('**/recaptcha/**', (route) => route.abort());
});

async function holdFonts(page: Page) {
  await page.addInitScript(() => {
    const ready = new Promise<void>((resolve) => {
      (window as unknown as { releaseLoaderFonts: () => void }).releaseLoaderFonts = resolve;
    });
    // Stub the document accessor rather than a native FontFaceSet property.
    Object.defineProperty(document, 'fonts', { get: () => ({ ready }) });
  });
}

test('waits for fonts, reveals the rendered page with a curved curtain and restores scrolling', async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (/hydration|did not match|server rendered/i.test(message.text()))
      errors.push(message.text());
  });
  await holdFonts(page);
  await page.goto(url);
  await expect(overlay(page)).toBeVisible();
  expect((await overlay(page).boundingBox())!.width).toBe(await page.evaluate(() => innerWidth));
  await expect(page.getByRole('main')).toBeAttached();
  await expect(overlay(page).getByRole('progressbar')).toHaveAttribute('aria-valuenow', /[1-9]\d?/);
  await page.waitForTimeout(1_000);
  expect(
    await overlay(page).getByRole('progressbar').getAttribute('aria-valuenow').then(Number),
  ).toBeLessThanOrEqual(90);
  await expect(overlay(page)).toHaveAttribute('data-phase', 'loading');
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).overflow)).toBe(
    'hidden',
  );
  const pageWidth = await page.locator('main').boundingBox();
  console.log('Loader gutter diagnostic', await page.evaluate(() => {
    const root = document.documentElement;
    const probe = document.createElement('div');
    probe.style.cssText = 'position:fixed;top:-9999px;width:100px;height:100px;overflow:scroll;scrollbar-gutter:stable;border:0;padding:0;visibility:hidden';
    document.body.append(probe);
    const sizes = { offset: probe.offsetWidth, client: probe.clientWidth };
    probe.remove();
    return {
      gutter: root.style.getPropertyValue('--initial-loader-gutter'),
      padding: getComputedStyle(document.body).paddingInlineEnd,
      rootClient: root.clientWidth, rootWidth: root.getBoundingClientRect().width,
      bodyWidth: document.body.getBoundingClientRect().width,
      mainWidth: document.querySelector('main')?.getBoundingClientRect().width,
      freshScript: Array.from(document.scripts).some((script) => script.textContent?.includes('previousGutter')),
      ...sizes,
    };
  }));
  const curve = await overlay(page).evaluate((element) => {
    const style = getComputedStyle(element, '::after');
    return { height: parseFloat(style.height), radius: style.borderBottomLeftRadius };
  });
  expect(curve.height).toBeGreaterThanOrEqual(48);
  expect(curve.radius).toBe('50%');
  await page.evaluate(() =>
    (window as unknown as { releaseLoaderFonts: () => void }).releaseLoaderFonts(),
  );
  await expect(overlay(page)).toHaveAttribute('data-phase', 'opening');
  expect(
    await overlay(page).evaluate((element) => getComputedStyle(element).transitionDuration),
  ).toBe('0.9s');
  await page.waitForTimeout(350);
  await page.screenshot({ path: info.outputPath('curtain-opening.png') });
  await expect(overlay(page)).toHaveCount(0);
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).overflow)).not.toBe(
    'hidden',
  );
  const revealedWidth = await page.locator('main').boundingBox();
  expect(revealedWidth!.width).toBeCloseTo(pageWidth!.width, 0);
  expect(revealedWidth!.x).toBeCloseTo(pageWidth!.x, 0);
  expect(errors).toEqual([]);
});

test('waits for window load when an eager page resource is slow', async ({ page }) => {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route('**/loader-slow-resource.png', async (route) => {
    await gate;
    await route.fulfill({ contentType: 'image/png', body: readFileSync('public/logo.png') });
  });
  await page.addInitScript(() => {
    document.addEventListener('DOMContentLoaded', () => {
      const image = new Image();
      image.src = '/loader-slow-resource.png';
      image.style.position = 'absolute';
      image.style.width = '1px';
      image.style.height = '1px';
      document.body.append(image);
    });
  });
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await expect(overlay(page).getByRole('progressbar')).toHaveAttribute('aria-valuenow', /[1-9]\d?/);
  await page.waitForTimeout(1_000);
  expect(await page.evaluate(() => document.readyState)).not.toBe('complete');
  await expect(overlay(page)).toHaveAttribute('data-phase', 'loading');
  release();
  await expect(overlay(page)).toHaveCount(0);
});

test('safety deadline opens the curtain even if fonts never become ready', async ({ page }) => {
  await holdFonts(page);
  await page.goto(url);
  await expect(overlay(page)).toBeVisible();
  await expect(overlay(page)).toHaveCount(0, { timeout: 11_000 });
  const elapsed = await page.evaluate(() => performance.now());
  expect(elapsed).toBeGreaterThanOrEqual(8_000);
  expect(elapsed).toBeLessThan(12_000);
  expect(await page.locator('html').getAttribute('data-initial-loader')).toBeNull();
});

test('reduced motion uses only the 200ms fade after the minimum display time', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await holdFonts(page);
  await page.goto(url);
  await expect(overlay(page)).toBeVisible();
  // Record the short fade at the mutation itself; polling can miss a 200ms phase.
  const { elapsed, ...style } = await page.evaluate(
    () =>
      new Promise<{
        elapsed: number;
        transform: string;
        duration: string;
        property: string;
      }>((resolve) => {
        const root = document.documentElement;
        const started = Number(root.dataset.initialLoaderStarted);
        const observer = new MutationObserver(() => {
          if (root.dataset.initialLoader !== 'opening') return;
          const element = document.querySelector('[data-initial-page-loader]')!;
          const computed = getComputedStyle(element);
          observer.disconnect();
          resolve({
            elapsed: performance.now() - started,
            transform: computed.transform,
            duration: computed.transitionDuration,
            property: computed.transitionProperty,
          });
        });
        observer.observe(root, { attributes: true, attributeFilter: ['data-initial-loader'] });
        (window as unknown as { releaseLoaderFonts: () => void }).releaseLoaderFonts();
      }),
  );
  expect(elapsed).toBeGreaterThanOrEqual(800);
  expect(style).toEqual({ transform: 'none', duration: '0.2s', property: 'opacity' });
  await expect(overlay(page)).toHaveCount(0);
});

test('reload and internal navigation skip the curtain; a fresh tab shows it again', async ({
  page,
  context,
}) => {
  await page.goto(url);
  await expect(overlay(page)).toHaveCount(0);
  expect(
    await page.evaluate((key) => sessionStorage.getItem(key), INITIAL_LOADER_SESSION_KEY),
  ).toBe('1');
  await page.reload({ waitUntil: 'domcontentloaded' });
  expect(await page.locator('html').getAttribute('data-initial-loader')).toBeNull();
  await expect(overlay(page)).toHaveCount(0);
  await page.locator('footer a[href="/dieu-khoan-su-dung"]:not([target])').click();
  await expect(page).toHaveURL(/\/dieu-khoan-su-dung$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Điều khoản sử dụng');
  expect(await page.locator('html').getAttribute('data-initial-loader')).toBeNull();
  await expect(overlay(page)).toHaveCount(0);
  const fresh = await context.newPage();
  await fresh.goto(url, { waitUntil: 'commit' });
  await expect(fresh.locator('html')).toHaveAttribute('data-initial-loader', 'loading');
  await expect(overlay(fresh)).toBeVisible();
  await fresh.close();
});

test('storage restrictions still allow the loader to finish', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'sessionStorage', {
      get: () => {
        throw new Error('Storage disabled');
      },
    });
  });
  await page.goto(url, { waitUntil: 'commit' });
  await expect(overlay(page)).toBeVisible();
  await expect(overlay(page)).toHaveCount(0);
  expect(await page.locator('html').getAttribute('data-initial-loader')).toBeNull();
});

test('bootstrap respects both configuration switches and the shared session flag', async ({
  page,
}) => {
  await page.goto('/admin/login');
  await expect(overlay(page)).toHaveCount(0);
  expect(
    await page.evaluate((key) => sessionStorage.getItem(key), INITIAL_LOADER_SESSION_KEY),
  ).toBeNull();
  await page.evaluate(initialLoaderBootstrap(false, false));
  expect(await page.locator('html').getAttribute('data-initial-loader')).toBeNull();
  await page.evaluate(initialLoaderBootstrap(false, true));
  await expect(page.locator('html')).toHaveAttribute('data-initial-loader', 'loading');
  await page.evaluate(() => {
    delete document.documentElement.dataset.initialLoader;
  });
  await page.evaluate(initialLoaderBootstrap(false, true));
  expect(await page.locator('html').getAttribute('data-initial-loader')).toBeNull();
});

test('page content remains in server HTML and the curtain stays hidden without JavaScript', async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto(`${baseURL}${url}`);
  // Next streaming may park the completed tree in a hidden server container.
  // The loader must not replace that tree or lock scrolling without JavaScript.
  await expect(page.locator('main')).toBeAttached();
  await expect(overlay(page)).toBeHidden();
  await expect(page.locator('h1')).toContainText('Chính sách bảo mật');
  expect(await page.locator('html').getAttribute('data-initial-loader')).toBeNull();
  await context.close();
});

test('bootstrap shows the curtain before hydration and releases it when React downloads stall', async ({
  page,
  browserName,
}, info) => {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route(/\/_next\/static\/.*\.js(?:\?|$)/, async (route) => {
    await gate;
    await route.continue();
  });
  try {
    await page.goto(url, { waitUntil: 'commit' });
    await expect(overlay(page)).toBeVisible();
    expect(await overlay(page).getAttribute('data-phase')).toBe('loading');
    expect(await overlay(page).getByRole('progressbar').getAttribute('aria-valuenow')).toBe('0');
    if (browserName !== 'webkit') {
      await page.screenshot({ path: info.outputPath('before-hydration.png') });
    }
    await expect(overlay(page)).toBeHidden({ timeout: 11_000 });
    expect(await page.locator('html').getAttribute('data-initial-loader')).toBeNull();
  } finally {
    release();
  }
  await page.waitForLoadState('load');
  await expect(overlay(page)).toHaveCount(0);
});

test('sidebar keeps its compact footer visible while only the menu scrolls, in both themes', async ({
  page,
  context,
  baseURL,
}, info) => {
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
  await page.route('**/api/**', (route) =>
    route.fulfill({
      json: { success: true, data: route.request().url().endsWith('/auth/me') ? user : [] },
    }),
  );
  for (const width of [1440, 375]) {
    for (const theme of ['light', 'dark']) {
      await page.setViewportSize({ width, height: 568 });
      await page.goto('/admin/jobs');
      await page.evaluate((value) => {
        document.documentElement.dataset.theme = value;
      }, theme);
      if (width < 1024) await page.getByRole('button', { name: 'Mở menu', exact: true }).click();
      const sidebar = page.locator('#admin-navigation');
      await expect(sidebar).toBeVisible();
      await sidebar.getByRole('button', { name: 'Cài đặt' }).click();
      const nav = sidebar.locator('nav');
      const caption = sidebar.getByText('Hệ thống quản trị nội bộ', { exact: true });
      const logo = sidebar.getByRole('img', { name: 'MobiFone', exact: true });
      const home = sidebar.getByRole('link', { name: 'Xem trang chủ' });
      await expect(caption).toBeVisible();
      const footerBefore = (await caption.boundingBox())!;
      await nav.evaluate((element) => {
        element.scrollTop = element.scrollHeight;
      });
      const footerAfter = (await caption.boundingBox())!;
      expect(footerAfter.y).toBeCloseTo(footerBefore.y, 0);
      expect(footerAfter.y + footerAfter.height).toBeLessThanOrEqual(552);
      expect((await logo.boundingBox())!.width).toBeLessThanOrEqual(144);
      expect((await home.boundingBox())!.height).toBeGreaterThanOrEqual(44);
      const scroll = await nav.evaluate((element) => ({
        height: element.clientHeight,
        total: element.scrollHeight,
        top: element.scrollTop,
      }));
      expect(scroll.total).toBeGreaterThan(scroll.height);
      expect(scroll.top).toBeGreaterThan(0);
      await expect(home).toHaveAttribute('rel', 'noopener noreferrer');
      await page.screenshot({ path: info.outputPath(`sidebar-${width}-${theme}.png`) });
    }
  }
});
