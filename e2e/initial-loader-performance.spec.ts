import { test, expect } from '@playwright/test';
import { writeFileSync } from 'node:fs';
import { INITIAL_LOADER_SESSION_KEY } from '../lib/initial-loader';

const url = '/chinh-sach-bao-mat';

test('Slow 3G still paints the curtain before hydration and honors the safety deadline', async ({
  page,
  context,
}, info) => {
  const connection = await context.newCDPSession(page);
  await connection.send('Network.enable');
  await connection.send('Network.emulateNetworkConditions', {
    offline: false,
    latency: 400,
    downloadThroughput: 50_000,
    uploadThroughput: 50_000,
    connectionType: 'cellular3g',
  });
  await page.goto(url, { waitUntil: 'commit' });
  const curtain = page.locator('[data-initial-page-loader]');
  await expect(curtain).toBeVisible();
  const capture = await connection.send('Page.captureScreenshot', { format: 'png' });
  writeFileSync(info.outputPath('slow-3g-first-paint.png'), Buffer.from(capture.data, 'base64'));
  await expect(curtain).toBeHidden({ timeout: 11_000 });
  expect(await page.locator('html').getAttribute('data-initial-loader')).toBeNull();
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).overflow)).not.toBe(
    'hidden',
  );
});

test('the curtain adds no measurable layout shift or material LCP delay on the reference page', async ({
  context,
  baseURL,
}, info) => {
  const results: { loader: boolean; cls: number; lcp: number }[] = [];
  for (const enabled of [false, true, false, true]) {
    const page = await context.newPage();
    await page.addInitScript(
      ({ enabled, key }) => {
        if (!enabled) sessionStorage.setItem(key, '1');
        localStorage.setItem('mfsl_cookie_consent_v1', JSON.stringify({ value: 'necessary' }));
        const metrics = { cls: 0, lcp: 0 };
        (window as unknown as { loaderMetrics: typeof metrics }).loaderMetrics = metrics;
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            const shift = entry as PerformanceEntry & { hadRecentInput: boolean; value: number };
            if (!shift.hadRecentInput) metrics.cls += shift.value;
          }
        }).observe({ type: 'layout-shift', buffered: true });
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) metrics.lcp = entry.startTime;
        }).observe({ type: 'largest-contentful-paint', buffered: true });
      },
      { enabled, key: INITIAL_LOADER_SESSION_KEY },
    );
    await page.route('**/recaptcha/**', (route) => route.abort());
    await page.goto(`${baseURL}${url}`);
    await expect(page.locator('[data-initial-page-loader]')).toHaveCount(0);
    await page.waitForTimeout(500);
    results.push({
      loader: enabled,
      ...(await page.evaluate(
        () => (window as unknown as { loaderMetrics: { cls: number; lcp: number } }).loaderMetrics,
      )),
    });
    await page.close();
  }
  const average = (loader: boolean, metric: 'cls' | 'lcp') => {
    const samples = results.filter((result) => result.loader === loader);
    return samples.reduce((sum, result) => sum + result[metric], 0) / samples.length;
  };
  await info.attach('loader-performance.json', {
    body: JSON.stringify(results, null, 2),
    contentType: 'application/json',
  });
  writeFileSync(info.outputPath('loader-performance.json'), JSON.stringify(results, null, 2));
  expect(average(true, 'cls')).toBeLessThanOrEqual(average(false, 'cls') + 0.01);
  expect(average(true, 'lcp')).toBeGreaterThan(0);
  expect(average(true, 'lcp')).toBeLessThanOrEqual(average(false, 'lcp') + 400);
});
