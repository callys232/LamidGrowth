import { useEffect, useRef, useState, type ReactNode } from 'react';
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
      {page.gates.length > 0 && (
        <aside className="canonical-preview">
          Document preview — the complete specified copy is shown below. It does not establish that
          planned services, policies or certifications are available in this development build.
        </aside>
      )}
      {hero}
      {!embedded && page.sections.length > 1 && (
        <SectionIndex sections={page.sections} active={active} onSelect={setActive} />
      )}
      <section className="editorial-sections section-wrap">{children}</section>
    </div>
  );
}
