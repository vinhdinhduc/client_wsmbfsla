const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const test = require('node:test');
const ts = require('typescript');

const file = path.resolve(__dirname, '../lib/solution-icons.ts');
const source = fs.readFileSync(file, 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const loaded = new Module(file, module);
loaded.filename = file;
loaded.paths = Module._nodeModulePaths(path.dirname(file));
loaded._compile(compiled, file);
const { solutionIconNames, resolveSolutionIcon, searchSolutionIcons } = loaded.exports;

test('danh mục Lucide đầy đủ và tương thích tên PascalCase cũ', () => {
  assert.ok(solutionIconNames.length > 1500);
  assert.equal(resolveSolutionIcon('LockKeyhole'), 'lock-keyhole');
  assert.equal(resolveSolutionIcon('lock-keyhole'), 'lock-keyhole');
  assert.equal(resolveSolutionIcon('<script>'), null);
});

test('tìm icon không phân biệt dấu tiếng Việt', () => {
  assert.ok(searchSolutionIcons('khóa').includes('lock'));
  assert.ok(searchSolutionIcons('khoa').includes('lock'));
  assert.ok(searchSolutionIcons('lock').includes('lock'));
  assert.ok(searchSolutionIcons('chữ ký').some((name) => name.includes('signature') || name.includes('pen')));
  assert.ok(searchSolutionIcons('khóa', 'business').every((name) => !name.includes('lock')));
});
