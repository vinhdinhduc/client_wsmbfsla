import { expect, test, type Page, type Route } from '@playwright/test';
import { readFileSync } from 'node:fs';
import type { AiChatLog, AiKnowledgeEntry, AiLogConversation, AiLogFilters, AiLogSelection } from '../lib/api/ai';

const path = '/admin/ai-chat-logs';
const user = { id: 1, role: 'admin', full_name: 'Quản trị kiểm thử', username: 'ui-test', status: 'active' };
const token = `ui.${Buffer.from(JSON.stringify({ role: 'admin', exp: 4102444800 })).toString('base64url')}.fixture`;
const session50 = '11111111-1111-4111-8111-111111111111';
const session1 = '22222222-2222-4222-8222-222222222222';
const fallback = 'Hiện chatbot chưa thể trả lời. Vui lòng gọi hotline MobiFone Sơn La để được hỗ trợ.';
const dangerousHtml = '<script>window.__logXss = true</script><img src=x onerror="window.__logXss = true">';
const originalQuestion = `Tư vấn MXH100 cho 0912345672 và admin@gmail.com ${dangerousHtml}`;
const maskedQuestion = `Tư vấn MXH100 cho 0912 *** 672 và a***@gmail.com ${dangerousHtml}`;
const faqKey = 'a'.repeat(64);

type RecordedRequest = { method: string; pathname: string; query: Record<string, string>; body?: Record<string, unknown> };
type FixtureState = {
  rows: AiChatLog[];
  requests: RecordedRequest[];
  deleted: Set<number>;
  batches: Map<string, number[]>;
  legacy: boolean;
  empty: boolean;
  listFailures: number;
  listGate?: Promise<void>;
  knowledge: AiKnowledgeEntry[];
};

function createRows(): AiChatLog[] {
  const base = Date.parse('2026-10-06T04:00:00.000Z');
  return Array.from({ length: 10_000 }, (_, index) => {
    const id = index + 1;
    const is_unanswered = id % 3 === 1;
    return {
      id,
      session_id: id <= 50 ? session50 : id === 51 ? session1 : `session-${id.toString().padStart(8, '0')}`,
      user_message: id === 1 ? maskedQuestion : id === 51 ? 'Cửa hàng mở cửa lúc mấy giờ?' : `Câu hỏi kiểm thử ${id}`,
      ai_response: is_unanswered ? fallback : `Trả lời kiểm thử ${id}. ${id === 2 ? dangerousHtml : ''}`,
      flagged_for_review: is_unanswered,
      was_helpful: id % 7 === 0 ? false : id % 5 === 0 ? true : null,
      feedback_comment: id === 7 ? 'Cần thông tin chính xác hơn.' : null,
      review_status: 'new',
      internal_note: null,
      knowledge_entry_id: null,
      question_key: id % 3 === 1 ? faqKey : `key-${id}`,
      created_at: new Date(base - index * 60_000).toISOString(),
      provider: 'gemini', model: 'gemini-2.5-flash', latency_ms: 1200,
      is_unanswered, has_contact_info: id === 1,
      diagnostics: {
        answer_status: is_unanswered ? 'unavailable' : 'answered', rag_enabled: true,
        retrieval_mode: 'keyword', retrieved_count: 1, max_score: null,
        sources: [{ type: 'package', id: 1, title: 'Gói cước MXH100', href: '/goi-cuoc/mxh100' }],
        fallback_reason: is_unanswered ? 'quota_or_rate_limit' : null,
      },
    };
  });
}

function normalize(value: string) {
  return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd');
}

function matches(row: AiChatLog, filters: AiLogFilters) {
  if (filters.search && !normalize(`${row.user_message} ${row.ai_response}`).includes(normalize(filters.search))) return false;
  if (filters.status && row.review_status !== filters.status) return false;
  if (filters.unanswered && !row.is_unanswered) return false;
  if (filters.feedback === 'positive' && row.was_helpful !== true) return false;
  if (filters.feedback === 'negative' && row.was_helpful !== false) return false;
  if (filters.from && new Date(row.created_at) < new Date(filters.from)) return false;
  if (filters.to && new Date(row.created_at) > new Date(filters.to)) return false;
  if (filters.tab === 'unanswered' && !row.is_unanswered) return false;
  if (filters.tab === 'needs_knowledge' && row.review_status !== 'needs_knowledge') return false;
  if (filters.tab === 'resolved' && row.review_status !== 'resolved') return false;
  if (filters.tab === 'disliked' && row.was_helpful !== false) return false;
  return true;
}

