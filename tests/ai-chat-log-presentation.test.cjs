const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const test = require('node:test');
const ts = require('typescript');
const file = path.resolve(__dirname, '../lib/ai-chat-log-presentation.ts');
const compiled = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const loaded = new Module(file, module);
loaded.filename = file;
loaded.paths = Module._nodeModulePaths(path.dirname(file));
loaded._compile(compiled, file);
const helpers = loaded.exports;

test('contact masking handles local, international, formatted and fixed-line Vietnamese phones', () => {
  for (const phone of ['0912345672', '+84912345672', '+84 912 345 672', '0912.345.672', '(0912) 345-672', '+84\u00a0912\u00a0345\u00a0672', '0912\u202f345\u202f672', '0912\u200c345\u200d672', '0912\u0000345\u0001672']) {
    assert.equal(helpers.maskContactInfo(`Gọi ${phone}.`), 'Gọi 0912 *** 672.');
    assert.equal(helpers.hasContactInfo(phone), true);
  }
  assert.equal(helpers.maskContactInfo('02123758758 hoặc Alice.Tag+sales@Gmail.com'), '0212 *** 758 hoặc A***@Gmail.com');
  assert.equal(helpers.hasContactInfo('Gói 100.000đ, ngày 06/10/2026'), false);
  assert.equal(helpers.maskContactInfo('12309123456720'), '12309123456720');
  assert.equal(helpers.maskContactInfo('a@gmail.com b@example.vn'), 'a***@gmail.com b***@example.vn');
  assert.equal(helpers.hasContactInfo('Liên hệ 0912 *** 672'), true);
  assert.equal(helpers.hasContactInfo('Liên hệ a***@gmail.com'), true);
  for (let repeat = 0; repeat < 3; repeat++) assert.equal(helpers.hasContactInfo('0912345672'), true);
});

test('question grouping ignores accents, case and punctuation while preserving question meaning', () => {
  assert.equal(helpers.normalizeLogQuestion('GÓI cước nào rẻ???'), helpers.normalizeLogQuestion('goi cuoc nao re'));
  assert.equal(helpers.normalizeLogQuestion('Đăng ký TK135!'), 'dang ky tk135');
  assert.equal(helpers.normalizeLogQuestion('ĐĂNG KÝ TK135, giúp tôi!'), helpers.normalizeLogQuestion('Dang ky tk135 giup toi'));
});

test('fallback detection respects explicit backend classification and legacy fallback text', () => {
  assert.equal(helpers.isUnansweredLog({ ai_response: 'Chào bạn, MobiFone Chi nhánh Sơn La hiện không có thông tin về gói cước MXH100 trong dữ liệu được cung cấp. Vui lòng gọi hotline để được hỗ trợ.' }), true);
  assert.equal(helpers.isUnansweredLog({ ai_response: 'Gói TK135 giá 135000đ nhưng hiện không có thông tin về ưu đãi trong dữ liệu được cung cấp.' }), false);
  assert.equal(helpers.isUnansweredLog({ ai_response: 'Hiện chatbot chưa thể trả lời. Vui lòng gọi hotline.' }), true);
  assert.equal(helpers.isUnansweredLog({ ai_response: 'Tôi chưa có thông tin đã được xác nhận để trả lời câu hỏi này.' }), true);
  assert.equal(helpers.isUnansweredLog({ ai_response: 'Gói MXH100 giá 100.000đ.' }), false);
  assert.equal(helpers.isUnansweredLog({ ai_response: 'Hiện không có thông tin về gói cước MXH100 trong dữ liệu được cung cấp. Vui lòng liên hệ nhân viên.' }), true);
  assert.equal(helpers.isUnansweredLog({ ai_response: 'Gói TK135 có giá 135.000đ, chu kỳ 30 ngày. Hiện không có thông tin về ưu đãi cụ thể trong dữ liệu được cung cấp.' }), false);
  assert.equal(helpers.isUnansweredLog({ ai_response: 'Hiện chatbot chưa thể trả lời.', is_unanswered: false }), false);
  assert.equal(helpers.isUnansweredLog({ ai_response: 'Hãy gọi hotline.', fallback_reason: 'provider_error' }), true);
  assert.equal(helpers.logReviewStatus({ flagged_for_review: true }), 'needs_knowledge');
  assert.equal(helpers.logReviewStatus({ flagged_for_review: true, review_status: 'resolved' }), 'resolved');
});

test('dates use Vietnam timezone and handle missing or future timestamps safely', () => {
  assert.equal(helpers.formatLogDate('2026-10-05T18:05:06Z'), '06/10/2026 01:05');
  assert.equal(helpers.formatLogDate('2026-10-05T18:05:06Z', true), '06/10/2026 01:05:06');
  assert.equal(helpers.relativeLogTime('2026-10-06T00:00:00Z', Date.parse('2026-10-06T00:05:00Z')), '5 phút trước');
  assert.equal(helpers.relativeLogTime('invalid'), 'Không rõ thời gian');
  assert.equal(helpers.relativeLogTime('2026-10-06T00:00:10Z', Date.parse('2026-10-06T00:00:00Z')), 'Vừa xong');
});

test('CSV quotes multiline text, escapes formulas after control characters, and masks contact data', () => {
  for (const attack of ['=HYPERLINK("bad")', '+cmd', '-2+3', '@SUM(1)', '\t =1+1', '\r\n@SUM(1)', '\uFEFF=1']) {
    assert.equal(helpers.safeCsvCell(attack).startsWith('"\''), true, attack);
  }
  assert.equal(helpers.safeCsvCell('hello,"world"\nnext'), '"hello,""world""\nnext"');
  const csv = helpers.createLogCsv([{ session_id: '=bad', user_message: 'Gọi 0912345672 hoặc +84\u00a0912\u00a0345\u00a0672', ai_response: '<script>"hi"</script>\nEmail alice@gmail.com', created_at: '2026-10-06T00:00:00Z', was_helpful: false }]);
  assert.equal(csv.startsWith('\uFEFF'), true);
  assert.equal(csv.includes('0912345672'), false);
  assert.equal(csv.includes('+84\u00a0912\u00a0345\u00a0672'), false);
  assert.equal(csv.includes('alice@gmail.com'), false);
  assert.equal(csv.includes('"\'=bad"'), true);
  assert.equal(csv.includes('<script>""hi""</script>'), true);
});
