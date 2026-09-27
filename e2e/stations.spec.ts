import { test, expect, type Page } from '@playwright/test';
import * as XLSX from 'xlsx';
import type { Station } from '../types/station';

const fixture: Station[] = [
  {
    id: 1,
    code: 'SL-001',
    name: 'Trạm Tô Hiệu',
    address: 'Sơn La',
    latitude: 21.3256,
    longitude: 103.9188,
    type: '4G',
    status: 'active',
    power_watts: 40,
    coverage_radius_m: 1200,
    installed_at: '2024-01-02',
    notes: null,
    created_at: '2024-01-02',
    updated_at: '2024-01-02',
  },
  {
    id: 2,
    code: 'SL-002',
    name: 'Trạm Chiềng Lề',
    address: 'Sơn La',
    latitude: 21.326,
    longitude: 103.919,
    type: '5G',
    status: 'incident',
    power_watts: 60,
    coverage_radius_m: null,
    installed_at: null,
    notes: '<img src=x onerror=alert(1)>',
    created_at: '2024-01-02',
    updated_at: '2024-01-02',
  },
  {
    id: 3,
    code: 'SL-003',
    name: 'Trạm Mộc Châu',
    address: 'Mộc Châu',
    latitude: 20.85,
    longitude: 104.64,
    type: '4G',
    status: 'maintenance',
    power_watts: null,
    coverage_radius_m: null,
    installed_at: null,
    notes: null,
    created_at: '2024-01-02',
    updated_at: '2024-01-02',
  },
];

async function setup(page: Page, role = 'admin') {
  const token = `test.${Buffer.from(JSON.stringify({ role, exp: 4102444800 })).toString('base64url')}.test`;
  await page
    .context()
    .addCookies([{ name: 'mfsl_token', value: token, url: test.info().project.use.baseURL! }]);
  await page.addInitScript(
    ({ token, role }) => {
      localStorage.setItem('mfsl_auth_token', token);
      localStorage.setItem(
        'mfsl_auth_user',
        JSON.stringify({ id: 1, role, full_name: 'BTS Admin' }),
      );
      localStorage.setItem('mfsl_admin_theme', 'dark');
    },
    { token, role },
  );
  let stations = structuredClone(fixture);
  await page.route('**/api/**', async (route) => {
    const url = new URL(route.request().url());
    const method = route.request().method();
    let data: unknown = {};
    if (url.pathname.endsWith('/auth/me')) data = { id: 1, role, full_name: 'BTS Admin' };
    else if (url.pathname.endsWith('/stations/nearest'))
      data = stations.map((station, index) => ({ ...station, distance_km: index * 0.5 }));
    else if (url.pathname.endsWith('/stations/geocode'))
      data = { lat: 21.3256, lng: 103.9188, label: 'Sơn La' };
    else if (/\/stations\/\d+$/.test(url.pathname)) {
      const id = Number(url.pathname.split('/').pop());
      if (method === 'DELETE') {
        stations = stations.filter((station) => station.id !== id);
        data = null;
      } else if (method === 'PUT') {
        stations = stations.map((station) =>
          station.id === id ? { ...station, ...route.request().postDataJSON() } : station,
        );
        data = stations.find((station) => station.id === id);
      }
    } else if (url.pathname.endsWith('/stations')) {
      if (method === 'POST') {
        const station = {
          ...route.request().postDataJSON(),
          id: 10,
          created_at: '2026-09-27',
          updated_at: '2026-09-27',
        };
        stations.push(station);
        data = station;
      } else {
        const statuses = url.searchParams.get('status')?.split(',');
        const search = url.searchParams.get('search')?.toLocaleLowerCase() ?? '';
        const type = url.searchParams.get('type');
        const bounds = url.searchParams.get('bbox')?.split(',').map(Number);
        const items = stations.filter(
          (station) =>
            (!statuses || statuses.includes(station.status)) &&
            (!type || station.type === type) &&
            `${station.code} ${station.name}`.toLocaleLowerCase().includes(search) &&
            (!bounds ||
              (station.longitude >= bounds[0] &&
                station.latitude >= bounds[1] &&
                station.longitude <= bounds[2] &&
                station.latitude <= bounds[3])),
        );
        data = { items, total: items.length, page: 1, limit: 1000 };
      }
    }
    await route.fulfill({ json: { success: true, data, message: '' } });
  });
  // Tests verify Leaflet behavior without relying on external tile availability.
  await page.route('https://tile.openstreetmap.org/**', (route) =>
    route.fulfill({
      contentType: 'image/svg+xml',
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><rect width="256" height="256" fill="#d9e3df"/><path d="M0 128H256M128 0V256" stroke="#bbc9c3"/></svg>',
    }),
  );
}