function conversations(rows: AiChatLog[]): AiLogConversation[] {
  const groups = new Map<string, AiChatLog[]>();
  for (const row of rows) {
    const items = groups.get(row.session_id) || [];
    items.push(row);
    groups.set(row.session_id, items);
  }
  return [...groups].map(([session_id, items]) => {
    const chronological = [...items].sort((a, b) => a.created_at.localeCompare(b.created_at));
    return {
      session_id, started_at: chronological[0].created_at, last_at: chronological.at(-1)!.created_at,
      message_count: items.length,
      // The contact question is deliberately visible as the conversation summary.
      first_question: session_id === session50 ? maskedQuestion : chronological[0].user_message,
      has_unanswered: items.some((item) => item.is_unanswered),
      has_contact_info: items.some((item) => item.has_contact_info),
    };
  });
}

function liveRows(state: FixtureState) {
  return state.empty ? [] : state.rows.filter((row) => !state.deleted.has(row.id));
}

function selectedRows(state: FixtureState, selection: AiLogSelection) {
  let rows = liveRows(state);
  if (selection.ids) rows = rows.filter((row) => selection.ids!.includes(row.id));
  else if (selection.session_ids) rows = rows.filter((row) => selection.session_ids!.includes(row.session_id));
  else if (selection.filter) rows = rows.filter((row) => matches(row, selection.filter!));
  if (selection.snapshot_max_id) rows = rows.filter((row) => row.id <= selection.snapshot_max_id!);
  if (selection.cleanup?.status) rows = rows.filter((row) => row.review_status === selection.cleanup!.status);
  if (selection.cleanup?.answered) rows = rows.filter((row) => !row.is_unanswered);
  if (selection.cleanup?.older_than_days) {
    const cutoff = Date.parse('2026-10-06T04:00:00.000Z') - selection.cleanup.older_than_days * 86_400_000;
    rows = rows.filter((row) => Date.parse(row.created_at) < cutoff);
  }
  return rows;
}

async function succeed(route: Route, data: unknown) {
  await route.fulfill({ json: { success: true, data, message: '' } });
}

