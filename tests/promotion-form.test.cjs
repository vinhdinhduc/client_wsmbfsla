const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const test = require('node:test');
const ts = require('typescript');

const file = path.resolve(__dirname, '../app/(admin)/admin/promotions/form.ts');
const compiled = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const loaded = new Module(file, module);
loaded.filename = file;
loaded.paths = Module._nodeModulePaths(path.dirname(file));
loaded._compile(compiled, file);
const { toVietnamInput, fromVietnamInput, promotionDefaults, promotionFormSchema, toPromotionInput } = loaded.exports;

function valid(overrides = {}) {
  return { ...promotionDefaults(), name: 'Ưu đãi tháng 10', content: 'Tặng thêm data.\nÁp dụng cho thuê bao mới.', ...overrides };
}

test('keeps Vietnam scheduled hours independent of browser timezone, including day rollover', () => {
  assert.equal(toVietnamInput('2026-10-13T20:00:00Z'), '2026-10-14T03:00');
  assert.equal(fromVietnamInput('2026-10-14T03:00'), '2026-10-13T20:00:00.000Z');
  assert.equal(toVietnamInput(null), '');
  assert.equal(fromVietnamInput(''), null);
  assert.equal(fromVietnamInput('bad-date'), null);
});

test('rejects reversed schedules, incomplete buttons and unsafe links', () => {
  for (const fields of [
    { start_at: '2026-10-14T08:00', end_at: '2026-10-14T07:59' },
    { cta_text: 'Xem ngay', cta_link: '' },
    { cta_link: '/goi-cuoc', cta_text: '' },
    { cta_link: 'javascript:alert(1)', cta_text: 'Xem ngay' },
    { image_url: '//example.com/banner.webp' },
    { cta_link: '/\\example.com', cta_text: 'Xem ngay' },
  ]) assert.equal(promotionFormSchema.safeParse(valid(fields)).success, false);
  assert.equal(promotionFormSchema.safeParse(valid({ cta_text: 'Xem ngay', cta_link: 'https://example.com/promotion' })).success, true);
});

test('normalizes scopes, optional fields and schedule into API input without UI fields', () => {
  const result = toPromotionInput(promotionFormSchema.parse(valid({
    page_scope: 'specific', paths: '/goi-cuoc\n/sim-so-dep,/goi-cuoc',
    start_at: '2026-10-14T08:00', trigger_type: 'immediate', trigger_value: 3,
  })));
  assert.deepEqual(result.target_pages, ['/goi-cuoc', '/sim-so-dep']);
  assert.equal(result.start_at, '2026-10-14T01:00:00.000Z');
  assert.equal(result.end_at, null);
  assert.equal(result.cta_text, null);
  assert.equal(result.image_url, null);
  assert.equal(result.trigger_value, 0);
  assert.equal('page_scope' in result, false);
  assert.equal('paths' in result, false);
  assert.deepEqual(toPromotionInput(valid({ page_scope: 'home' })).target_pages, ['/']);
  assert.deepEqual(toPromotionInput(valid({ page_scope: 'all', paths: '/old' })).target_pages, []);
});

test('validates trigger thresholds and page paths before creating an active campaign', () => {
  for (const fields of [
    { trigger_type: 'scroll', trigger_value: 101 },
    { trigger_type: 'delay', trigger_value: 3601 },
    { trigger_type: 'delay', trigger_value: 1.5 },
    { page_scope: 'specific', paths: '' },
    { page_scope: 'specific', paths: 'https://example.com/goi-cuoc' },
    { page_scope: 'specific', paths: '/goi-cuoc?tracking=1' },
  ]) assert.equal(promotionFormSchema.safeParse(valid(fields)).success, false);
  assert.equal(promotionFormSchema.safeParse(valid({ trigger_type: 'scroll', trigger_value: 0 })).success, true);
});
