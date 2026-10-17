import sanitizeHtml from 'sanitize-html';
import type { Job } from './api/jobs';

export const JOB_EMPLOYMENT_LABELS: Record<string, string> = {
  full_time: 'Toàn thời gian',
  part_time: 'Bán thời gian',
  contract: 'Hợp đồng',
  internship: 'Thực tập',
};
const employmentSchema: Record<string, string> = {
  full_time: 'FULL_TIME',
  part_time: 'PART_TIME',
  contract: 'CONTRACTOR',
  internship: 'INTERN',
  'Toàn thời gian': 'FULL_TIME',
  'Bán thời gian': 'PART_TIME',
  'Hợp đồng': 'CONTRACTOR',
  'Thực tập': 'INTERN',
};
const escapeText = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
const preserveLines = (value: string) => escapeText(value.trim()).replace(/\r?\n/g, '<br>');

/** Normalize legacy text for display only. HTML always passes through the same allowlist. */
export function normalizeJobContent(value: string | null | undefined): string {
  let input = (value || '').trim();
  if (!/<\/?[a-z][\s\S]*?>/i.test(input)) {
    const bullets = [...input.matchAll(/(?:^|\s)-\s+/g)].filter((match) => {
      const offset = match.index || 0;
      return !(
        /\d\s*$/.test(input.slice(0, offset)) && /^\d/.test(input.slice(offset + match[0].length))
      );
    });
    if (bullets.length >= 2) {
      const prefix = input.slice(0, bullets[0].index).trim();
      const items = bullets
        .map((bullet, index) =>
          input
            .slice(
              (bullet.index || 0) + bullet[0].length,
              bullets[index + 1]?.index ?? input.length,
            )
            .trim(),
        )
        .filter(Boolean);
      input = `${prefix ? `<p>${preserveLines(prefix)}</p>` : ''}<ul>${items.map((item) => `<li>${preserveLines(item)}</li>`).join('')}</ul>`;
    } else {
      input = input ? `<p>${preserveLines(input)}</p>` : '';
    }
  }
  return sanitizeHtml(input, {
    allowedTags: ['p', 'ul', 'ol', 'li', 'strong', 'em', 'a', 'h2', 'h3', 'h4', 'br'],
    allowedAttributes: { a: ['href', 'rel'] },
    allowedSchemes: ['http', 'https', 'mailto'],
    allowProtocolRelative: false,
    transformTags: {
      a: (_tag, attrs) => ({
        tagName: 'a',
        attribs: { href: attrs.href || '', rel: 'noopener noreferrer' },
      }),
    },
  });
}

export function jobDeadline(
  deadline: string,
  status = 'recruiting',
  now = Date.now(),
  updatedAt?: string,
) {
  const end = new Date(`${deadline}T23:59:59.999+07:00`).getTime();
  const todayVietnam = new Date(now + 7 * 3600_000).toISOString().slice(0, 10);
  const days = Math.round(
    (Date.parse(`${deadline}T00:00:00Z`) - Date.parse(`${todayVietnam}T00:00:00Z`)) / 864e5,
  );
  return {
    closed: status !== 'recruiting' || !Number.isFinite(end) || now > end,
    days: Math.max(0, days),
    closedLongAgo:
      (Number.isFinite(end) && now - end > 30 * 864e5) ||
      (status === 'paused' && Boolean(updatedAt) && now - Date.parse(updatedAt!) > 30 * 864e5),
    label: new Date(`${deadline}T12:00:00+07:00`).toLocaleDateString('vi-VN', {
      timeZone: 'Asia/Ho_Chi_Minh',
    }),
  };
}

export function jobPostingSchema(job: Job, site: string) {
  const salary =
    job.salary_type === 'range' && job.salary_min != null && job.salary_max != null
      ? {
          '@type': 'MonetaryAmount',
          currency: 'VND',
          value: {
            '@type': 'QuantitativeValue',
            minValue: Number(job.salary_min),
            maxValue: Number(job.salary_max),
            ...(/\/tháng|mỗi tháng/i.test(`${job.description} ${job.benefits || ''}`)
              ? { unitText: 'MONTH' }
              : {}),
          },
        }
      : undefined;
  return {
    '@context': 'https://schema.org',
    '@type': 'JobPosting',
    title: job.title,
    description: normalizeJobContent(job.description),
    datePosted: job.created_at,
    validThrough: `${job.deadline}T23:59:59+07:00`,
    ...(employmentSchema[job.employment_type]
      ? { employmentType: employmentSchema[job.employment_type] }
      : {}),
    hiringOrganization: {
      '@type': 'Organization',
      name: 'MobiFone Sơn La',
      sameAs: site,
      logo: `${site}/logo.png`,
    },
    jobLocation: {
      '@type': 'Place',
      address: { '@type': 'PostalAddress', streetAddress: job.location, addressCountry: 'VN' },
    },
    ...(salary ? { baseSalary: salary } : {}),
    url: `${site}/tuyen-dung/${encodeURIComponent(job.slug)}`,
  };
}

export function validateApplication(values: {
  full_name: string;
  phone: string;
  email: string;
  introduction: string;
}) {
  const errors: Record<string, string> = {};
  if (values.full_name.trim().length < 2) errors.full_name = 'Họ tên cần ít nhất 2 ký tự.';
  const phone = values.phone.replace(/[\s.()-]/g, '').replace(/^\+84/, '0');
  if (!/^0[35789]\d{8}$/.test(phone))
    errors.phone = 'Nhập SĐT Việt Nam gồm 10 số, đầu 03, 05, 07, 08 hoặc 09.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim()) || values.email.trim().length > 150)
    errors.email = 'Nhập địa chỉ email hợp lệ.';
  if (values.introduction.length > 1000) errors.introduction = 'Giới thiệu tối đa 1.000 ký tự.';
  return errors;
}

export function validateCv(file: Pick<File, 'name' | 'type' | 'size'>): string | undefined {
  const extension = file.name.split('.').pop()?.toLowerCase();
  const expected =
    extension === 'pdf'
      ? 'application/pdf'
      : extension === 'docx'
        ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        : undefined;
  if (!expected || (file.type && file.type !== expected))
    return 'Chọn CV đúng định dạng PDF hoặc DOCX.';
  if (!file.size) return 'Tệp CV đang trống. Vui lòng chọn tệp khác.';
  if (file.size > 5 * 1024 * 1024) return 'CV vượt quá 5MB. Vui lòng chọn tệp nhỏ hơn.';
  return undefined;
}
