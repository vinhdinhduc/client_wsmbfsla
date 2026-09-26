// Run from the client directory. Uses only local fixtures, never the real API.
const fs = require('node:fs');
const http = require('node:http');
const { spawn } = require('node:child_process');
const loadConfig = require('next/dist/server/config').default;
const { PHASE_DEVELOPMENT_SERVER } = require('next/constants');
const stores = [1, 2].map((id) => ({
  id,
  name: `Cửa hàng kiểm tra ${id}`,
  address: `Địa chỉ ${id}`,
  district: '',
  full_address: `Phường kiểm tra ${id}, Sơn La`,
  ward_code: `ward-${id}`,
  phone: '18001090',
  lat: 21.3256 + id * 0.005,
  lng: 103.9188 + id * 0.005,
  opening_hours: '07:30 – 17:30',
  staff: [],
}));
async function main() {
  const config = await loadConfig(PHASE_DEVELOPMENT_SERVER, process.cwd());
  const backups = ['tsconfig.json', 'next-env.d.ts'].map((file) => [file, fs.readFileSync(file)]);
  config.distDir = `.next-ui-dev-${Date.now()}`;
  const api = http.createServer((req, res) => {
    const path = new URL(req.url, 'http://localhost').pathname;
    const data = path.endsWith('/public/stores')
      ? stores
      : path.endsWith('/public/wards')
        ? stores.map((store) => ({ code: store.ward_code, name_with_type: store.full_address }))
        : path.endsWith('/public/settings')
          ? { hotline: '18001090', ai_chatbot_enabled: 'false' }
          : path.endsWith('/public/sims')
            ? ['0762468888', '0898161986', '0899000111', '0901888999'].map((phone_number, index) => ({
                id: index + 1, phone_number, activation_fee: 60000, commitment_months: index ? null : 6,
                status: 'available', subscription_type: 'postpaid', catalog: 'so_dep',
              })).filter((sim) => {
                const params = new URL(req.url, 'http://localhost').searchParams;
                return (!params.get('prefix') || sim.phone_number.startsWith(params.get('prefix')))
                  && (!params.get('q') || sim.phone_number.includes(params.get('q').replaceAll('*', '')));
              })
            : path.endsWith('/public/packages')
              ? [90, 120, 200, 350].map((price, index) => ({
                  id: index + 1, code: `PT${price}`, name: `PT${price}`, slug: `pt${price}`,
                  group_type: 'tra_truoc', subscription_type: 'prepaid', service_type: 'mobile',
                  price: price * 1000, duration_value: 30, duration_unit: 'ngay',
                  data_desc: '4GB / ngày', call_desc: 'Miễn phí gọi nội mạng', status: 'active',
                }))
              : [];
    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify({ success: true, data, message: '' }));
  });
  api.listen(4003, '127.0.0.1', () => {
    const child = spawn(
      process.execPath,
      ['node_modules/next/dist/bin/next', 'dev', '-H', '127.0.0.1', '-p', '3003'],
      {
        stdio: 'inherit',
        env: {
          ...process.env,
          NEXT_PUBLIC_API_URL: 'http://127.0.0.1:4003/api/v1',
          __NEXT_PRIVATE_STANDALONE_CONFIG: JSON.stringify(config),
        },
      },
    );
    const restore = () => {
      for (const [file, content] of backups) fs.writeFileSync(file, content);
      api.close();
    };
    child.on('exit', restore);
    process.on('SIGINT', () => child.kill());
    process.on('SIGTERM', () => child.kill());
  });
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
