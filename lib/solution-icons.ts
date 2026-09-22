import { iconNames, type IconName } from 'lucide-react/dynamic';

const availableIcons = new Set<string>(iconNames);

/** Accept both new kebab-case values and PascalCase values already stored in the DB. */
export function resolveSolutionIcon(value: string | null | undefined): IconName | null {
  if (!value) return null;
  const kebab = value
    .replace(/([A-Z])([A-Z][a-z])/g, '$1-$2')
    .replace(/([a-z\d])([A-Z])/g, '$1-$2')
    .toLowerCase();
  return availableIcons.has(kebab) ? (kebab as IconName) : null;
}

export const solutionIconNames = iconNames;

export type SolutionIconGroup = 'all' | 'security' | 'business' | 'connectivity' | 'people' | 'other';

export const solutionIconGroups: Array<{ value: SolutionIconGroup; label: string }> = [
  { value: 'all', label: 'Tất cả' },
  { value: 'security', label: 'Bảo mật' },
  { value: 'business', label: 'Kinh doanh' },
  { value: 'connectivity', label: 'Kết nối' },
  { value: 'people', label: 'Con người' },
  { value: 'other', label: 'Khác' },
];

const vietnameseKeywords: Array<{ matches: string[]; terms: string[] }> = [
  { matches: ['lock', 'key', 'shield'], terms: ['khóa', 'bảo mật'] },
  { matches: ['signature', 'pen-tool', 'pen-line', 'file-pen'], terms: ['chữ ký', 'ký tên'] },
  { matches: ['phone', 'smartphone'], terms: ['điện thoại', 'gọi'] },
  { matches: ['wifi', 'network', 'radio', 'signal'], terms: ['mạng', 'kết nối'] },
  { matches: ['users', 'user', 'contact'], terms: ['người dùng', 'khách hàng'] },
  { matches: ['building', 'store'], terms: ['cửa hàng', 'doanh nghiệp'] },
  { matches: ['chart', 'trending'], terms: ['biểu đồ', 'thống kê'] },
  { matches: ['calendar', 'clock'], terms: ['lịch', 'thời gian'] },
  { matches: ['file', 'folder'], terms: ['tài liệu', 'hồ sơ'] },
];

function normalizeSearch(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').toLowerCase().trim();
}

export function solutionIconGroup(name: string): Exclude<SolutionIconGroup, 'all'> {
  if (/(lock|key|shield|fingerprint|scan|eye)/.test(name)) return 'security';
  if (/(briefcase|building|chart|coins|wallet|shopping|store|receipt|calendar)/.test(name)) return 'business';
  if (/(wifi|cloud|network|radio|phone|signal|bluetooth|server|database)/.test(name)) return 'connectivity';
  if (/(user|contact|handshake|heart|message)/.test(name)) return 'people';
  return 'other';
}

export function searchSolutionIcons(query: string, group: SolutionIconGroup = 'all'): IconName[] {
  const term = normalizeSearch(query);
  return solutionIconNames.filter((name) => {
    if (group !== 'all' && solutionIconGroup(name) !== group) return false;
    if (!term) return true;
    if (normalizeSearch(name).includes(term)) return true;
    return vietnameseKeywords.some(({ matches, terms }) =>
      terms.some((keyword) => normalizeSearch(keyword).includes(term)) && matches.some((part) => name.includes(part)),
    );
  });
}
