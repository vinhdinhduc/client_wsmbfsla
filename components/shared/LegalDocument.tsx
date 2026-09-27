'use client';

import { ReactNode, useEffect, useState } from 'react';
import { Printer, ChevronDown } from 'lucide-react';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { TERMS_VERSION, LEGAL_UPDATED_AT } from '@/lib/legal';
import styles from './LegalDocument.module.scss';

export interface LegalSection {
  id: string;
  title: string;
  content: ReactNode;
}
export function LegalDocument({
  title,
  intro,
  sections,
}: {
  title: string;
  intro: string;
  sections: LegalSection[];
}) {
  const [active, setActive] = useState(sections[0]?.id);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const current = sections
          .filter(
            (section) =>
              (document.getElementById(section.id)?.getBoundingClientRect().top ?? Infinity) <= 180,
          )
          .at(-1);
        const atEnd =
          window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 8;
        setActive(atEnd ? sections[sections.length - 1].id : (current?.id ?? sections[0].id));
      });
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [sections]);
  return (
    <div className={styles.page} data-legal-document>
      <div className={styles.breadcrumb}>
        <Breadcrumb items={[{ label: title }]} />
      </div>
      <div className={styles.layout}>
        <aside className={styles.sidebar}>
          <button
            className={styles.toggle}
            type="button"
            aria-expanded={open}
            aria-controls="legal-toc"
            onClick={() => setOpen(!open)}
          >
            Mục lục <ChevronDown size={18} />
          </button>
          <h2 className={styles.tocTitle}>Mục lục</h2>
          <nav
            id="legal-toc"
            aria-label="Mục lục"
            className={`${styles.toc} ${open ? styles.open : ''}`}
          >
            {sections.map((section) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                aria-current={active === section.id ? 'location' : undefined}
                onClick={(event) => {
                  event.preventDefault();
                  setActive(section.id);
                  setOpen(false);
                  history.replaceState(null, '', `#${section.id}`);
                  const heading = document.getElementById(section.id);
                  heading?.focus({ preventScroll: true });
                  heading?.scrollIntoView({
                    behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
                      ? 'auto'
                      : 'smooth',
                    block: 'start',
                  });
                }}
              >
                {section.title}
              </a>
            ))}
          </nav>
        </aside>
        <article className={styles.content}>
          <header className={styles.heading}>
            <div>
              <h1>{title}</h1>
              <p className={styles.meta}>
                Cập nhật lần cuối: <time dateTime="2026-09-27">{LEGAL_UPDATED_AT}</time>
                <br />
                Phiên bản: {TERMS_VERSION}
              </p>
            </div>
            <button type="button" className={styles.print} onClick={() => window.print()}>
              <Printer size={18} /> In trang này
            </button>
          </header>
          <p className={styles.intro}>{intro}</p>
          {sections.map((section) => (
            <section key={section.id}>
              <h2 id={section.id} tabIndex={-1}>
                {section.title}
              </h2>
              {section.content}
            </section>
          ))}
        </article>
      </div>
    </div>
  );
}