async function installFixture(page: Page, options: Partial<Pick<FixtureState, 'legacy' | 'empty' | 'listFailures' | 'listGate' | 'knowledge'>> = {}) {
  const state: FixtureState = {
    rows: createRows(), requests: [], deleted: new Set(), batches: new Map(),
    legacy: false, empty: false, listFailures: 0, knowledge: [], ...options,
  };
  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const pathname = url.pathname.replace(/^\/api(?:\/v1)?/, '');
    const body = request.postData() ? request.postDataJSON() as Record<string, unknown> : undefined;
    state.requests.push({ method: request.method(), pathname, query: Object.fromEntries(url.searchParams), body });
    if (pathname === '/auth/me') return succeed(route, user);
    if (pathname === '/public/settings') return succeed(route, { ai_chatbot_enabled: 'false' });
    if (pathname === '/admin/ai-knowledge') {
      if (request.method() === 'POST') return succeed(route, { id: 81, ...body, updated_at: '2026-10-06T04:00:00Z' });
      return succeed(route, state.knowledge);
    }
    const knowledgeMatch = pathname.match(/^\/admin\/ai-knowledge\/(\d+)$/);
    if (knowledgeMatch) {
      const entry = state.knowledge.find((item) => item.id === Number(knowledgeMatch[1]));
      if (entry && request.method() === 'PUT') Object.assign(entry, body);
      return succeed(route, entry || null);
    }
    if (pathname === '/admin/ai-chat-logs') {
      if (state.listGate) await state.listGate;
      if (state.listFailures > 0) {
        state.listFailures--;
        return route.fulfill({ status: 503, json: { success: false, message: 'Không tải được lịch sử kiểm thử.', data: null } });
      }
      if (state.legacy) return succeed(route, liveRows(state).slice(0, 100).map((row) => ({
        id: row.id, session_id: row.session_id,
        user_message: row.id === 1 ? originalQuestion : row.user_message,
        ai_response: row.ai_response, flagged_for_review: row.flagged_for_review,
        was_helpful: row.was_helpful, feedback_comment: row.feedback_comment,
        created_at: row.created_at, provider: row.provider, model: row.model, latency_ms: row.latency_ms,
      })));
      const filters = Object.fromEntries(url.searchParams) as AiLogFilters;
      filters.unanswered = url.searchParams.get('unanswered') === 'true';
      const pageNumber = Math.max(1, Number(url.searchParams.get('page') || 1));
      const pageSize = Number(url.searchParams.get('page_size') || 20);
      const mode = url.searchParams.get('mode') || 'conversations';
      const rows = liveRows(state);
      const filtered = rows.filter((row) => matches(row, filters));
      let items: Array<AiChatLog | AiLogConversation>;
      if (mode === 'messages') items = [...filtered].sort((a, b) => b.created_at.localeCompare(a.created_at));
      else {
        const matchingSessions = new Set(filtered.map((row) => row.session_id));
        items = conversations(rows).filter((item) => matchingSessions.has(item.session_id)).sort((a, b) => b.last_at.localeCompare(a.last_at));
      }
      if (filters.sort === 'oldest') items.reverse();
      return succeed(route, {
        items: items.slice((pageNumber - 1) * pageSize, pageNumber * pageSize), total: items.length,
        page: pageNumber, page_size: pageSize, mode, snapshot_max_id: 10_000,
        tab_counts: {
          all: rows.length, unanswered: rows.filter((row) => row.is_unanswered).length,
          needs_knowledge: rows.filter((row) => row.review_status === 'needs_knowledge').length,
          resolved: rows.filter((row) => row.review_status === 'resolved').length,
          disliked: rows.filter((row) => row.was_helpful === false).length,
        },
      });
    }
    if (pathname === '/admin/ai-chat-logs/summary') {
      const rows = liveRows(state);
      return succeed(route, {
        conversations: conversations(rows).length, total_messages: rows.length, answered_rate: rows.length ? 66.67 : 0,
        unanswered: rows.filter((row) => row.is_unanswered).length, dislikes: rows.filter((row) => row.was_helpful === false).length,
        retention_days: 0,
        daily: Array.from({ length: 7 }, (_, index) => ({ day: `2026-10-${String(index + 1).padStart(2, '0')}`, total: 10 + index, unanswered: index + 1 })),
        faq: state.empty ? [] : [{ question_key: faqKey, question: 'Giá MXH100 là bao nhiêu?', count: 17, latest_at: '2026-10-06T04:00:00Z' }],
      });
    }
    const sessionMatch = pathname.match(/^\/admin\/ai-chat-logs\/sessions\/([^/]+)$/);
    if (sessionMatch) {
      const rows = liveRows(state).filter((row) => row.session_id === decodeURIComponent(sessionMatch[1]));
      if (request.method() === 'DELETE') {
        const batch_id = `batch-${state.batches.size + 1}`;
        rows.forEach((row) => state.deleted.add(row.id));
        state.batches.set(batch_id, rows.map((row) => row.id));
        return succeed(route, { affected: rows.length, batch_id });
      }
      return succeed(route, { items: [...rows].reverse(), total: rows.length, page: 1, page_size: 100 });
    }
    const reveal = pathname.match(/^\/admin\/ai-chat-logs\/(\d+)\/reveal$/);
    if (reveal) return succeed(route, { ...state.rows.find((row) => row.id === Number(reveal[1])), user_message: originalQuestion });
    if (pathname === '/admin/ai-chat-logs/bulk') {
      const rows = selectedRows(state, body as AiLogSelection);
      const requires_confirmation = rows.length > 0 && rows.length === liveRows(state).length;
      if (body?.action === 'preview_delete') return succeed(route, { count: rows.length, requires_confirmation });
      if (body?.action === 'resolve') {
        rows.forEach((row) => { row.review_status = 'resolved'; });
        return succeed(route, { count: rows.length, affected: rows.length });
      }
      if (requires_confirmation && body?.confirmation !== 'XOA') {
        return route.fulfill({ status: 400, json: { success: false, data: null, message: 'Gõ chính xác XOA để xóa toàn bộ lịch sử.' } });
      }
      if (body?.expected_count !== rows.length) {
        return route.fulfill({ status: 409, json: { success: false, data: null, message: 'Số lượng đã thay đổi. Hãy xem trước lại.' } });
      }
      const batch_id = `batch-${state.batches.size + 1}`;
      rows.forEach((row) => state.deleted.add(row.id));
      state.batches.set(batch_id, rows.map((row) => row.id));
      return succeed(route, { count: rows.length, affected: rows.length, batch_id });
    }
    if (pathname === '/admin/ai-chat-logs/restore') {
      const ids = state.batches.get(String(body?.batch_id)) || [];
      ids.forEach((id) => state.deleted.delete(id));
      return succeed(route, { affected: ids.length });
    }
    if (pathname === '/admin/ai-chat-logs/export') {
      return route.fulfill({
        contentType: 'text/csv; charset=utf-8',
        headers: { 'Content-Disposition': 'attachment; filename="hoi-thoai-ai.csv"' },
        body: '\uFEFFThời gian,Mã phiên,Câu hỏi,Trả lời,Trạng thái,Phản hồi\r\n06/10/2026 11:00,fixture,"\'=1+1",Kiểm thử,Mới,\r\n',
      });
    }
    const logMatch = pathname.match(/^\/admin\/ai-chat-logs\/(\d+)$/);
    if (logMatch) {
      const row = state.rows.find((item) => item.id === Number(logMatch[1]))!;
      if (request.method() === 'DELETE') {
        const batch_id = `batch-${state.batches.size + 1}`;
        state.deleted.add(row.id);
        state.batches.set(batch_id, [row.id]);
        return succeed(route, { affected: 1, batch_id });
      }
      Object.assign(row, body);
      return succeed(route, row);
    }
    return succeed(route, []);
  });
  return state;
}

