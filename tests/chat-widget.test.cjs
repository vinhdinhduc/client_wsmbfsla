const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const test = require('node:test');
const ts = require('typescript');
const file = path.resolve(__dirname, '../lib/chat-widget.ts');
const compiled = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
const loaded = new Module(file, module); loaded.filename = file; loaded.paths = Module._nodeModulePaths(path.dirname(file)); loaded._compile(compiled, file);
const helpers = loaded.exports;
test('HTML and dangerous URL protocols cannot become chat links', () => {
  for (const href of ['javascript:alert(1)', 'data:text/html,boom', '//evil.test', '/\\evil.test', 'https://user:pass@evil.test', 'https://example.com\nboom', 'tel:1']) assert.equal(helpers.safeChatHref(href), undefined);
  assert.equal(helpers.safeChatHref('tel:02123758758'), 'tel:02123758758');
  assert.equal(helpers.safeChatHref('/goi-cuoc/tk135'), '/goi-cuoc/tk135');
});
test('placeholder templates are blocked including multiline and restored history', () => {
  assert.deepEqual(helpers.safeSources([{ title: '[ĐIỀN: tên gói]', href: '/goi-cuoc/tk135' }]), []);
  for (const text of ['[ĐIỀN: địa chỉ]', '[XÁC NHẬN: giá]', '{{price}}', '{{\nphone\n}}']) assert.equal(helpers.hasKnowledgePlaceholder(text), true);
  const restored = helpers.restoreHistory([{ id: '1', role: 'assistant', text: '{{price}}', sources: [{ title: 'Price', href: '/goi-cuoc/tk135' }] }]);
  assert.equal(restored[0].text, helpers.UNCONFIRMED_REPLY); assert.equal(restored[0].needsHuman, true); assert.deepEqual(restored[0].sources, []);
});
test('malformed storage and untrusted sources do not restore unsafe fields', () => {
  assert.deepEqual(helpers.restoreHistory({ text: 'bad' }), []);
  assert.deepEqual(helpers.restoreHistory([null, 3, {}, { id: 'x', role: 'system', text: 'bad' }]), []);
  const restored = helpers.restoreHistory([{ id: 'x', role: 'assistant', text: 'safe', createdAt: 'invalid', sources: [{ title: 'x', href: '/cua-hang' }, { title: 'evil', href: '/cua-hang/../admin' }], answerId: -1 }]);
  assert.equal(restored[0].createdAt, undefined); assert.equal(restored[0].answerId, undefined); assert.equal(restored[0].sources.length, 1);
});
test('configured suggestions keep current defaults on invalid configuration', () => {
  assert.deepEqual(helpers.configuredSuggestions('["Giờ làm việc","Giờ làm việc"]'), ['Giờ làm việc']);
  assert.deepEqual(helpers.configuredSuggestions('{malformed}'), helpers.DEFAULT_CHAT_SUGGESTIONS);
});
test('working hours use Vietnam time, inclusive opening and exclusive closing', () => {
  const hours = 'Thứ Hai – Chủ Nhật: 07:30 – 19:00';
  assert.equal(helpers.staffAvailability(hours, new Date('2026-10-06T00:30:00Z')), 'open');
  assert.equal(helpers.staffAvailability(hours, new Date('2026-10-06T12:00:00Z')), 'closed');
  assert.equal(helpers.staffAvailability('Thứ Hai – Thứ Bảy: 07:30 – 17:30', new Date('2026-10-04T03:00:00Z')), 'closed');
  assert.equal(helpers.staffAvailability('Giờ hành chính'), 'unknown');
  assert.equal(helpers.staffAvailability('Thứ Hai – Thứ Bảy: 07:30 – 11:30, 13:30 – 17:30'), 'unknown');
});
