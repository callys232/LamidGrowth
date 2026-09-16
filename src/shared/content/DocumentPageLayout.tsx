import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { pageTheme } from '../../pageThemes';
import { SectionIndex } from './SectionIndex';
import type { DocumentPage, DocumentPageProps } from './types';

export function DocumentPageLayout({
  page,
  embedded = false,
  hero,
  children,
}: DocumentPageProps & { page: DocumentPage; hero: ReactNode; children: ReactNode }) {
  const [active, setActive] = useState('');
  const container = useRef<HTMLDivElement>(null);
  const { pathname } = useLocation();
  const isProductPage = pageTheme(pathname) === 'product';
  useEffect(() => {
    setActive('');
    if (embedded) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting);
        if (visible.length) setActive(visible[0].target.id);
      },
      { rootMargin: '-80px 0px -55% 0px', threshold: 0 },
    );
    container.current
      ?.querySelectorAll('[data-section-anchor]')
      .forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [page, embedded]);
  return (
    <div
      ref={container}
      className={`canonical-copy ${embedded ? '' : 'showcase-copy'}`}
      data-source-page={page.page}
    >
      {hero}
      {!embedded && !isProductPage && page.sections.length > 1 && (
        <SectionIndex sections={page.sections} active={active} onSelect={setActive} />
      )}
      <section className="editorial-sections section-wrap">{children}</section>
    </div>
  );
}