test.beforeEach(async ({ page, context, baseURL }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await context.addCookies([{ name: 'mfsl_token', value: token, url: baseURL! }]);
  await page.addInitScript(({ token, user }) => {
    localStorage.setItem('mfsl_auth_token', token);
    localStorage.setItem('mfsl_auth_user', JSON.stringify(user));
    localStorage.setItem('mfsl_cookie_consent_v1', JSON.stringify({ value: 'necessary', at: new Date().toISOString() }));
  }, { token, user });
});

function listRequests(state: FixtureState) {
  return state.requests.filter((request) => request.pathname === '/admin/ai-chat-logs' && request.method === 'GET');
}

async function openPage(page: Page, suffix = '') {
  await page.goto(`${path}${suffix}`);
  await expect(page.getByRole('main').getByRole('heading', { name: 'Lịch sử hội thoại AI', exact: true })).toBeVisible();
}

for (const viewport of [{ width: 375, dark: false }, { width: 1440, dark: true }]) {
  test(`conversation layout at ${viewport.width}px${viewport.dark ? ' in dark mode' : ''} has no overflow or console errors`, async ({ page }, testInfo) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
    await page.setViewportSize({ width: viewport.width, height: 900 });
    await installFixture(page);
    await openPage(page);
    if (viewport.dark) await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
    await expect(page.getByText(/Hiển thị 1.?20 \/ 9[.,]?951/)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Mở hội thoại 11111111', exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.screenshot({ path: `docs/screenshots/ai-chat-logs-${viewport.width}${viewport.dark ? '-dark' : ''}.png`, fullPage: true });
    await page.getByRole('button', { name: 'Mở hội thoại 11111111', exact: true }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(`ai-chat-logs-${viewport.width}${viewport.dark ? '-dark' : ''}.png`) });
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    expect(errors).toEqual([]);
  });
}

test('server pagination handles 10,000 messages and remembers filters/page size in the URL', async ({ page }) => {
  const state = await installFixture(page);
  await openPage(page, '?mode=messages&page=3&page_size=50');
  await expect.poll(() => listRequests(state).some((request) => request.query.mode === 'messages' && request.query.page === '3' && request.query.page_size === '50')).toBe(true);
  await expect(page.getByText(/Hiển thị 101.?150 \/ 10[.,]?000/)).toBeVisible();
  await page.getByRole('button', { name: 'Trang sau', exact: true }).click();
  await expect.poll(() => listRequests(state).at(-1)?.query.page).toBe('4');
  await expect(page).toHaveURL(/page=4/);
  await page.getByLabel('Số mục mỗi trang', { exact: true }).selectOption('100');
  await expect.poll(() => listRequests(state).at(-1)?.query.page_size).toBe('100');
  await expect(page.getByText(/Hiển thị 1.?100 \/ 10[.,]?000/)).toBeVisible();
  await page.getByRole('searchbox', { name: 'Tìm hội thoại', exact: true }).fill('tu van');
  await expect.poll(() => listRequests(state).at(-1)?.query.search).toBe('tu van');
  await expect(page).toHaveURL(/search=tu\+van|search=tu%20van/);
  await expect(page.getByText(maskedQuestion, { exact: true })).toBeVisible();
  const url = page.url();
  await page.reload();
  await expect(page).toHaveURL(url);
  await expect(page.getByLabel('Số mục mỗi trang', { exact: true })).toHaveValue('100');
  await expect(page.getByRole('searchbox', { name: 'Tìm hội thoại', exact: true })).toHaveValue('tu van');
  expect(listRequests(state).every((request) => Number(request.query.page_size) <= 100)).toBe(true);
  await openPage(page, '?mode=messages&page=Infinity&page_size=9999');
  await expect(page.getByText(/Hiển thị 1.?20 \/ 10[.,]?000/)).toBeVisible();
  expect(listRequests(state).at(-1)?.query.page).toBe('1');
  expect(listRequests(state).at(-1)?.query.page_size).toBe('20');
});

