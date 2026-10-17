const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const test = require('node:test');
const ts = require('typescript');
const file = path.resolve(__dirname, '../lib/jobs-presentation.ts');
const compiled = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText;
const loaded = new Module(file, module); loaded.filename = file; loaded.paths = Module._nodeModulePaths(path.dirname(file)); loaded._compile(compiled, file);
const { normalizeJobContent, jobDeadline, validateApplication, validateCv, jobPostingSchema } = loaded.exports;

test('normalizes the exact requirements and benefits from the public example without splitting salary ranges', () => {
  const requirements = '- Tốt nghiệp Cao đẳng trở lên.\n- Ngoại hình ưa nhìn, giọng nói rõ ràng, thái độ phục vụ tốt.\n- Thành thạo tin học văn phòng.\n- Có thể làm việc theo ca, kể cả thứ Bảy.';
  const benefits = '- Thu nhập 7 - 10 triệu đồng/tháng cộng thưởng chất lượng dịch vụ.\n- Đồng phục và trang thiết bị làm việc do công ty cấp.\n- Môi trường làm việc chuyên nghiệp, ổn định.\n- Chế độ nghỉ lễ, phép năm theo quy định.';
  assert.equal((normalizeJobContent(requirements).match(/<li>/g) || []).length, 4);
  const html = normalizeJobContent(benefits);
  assert.equal((html.match(/<li>/g) || []).length, 4);
  assert.ok(html.includes('<li>Thu nhập 7 - 10 triệu đồng/tháng cộng thưởng chất lượng dịch vụ.</li>'));
  assert.equal(requirements.includes('<li>'), false);
});
test('preserves introduction, inline bullets and line breaks', () => {
  assert.equal(normalizeJobContent('Yêu cầu:\n- Có kinh nghiệm\nLàm theo ca - Làm việc nhóm'), '<p>Yêu cầu:</p><ul><li>Có kinh nghiệm<br />Làm theo ca</li><li>Làm việc nhóm</li></ul>');
  assert.equal(normalizeJobContent('Tiếp đón khách.\nHỗ trợ dịch vụ.'), '<p>Tiếp đón khách.<br />Hỗ trợ dịch vụ.</p>');
});
test('filters stored HTML and encoded unsafe links using the required tag allowlist', () => {
  const html = normalizeJobContent('<h2 onclick="run()">Yêu cầu</h2><script>boom()</script><img src=x onerror=run()><iframe src=x>bad</iframe><ul><li><strong>Tốt</strong><a href="java&#x73;cript:alert(1)">X</a></li></ul><a href="https://example.com" onclick="run()">Link</a>');
  assert.ok(html.includes('<strong>Tốt</strong>'));
  assert.ok(html.includes('href="https://example.com"'));
  assert.equal(/<script|<img|<iframe|onclick|javascript:|boom\(/i.test(html), false);
});
test('uses Vietnam midnight and includes the full deadline day', () => {
  assert.equal(jobDeadline('2026-10-12', 'recruiting', Date.parse('2026-10-06T23:30:00+07:00')).days, 6);
  assert.equal(jobDeadline('2026-10-12', 'recruiting', Date.parse('2026-10-07T00:00:00+07:00')).days, 5);
  assert.equal(jobDeadline('2026-10-12', 'recruiting', Date.parse('2026-10-12T23:59:59+07:00')).closed, false);
  assert.equal(jobDeadline('2026-10-12', 'recruiting', Date.parse('2026-10-13T00:00:00+07:00')).closed, true);
  assert.equal(jobDeadline('2026-10-12', 'paused', Date.parse('2026-10-06T00:00:00+07:00')).closed, true);
  assert.equal(jobDeadline('2026-09-01', 'recruiting', Date.parse('2026-10-06T00:00:00+07:00')).closedLongAgo, true);
  assert.equal(jobDeadline('2027-01-01', 'paused', Date.parse('2026-10-06T00:00:00+07:00'), '2026-08-01T00:00:00+07:00').closedLongAgo, true);
});
test('accepts formatted Vietnam mobile numbers and rejects invalid applicant data', () => {
  const valid = { full_name: 'An', phone: '+84 912 345 678', email: 'an@example.com', introduction: '' };
  assert.deepEqual(validateApplication(valid), {});
  assert.deepEqual(Object.keys(validateApplication({ ...valid, full_name: 'A', phone: '0212345678', email: 'bad', introduction: 'x'.repeat(1001) })), ['full_name', 'phone', 'email', 'introduction']);
});
test('checks CV extensions, declared MIME, empty files and size', () => {
  const cv = { name: 'cv.pdf', type: 'application/pdf', size: 100 };
  assert.equal(validateCv(cv), undefined);
  for (const invalid of [{ ...cv, name: 'cv.exe' }, { ...cv, type: 'text/html' }, { ...cv, size: 0 }, { ...cv, size: 5 * 1024 * 1024 + 1 }]) assert.ok(validateCv(invalid));
});
test('maps legacy employment types and only includes salary when published', () => {
  const job = { title: 'Giao dịch viên', slug: 'giao-dich-vien', employment_type: 'Toàn thời gian', description: '<script>boom()</script><p>Công việc</p>', benefits: 'Thu nhập đồng/tháng', location: 'Sơn La', deadline: '2026-10-12', created_at: '2026-09-28', salary_type: 'range', salary_min: '7000000', salary_max: '10000000' };
  const schema = jobPostingSchema(job, 'https://example.com');
  assert.equal(schema.employmentType, 'FULL_TIME'); assert.equal(schema.baseSalary.value.minValue, 7000000); assert.equal(schema.baseSalary.value.unitText, 'MONTH');
  assert.equal(schema.description.includes('<script'), false);
  assert.equal(jobPostingSchema({ ...job, salary_type: 'hidden' }, 'https://example.com').baseSalary, undefined);
});
