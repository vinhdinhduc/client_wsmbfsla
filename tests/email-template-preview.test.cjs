const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const test = require('node:test');
const ts = require('typescript');

const file = path.resolve(__dirname, '../lib/email-template-preview.ts');
const source = fs.readFileSync(file, 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText;
const loaded = new Module(file, module);
loaded.filename = file;
loaded.paths = Module._nodeModulePaths(path.dirname(file));
loaded._compile(compiled, file);
const {
  createDebouncer,
  findUnsupportedEmailVariables,
  highlightEmailHtml,
  insertAtSelection,
  replaceEmailVariables,
  sanitizeEmailHtml,
} = loaded.exports;

test('thay giá trị mẫu an toàn và không để lại biến trống', () => {
  const rendered = replaceEmailVariables('<p>{{customer_name}}</p><p>{{missing}}</p>', {
    customer_name: '<Mai>',
  });
  assert.equal(rendered, '<p>&lt;Mai&gt;</p>');
  assert.doesNotMatch(rendered, /{{/);
  assert.deepEqual(
    findUnsupportedEmailVariables('{{phone}} {{custmer_name}} {{custmer_name}}', ['phone']),
    ['custmer_name'],
  );
});

test('ẩn hàng và callout có biến rỗng trong preview', () => {
  const rendered = replaceEmailVariables(
    '<table><tbody><tr><td>Điện thoại</td><td>{{phone}}</td></tr></tbody></table><blockquote>{{message}}</blockquote><p>Xin chào {{customer_name}},</p>',
    { phone: '', message: '' },
  );
  assert.doesNotMatch(rendered, /Điện thoại|blockquote|Xin chào|{{phone}}|{{message}}/);
});

test('escape HTML trong tên khách hàng và nội dung liên hệ', () => {
  const rendered = replaceEmailVariables('<p>{{customer_name}}</p><p>{{message}}</p>', {
    customer_name: '<img src=x onerror=alert(1)>',
    message: '<script>alert(1)</script>',
  });
  assert.doesNotMatch(rendered, /<img|<script/);
  assert.match(rendered, /&lt;img/);
  assert.match(rendered, /&lt;script&gt;/);
});

test('chèn biến đúng vị trí và thay phần đang chọn', () => {
  assert.deepEqual(insertAtSelection('Chào khách', 5, 10, '{{customer_name}}'), {
    value: 'Chào {{customer_name}}',
    cursor: 22,
  });
});

test('highlight HTML tags, attributes, values and template variables safely', () => {
  const highlighted = highlightEmailHtml('<a href="{{confirm_url}}">Mở</a><script>');
  assert.match(highlighted, /class="htmlTag">a</);
  assert.match(highlighted, /class="htmlAttribute">href</);
  assert.match(highlighted, /class="htmlVariable">{{confirm_url}}/);
  assert.match(highlighted, /class="htmlTag">script</);
  assert.doesNotMatch(highlighted, /<script>/);
});

test('debounce chỉ phát giá trị mới nhất', async () => {
  const values = [];
  const schedule = createDebouncer((value) => values.push(value), 25);
  schedule('cũ');
  schedule('mới');
  await new Promise((resolve) => setTimeout(resolve, 45));
  assert.deepEqual(values, ['mới']);
});

test('fallback sanitize loại script, event handler và javascript URL', () => {
  const safe = sanitizeEmailHtml(
    '<p onclick="run()">Nội dung</p><script>alert(1)</script><a href="javascript:alert(1)">Link</a>',
  );
  assert.equal(safe.includes('<script'), false);
  assert.equal(safe.includes('onclick'), false);
  assert.equal(safe.includes('javascript:'), false);
});