test('thread drawer supports 1 and 50 messages, escapes HTML, masks PII and reveals only via POST', async ({ page }) => {
  const state = await installFixture(page);
  state.rows[0].internal_note = 'Liên hệ 0912345672, admin@gmail.com';
  await openPage(page);
  await page.getByRole('button', { name: 'Mở hội thoại 11111111', exact: true }).click();
  const drawer = page.getByRole('dialog');
  await expect(drawer.locator('[data-log-id]')).toHaveCount(50);
  await expect(drawer).not.toContainText('0912345672');
  await expect(drawer).not.toContainText('admin@gmail.com');
  const contactLog = drawer.locator('[data-log-id="1"]');
  await expect(contactLog).toContainText('0912 *** 672');
  await expect(contactLog).toContainText('a***@gmail.com');
  await contactLog.getByText('Ghi chú nội bộ', { exact: true }).click();
  await expect(contactLog.getByLabel('Ghi chú nội bộ', { exact: true })).toHaveValue('Liên hệ 0912 *** 672, a***@gmail.com');
  await expect(contactLog.getByLabel('Ghi chú nội bộ', { exact: true })).toBeDisabled();
  await expect(drawer.locator('script, img[src="x"]')).toHaveCount(0);
  expect(await page.evaluate(() => (window as unknown as { __logXss?: boolean }).__logXss)).toBeUndefined();
  await contactLog.getByRole('button', { name: 'Hiện thông tin liên hệ', exact: true }).click();
  await expect(contactLog).toContainText('0912345672');
  await expect(contactLog).toContainText('admin@gmail.com');
  await expect(contactLog.getByLabel('Ghi chú nội bộ', { exact: true })).toHaveValue('Liên hệ 0912345672, admin@gmail.com');
  await expect(contactLog.getByLabel('Ghi chú nội bộ', { exact: true })).toBeEnabled();
  expect(state.requests.filter((request) => request.pathname.endsWith('/1/reveal')).map((request) => request.method)).toEqual(['POST']);
  await contactLog.getByText('Chi tiết kỹ thuật', { exact: true }).click();
  await expect(contactLog).toContainText('gemini-2.5-flash');
  await expect(contactLog).toContainText('Gói cước MXH100');
  await expect(contactLog).toContainText(/Không áp dụng|từ khóa/i);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.keyboard.press('j');
  await expect(page.getByRole('button', { name: 'Mở hội thoại 22222222', exact: true })).toBeFocused();
  await page.keyboard.press('k');
  await expect(page.getByRole('button', { name: 'Mở hội thoại 11111111', exact: true })).toBeFocused();
  await page.keyboard.press('j');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog').locator('[data-log-id]')).toHaveCount(1);
  await expect(page.getByRole('dialog')).toContainText('Cửa hàng mở cửa lúc mấy giờ?');
});

