'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import * as Icons from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Solution } from '@/types/product';
import { assetUrl } from '@/lib/assets';
import styles from './SolutionContent.module.scss';

const governmentCategories = new Set(['ubnd', 'cuc_nganh', 'chuyen_doi_so']);
const priceFormatter = new Intl.NumberFormat('vi-VN');
const iconSet = Icons as unknown as Record<string, LucideIcon>;

export function SolutionContent({
  solution,
  related = [],
}: {
  solution: Solution;
  related?: Solution[];
}) {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const features = solution.features ?? [];
  const pricing = solution.pricing ?? [];
  const faqs = solution.faqs ?? [];
  const gallery = solution.gallery ?? [];
  const targetCustomers =
    solution.target_customers
      ?.split(/[;\n]/)
      .map((item) => item.trim())
      .filter(Boolean) ?? [];

  return (
    <div className={styles.content}>
      <section className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>MobiFone Sơn La</p>
          <h2 className={styles.heroTitle}>{solution.name}</h2>
          {solution.summary && <p className={styles.heroSummary}>{solution.summary}</p>}
          <Link className={styles.cta} href="/lien-he">
            Liên hệ tư vấn
          </Link>
        </div>
        {solution.thumbnail && (
          <Image
            className={styles.heroImage}
            src={assetUrl(solution.thumbnail)!}
            alt={solution.name}
            width={520}
            height={320}
            priority
          />
        )}
      </section>

      <section className={styles.section}>
        <h2>Tổng quan</h2>
        <div className={styles.richText} dangerouslySetInnerHTML={{ __html: solution.content }} />
        {solution.video_url && (
          <a className={styles.textLink} href={solution.video_url} target="_blank" rel="noreferrer">
            Xem video giới thiệu
          </a>
        )}
      </section>

      {features.length > 0 && (
        <section className={styles.section}>
          <h2>Tính năng nổi bật</h2>
          <div className={styles.featureGrid}>
            {features.map((feature) => {
              const FeatureIcon = iconSet[feature.icon ?? ''] ?? Icons.Sparkles;
              return (
              <article className={styles.feature} key={feature.id}>
                <span className={styles.featureIcon}><FeatureIcon size={25} aria-hidden /></span>
                <h3>{feature.title}</h3>
                {feature.description && <p>{feature.description}</p>}
              </article>
              );
            })}
          </div>
        </section>
      )}

      {targetCustomers.length > 0 && (
        <section className={styles.section}>
          <h2>Đối tượng khách hàng</h2>
          <div className={styles.customerGrid}>
            {targetCustomers.map((customer) => (
              <div className={styles.customer} key={customer}>
                {customer}
              </div>
            ))}
          </div>
        </section>
      )}

      {pricing.length > 0 && (
        <section className={styles.section}>
          <h2>Bảng giá</h2>
          <div className={styles.tableWrap}>
            <table className={styles.pricing}>
              <thead>
                <tr>
                  <th>Gói</th>
                  <th>Chu kỳ</th>
                  <th>Giá</th>
                  <th>Điều kiện</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {pricing.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <strong>{item.package_name}</strong>
                      <small>{item.package_code}</small>
                    </td>
                    <td>{item.cycle_months} tháng</td>
                    <td>
                      {item.price > 0 ? `${priceFormatter.format(item.price)} VNĐ` : 'Liên hệ'}
                    </td>
                    <td>{item.condition_note ?? 'Theo chính sách hiện hành'}</td>
                    <td>
                      <Link href="/lien-he" className={styles.tableCta}>
                        Đăng ký
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {gallery.length > 0 && (
        <section className={styles.section}>
          <h2>Sơ đồ và quy trình</h2>
          <div className={styles.gallery}>
            {gallery.map((item) => (
              <button
                type="button"
                className={styles.galleryItem}
                key={item.id}
                onClick={() => setLightbox(item.image_url)}
              >
                <Image
                  src={assetUrl(item.image_url)!}
                  alt={item.caption ?? 'Sơ đồ giải pháp'}
                  width={320}
                  height={200}
                />
                <span>{item.caption}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {governmentCategories.has(solution.category) && solution.legal_basis && (
        <section className={styles.section}>
          <h2>Căn cứ pháp lý</h2>
          <p className={styles.legal}>{solution.legal_basis}</p>
        </section>
      )}

      {faqs.length > 0 && (
        <section className={styles.section}>
          <h2>Câu hỏi thường gặp</h2>
          <div className={styles.faqs}>
            {faqs.map((faq) => (
              <div className={styles.faq} key={faq.id}>
                <button
                  type="button"
                  onClick={() => setOpenFaq(openFaq === faq.id ? null : faq.id)}
                  aria-expanded={openFaq === faq.id}
                >
                  {faq.question}
                  <span>{openFaq === faq.id ? '−' : '+'}</span>
                </button>
                {openFaq === faq.id && <p>{faq.answer}</p>}
              </div>
            ))}
          </div>
        </section>
      )}

      <section className={styles.finalCta}>
        <div>
          <h2>Cần tư vấn giải pháp?</h2>
          <p>Đội ngũ MobiFone Sơn La sẵn sàng tư vấn theo nhu cầu và quy mô đơn vị.</p>
        </div>
        <Link className={styles.cta} href="/lien-he">
          Gửi yêu cầu tư vấn
        </Link>
        {solution.brochure_url && (
          <a
            className={styles.secondaryCta}
            href={solution.brochure_url}
            target="_blank"
            rel="noreferrer"
          >
            Tải tài liệu
          </a>
        )}
      </section>

      {related.length > 0 && (
        <section className={styles.section}>
          <h2>Giải pháp liên quan</h2>
          <div className={styles.related}>
            {related.map((item) => (
              <Link href={`/giai-phap-so/${item.slug}`} key={item.id}>
                <strong>{item.name}</strong>
                <span>{item.summary}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {lightbox && (
        <button
          type="button"
          className={styles.lightbox}
          onClick={() => setLightbox(null)}
          aria-label="Đóng ảnh"
        >
          <Image src={lightbox} alt="Sơ đồ phóng to" width={1200} height={800} />
        </button>
      )}
    </div>
  );
}