test('BTS map: clusters, filters, layers, nearest, safe popup and Excel', async ({ page }) => {
  test.setTimeout(120000);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await setup(page);
  await page.goto('/admin/stations');
  await expect(page.getByRole('heading', { name: 'Danh sách trạm (3)' })).toBeVisible();
  await expect(page.locator('.marker-cluster').first()).toBeVisible();
  await page.getByLabel('Vùng phủ sóng ước tính', { exact: true }).check();
  await expect(page.locator('.leaflet-overlay-pane path')).toHaveCount(3);
  await page.getByLabel('Heatmap mật độ trạm').check();
  await expect(page.locator('.leaflet-heatmap-layer')).toBeVisible();
  await page.getByLabel('Heatmap mật độ trạm').uncheck();
  await expect(page.locator('.leaflet-heatmap-layer')).toHaveCount(0);
  await page.getByText('Trạng thái (tất cả)', { exact: true }).click();
  await page.getByRole('checkbox', { name: 'Hoạt động', exact: true }).check();
  await expect(page.getByRole('heading', { name: 'Danh sách trạm (1)' })).toBeVisible();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Xuất Excel' }).click();
  const download = await downloadPromise;
  const workbook = XLSX.readFile((await download.path())!);
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(
    workbook.Sheets[workbook.SheetNames[0]],
  );
  expect(rows).toHaveLength(1);
  expect(rows[0]['Mã trạm']).toBe('SL-001');
  expect(rows[0]['Công suất (W)']).toBe(40);
  await page.getByLabel('Địa chỉ hoặc vĩ độ, kinh độ').fill('21.3256, 103.9188');
  await page.getByRole('button', { name: 'Tìm vị trí', exact: true }).click();
  await expect(page.getByRole('list', { name: 'Trạm gần nhất' }).getByRole('button')).toHaveCount(
    3,
  );
  await page
    .getByRole('list', { name: 'Trạm gần nhất' })
    .getByRole('button', { name: /SL-002/ })
    .click();
  const incidentPopup = page.locator('.leaflet-popup-content').filter({ hasText: 'SL-002' });
  await expect(incidentPopup).toContainText('Trạng thái: Sự cố');
  await expect(incidentPopup).toContainText(
    '<img src=x onerror=alert(1)>',
  );
  await expect(page.locator('.leaflet-popup-content img')).toHaveCount(0);
  await page.getByLabel('Tìm tên hoặc mã trạm').fill('SL-003');
  await expect(page.getByRole('heading', { name: 'Danh sách trạm (1)' })).toBeVisible();
  await page.getByRole('list', { name: 'Kết quả tìm trạm' }).getByRole('button').click();
  await expect(page.locator('.leaflet-popup-content').filter({ hasText: 'SL-003' })).toContainText('Trạm Mộc Châu');
  await page.getByRole('button', { name: 'Xóa bộ lọc' }).click();
  await expect(page.getByRole('heading', { name: 'Danh sách trạm (3)' })).toBeVisible();
  const viewportRequest = page.waitForRequest(
    (request) =>
      request.url().includes('/stations?') && new URL(request.url()).searchParams.has('bbox'),
  );
  await page.getByLabel('Chỉ tải trạm trong khung nhìn').check();
  await viewportRequest;
  expect(errors).toEqual([]);
});

test('BTS CRUD updates the map and supports mobile dark mode', async ({ page }) => {
  await setup(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/admin/stations');
  await page.getByRole('button', { name: 'Thêm trạm', exact: true }).click();
  const form = page.getByRole('region', { name: 'Thêm trạm BTS' });
  await form.getByLabel('Mã trạm', { exact: true }).fill('SL-010');
  await form.getByLabel('Tên trạm', { exact: true }).fill('Trạm kiểm thử');
  await form.getByLabel('Địa chỉ', { exact: true }).fill('Sơn La');
  await form.getByLabel('Vĩ độ').fill('21.34');
  await form.getByLabel('Kinh độ').fill('103.93');
  await form.getByRole('button', { name: 'Lưu trạm' }).click();
  await expect(page.getByRole('heading', { name: 'Danh sách trạm (4)' })).toBeVisible();
  const row = page.getByRole('row').filter({ hasText: 'SL-010' });
  await row.getByRole('button', { name: 'Sửa', exact: true }).click();
  await page
    .getByRole('region', { name: 'Chỉnh sửa SL-010' })
    .getByLabel('Tên trạm', { exact: true })
    .fill('Trạm cập nhật');
  await page.getByRole('button', { name: 'Lưu trạm' }).click();
  await expect(row).toContainText('Trạm cập nhật');
  page.once('dialog', (dialog) => dialog.accept());
  await row.getByRole('button', { name: 'Xóa', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Danh sách trạm (3)' })).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
  ).toBe(true);
  const map = await page.locator('.leaflet-container').boundingBox();
  const panel = await page.getByRole('complementary', { name: 'Bộ lọc và tìm trạm' }).boundingBox();
  expect(map!.y).toBeLessThan(panel!.y);
  await page.screenshot({ path: 'ui-artifacts/stations-mobile.png', fullPage: true });
});

test('non-admin cannot open BTS module', async ({ page }) => {
  await setup(page, 'chuyen_vien');
  await page.goto('/admin/stations');
  await expect(page).toHaveURL(/\/admin\/403/);
  await expect(page.getByRole('link', { name: 'Trạm BTS', exact: true })).toHaveCount(0);
});