test('review status and internal notes persist without changing customer feedback', async ({ page }) => {
  const state = await installFixture(page);
  await openPage(page);
  await page.getByRole('button', { name: 'Mở hội thoại 11111111', exact: true }).click();
  const item = page.getByRole('dialog').locator('[data-log-id="1"]');
  await item.getByLabel('Trạng thái xử lý', { exact: true }).selectOption('needs_knowledge');
  await expect.poll(() => state.rows[0].review_status).toBe('needs_knowledge');
  await item.getByText('Ghi chú nội bộ', { exact: true }).click();
  await item.getByLabel('Ghi chú nội bộ', { exact: true }).fill('Cần bổ sung cú pháp đăng ký đã xác nhận.');
  await item.getByRole('button', { name: 'Lưu ghi chú', exact: true }).click();
  await expect.poll(() => state.rows[0].internal_note).toBe('Cần bổ sung cú pháp đăng ký đã xác nhận.');
  const updates = state.requests.filter((request) => request.pathname === '/admin/ai-chat-logs/1' && request.method === 'PUT');
  expect(updates.length).toBeGreaterThanOrEqual(2);
  expect(updates.every((request) => request.body?.was_helpful === undefined)).toBe(true);
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Mở hội thoại 11111111', exact: true }).click();
  const saved = page.getByRole('dialog').locator('[data-log-id="1"]');
  await saved.getByText('Ghi chú nội bộ', { exact: true }).click();
  await expect(saved.getByLabel('Ghi chú nội bộ', { exact: true })).toHaveValue('Cần bổ sung cú pháp đăng ký đã xác nhận.');
});

test('an unanswered FAQ opens the knowledge form with a title and a group source', async ({ page }) => {
  const state = await installFixture(page);
  await openPage(page);
  const faq = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Câu hỏi thường gặp chưa trả lời được', exact: true }) });
  await expect(faq).toContainText('Giá MXH100 là bao nhiêu?');
  await expect(faq).toContainText('17');
  await faq.getByRole('link', { name: 'Thêm vào tri thức', exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/ai-knowledge\?/, { timeout: 30_000 });
  await expect(page.getByLabel('Tiêu đề tri thức', { exact: true })).toHaveValue('Giá MXH100 là bao nhiêu?');
  await expect(page.getByLabel('Nội dung tri thức', { exact: true })).toHaveValue('');
  await page.getByLabel('Nội dung tri thức', { exact: true }).fill('Nội dung xác thực do quản trị cung cấp, không tự tạo đáp án.');
  await page.getByRole('button', { name: 'Lưu', exact: true }).click();
  await expect.poll(() => state.requests.find((request) => request.pathname === '/admin/ai-knowledge' && request.method === 'POST')?.body?.source_question_key).toBe(faqKey);
});

test('bulk selection exports a Blob with the server filter and snapshot', async ({ page }) => {
  const state = await installFixture(page);
  await openPage(page);
  const bulkBar = page.getByRole('button', { name: 'Xuất', exact: true }).locator('xpath=../..');
  await expect(bulkBar).toHaveCSS('position', 'static');
  await page.getByLabel('Chọn tất cả trên trang', { exact: true }).check();
  await expect(bulkBar).toHaveCSS('position', 'sticky');
  await page.getByRole('button', { name: /Chọn tất cả .*kết quả/ }).click();
  const downloadEvent = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Xuất', exact: true }).click();
  const download = await downloadEvent;
  expect(download.suggestedFilename()).toMatch(/\.csv$/i);
  const downloaded = readFileSync((await download.path())!, 'utf8');
  expect(downloaded.charCodeAt(0)).toBe(0xfeff);
  expect(downloaded).toContain('Thời gian,Mã phiên,Câu hỏi');
  expect(downloaded).toContain("'=1+1");
  const request = state.requests.find((request) => request.pathname === '/admin/ai-chat-logs/export');
  expect(request?.method).toBe('POST');
  expect(request?.body?.filter).toBeTruthy();
  expect(request?.body?.snapshot_max_id).toBe(10_000);
});

test('bulk deleting all unfiltered results requires exact XOA after a 10,000-message preview', async ({ page }) => {
  const state = await installFixture(page);
  await openPage(page);
  await page.getByLabel('Chọn tất cả trên trang', { exact: true }).check();
  await page.getByRole('button', { name: /Chọn tất cả .*kết quả/ }).click();
  await page.getByRole('button', { name: 'Xóa', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Xem trước', exact: true }).click();
  await expect(dialog).toContainText(/Sẽ xóa 10[.,]?000 tin nhắn/);
  const preview = state.requests.filter((request) => request.pathname === '/admin/ai-chat-logs/bulk' && request.body?.action === 'preview_delete').at(-1);
  expect(preview?.body?.filter).toBeTruthy();
  expect(preview?.body?.cleanup).toBeUndefined();
  expect(preview?.body?.snapshot_max_id).toBe(10_000);
  const remove = dialog.getByRole('button', { name: 'Xóa lịch sử', exact: true });
  const confirmation = dialog.getByLabel('Gõ XOA để xác nhận', { exact: true });
  await expect(confirmation).toBeVisible();
  await expect(remove).toBeDisabled();
  await confirmation.fill('xoa');
  await expect(remove).toBeDisabled();
  await confirmation.fill(' XOA');
  await expect(remove).toBeDisabled();
  expect(state.deleted.size).toBe(0);
  expect(state.requests.filter((request) => request.pathname === '/admin/ai-chat-logs/bulk' && request.body?.action === 'delete')).toHaveLength(0);
  await confirmation.fill('XOA');
  await expect(remove).toBeEnabled();
  await remove.click();
  await expect.poll(() => state.deleted.size).toBe(10_000);
  const deletion = state.requests.filter((request) => request.pathname === '/admin/ai-chat-logs/bulk' && request.body?.action === 'delete').at(-1);
  expect(deletion?.body?.confirmation).toBe('XOA');
  expect(deletion?.body?.expected_count).toBe(10_000);
  expect(deletion?.body?.cleanup).toBeUndefined();
  expect(deletion?.body?.filter).toBeTruthy();
});

test('cleanup previews all results, requires XOA, deletes a batch and restores it', async ({ page }) => {
  const state = await installFixture(page);
  await openPage(page);
  await page.getByRole('button', { name: 'Dọn dẹp lịch sử', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Điều kiện dọn dẹp', { exact: true }).selectOption('all');
  await dialog.getByRole('button', { name: 'Xem trước', exact: true }).click();
  await expect.poll(() => state.requests.filter((request) => request.pathname === '/admin/ai-chat-logs/bulk').at(-1)?.body?.action).toBe('preview_delete');
  await expect(dialog).toContainText(/10[.,]?000/);
  const remove = dialog.getByRole('button', { name: 'Xóa lịch sử', exact: true });
  await expect(remove).toBeDisabled();
  await dialog.getByLabel('Gõ XOA để xác nhận', { exact: true }).fill('xoa');
  await expect(remove).toBeDisabled();
  await dialog.getByLabel('Gõ XOA để xác nhận', { exact: true }).fill('XOA');
  await remove.click();
  await expect.poll(() => state.deleted.size).toBe(10_000);
  const deletion = state.requests.filter((request) => request.pathname === '/admin/ai-chat-logs/bulk' && request.body?.action === 'delete').at(-1);
  expect(deletion?.body?.expected_count).toBe(10_000);
  expect(deletion?.body?.confirmation).toBe('XOA');
  expect((deletion?.body?.cleanup as { all?: boolean }).all).toBe(true);
  await page.getByRole('button', { name: 'Hoàn tác', exact: true }).click();
  await expect.poll(() => state.deleted.size).toBe(0);
  await expect(page.getByText(/Hiển thị 1.?20 \/ 9[.,]?951/)).toBeVisible();
  expect(state.requests.some((request) => request.pathname === '/admin/ai-chat-logs/restore' && request.method === 'POST' && request.body?.batch_id === 'batch-1')).toBe(true);
});

test('loading skeleton transitions to an empty state', async ({ page }) => {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  await installFixture(page, { empty: true, listGate: gate });
  await openPage(page);
  await expect(page.getByText('Đang tải lịch sử…', { exact: true })).toBeVisible();
  release();
  await expect(page.getByText('Chưa có hội thoại nào', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Trang sau', exact: true })).toHaveCount(0);
});

test('a failed list request offers a retry and then displays results', async ({ page }) => {
  const state = await installFixture(page, { listFailures: 100 });
  await openPage(page);
  await expect(page.getByText('Không tải được lịch sử kiểm thử.', { exact: true })).toBeVisible();
  state.listFailures = 0;
  await page.getByRole('button', { name: 'Thử lại', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Mở hội thoại 11111111', exact: true })).toBeVisible();
});

test('legacy array responses mask PII, describe the 100-row limit and never call new endpoints', async ({ page }) => {
  const state = await installFixture(page, { legacy: true });
  await openPage(page);
  await expect(page.getByText(/100.*(?:mới nhất|gần nhất)|(?:mới nhất|gần nhất).*100/)).toBeVisible();
  await expect(page.getByRole('main')).not.toContainText('0912345672');
  await expect(page.getByRole('main')).not.toContainText('admin@gmail.com');
  await page.screenshot({ path: 'docs/screenshots/ai-chat-logs-legacy-100.png', fullPage: true });
  await page.getByRole('button', { name: 'Mở hội thoại 11111111', exact: true }).click();
  await expect(page.getByRole('dialog').locator('[data-log-id]')).toHaveCount(50);
  await expect(page.getByRole('dialog')).not.toContainText('0912345672');
  await expect(page.getByRole('dialog')).not.toContainText('admin@gmail.com');
  await expect(page.getByRole('button', { name: 'Hiện thông tin liên hệ', exact: true })).toBeDisabled();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Dọn dẹp lịch sử', exact: true })).toBeDisabled();
  const newCalls = state.requests.filter((request) => request.pathname.startsWith('/admin/ai-chat-logs/'));
  expect(newCalls).toEqual([]);
});

test('direct knowledge prefill waits for log capability before saving linked source IDs', async ({ page }) => {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  const state = await installFixture(page, { listGate: gate });
  try {
    await page.goto('/admin/ai-knowledge?title=Gia%20MXH100&source_log_ids=1,2');
    await expect(page.getByLabel('Tiêu đề tri thức', { exact: true })).toHaveValue('Gia MXH100');
    await page.getByLabel('Nội dung tri thức', { exact: true }).fill('Câu trả lời xác thực cho câu hỏi nguồn.');
    await expect.poll(() => listRequests(state).length).toBe(1);
    const save = page.getByRole('button', { name: 'Lưu', exact: true });
    await expect(save).toBeDisabled();
    // The submit handler also guards keyboard/programmatic submit while capability is pending.
    await page.getByLabel('Tiêu đề tri thức', { exact: true }).evaluate((input) => {
      (input as HTMLInputElement).form!.requestSubmit();
    });
    expect(state.requests.filter((request) => request.pathname === '/admin/ai-knowledge' && request.method === 'POST')).toHaveLength(0);
    release();
    await expect(save).toBeEnabled();
    await save.click();
    await expect.poll(() => state.requests.find((request) => request.pathname === '/admin/ai-knowledge' && request.method === 'POST')?.body?.source_log_ids).toEqual([1, 2]);
    await expect(page.getByText('Đã lưu tri thức', { exact: true })).toBeVisible();
  } finally {
    release();
  }
});

test('direct existing knowledge edit clears conflicting source links even while capability is pending', async ({ page }) => {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  const existing: AiKnowledgeEntry = {
    id: 81, title: 'Tri thức đã lưu', content: 'Nội dung đã được xác nhận.',
    tags: 'goi-cuoc', status: 'active', updated_at: '2026-10-06T04:00:00Z',
  };
  const state = await installFixture(page, { listGate: gate, knowledge: [existing] });
  try {
    await page.goto('/admin/ai-knowledge?knowledge_id=81&title=Tieu%20de%20nguon&source_log_ids=1,2');
    await expect(page.getByRole('heading', { name: 'Sửa tri thức', exact: true })).toBeVisible();
    await expect(page.getByLabel('Tiêu đề tri thức', { exact: true })).toHaveValue(existing.title);
    await expect(page.getByLabel('Nội dung tri thức', { exact: true })).toHaveValue(existing.content);
    await expect(page.getByText(/Câu hỏi được lấy từ lịch sử hội thoại/)).toHaveCount(0);
    await page.getByLabel('Nội dung tri thức', { exact: true }).fill('Nội dung cập nhật có kiểm chứng.');
    const save = page.getByRole('button', { name: 'Lưu', exact: true });
    await expect(save).toBeEnabled();
    await save.click();
    await expect.poll(() => state.requests.find((request) => request.pathname === '/admin/ai-knowledge/81' && request.method === 'PUT')?.body?.content).toBe('Nội dung cập nhật có kiểm chứng.');
    const mutation = state.requests.find((request) => request.pathname === '/admin/ai-knowledge/81' && request.method === 'PUT');
    expect(mutation?.body?.source_log_ids).toBeUndefined();
    expect(mutation?.body?.source_question_key).toBeUndefined();
    expect(state.requests.filter((request) => request.pathname === '/admin/ai-knowledge' && request.method === 'POST')).toHaveLength(0);
    await expect(page.getByText('Đã lưu tri thức', { exact: true })).toBeVisible();
  } finally {
    release();
  }
});
