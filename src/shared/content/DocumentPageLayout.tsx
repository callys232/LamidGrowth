import { useMemo, type ReactNode } from 'react';
import { heroScene } from './heroScene';
import { designFor, PagePlanContext, planPage } from './pagePlan';
import './slides/page-designs.css';
import type { DocumentPage, DocumentPageProps } from './types';

export function DocumentPageLayout({
  page,
  embedded = false,
  hero,
  nav,
  children,
}: DocumentPageProps & {
  page: DocumentPage;
  hero: ReactNode;
  /** An optional bar under the hero (e.g. the pricing page's sticky plan bar). */
  nav?: ReactNode;
  children: ReactNode;
}) {
  const plan = useMemo(
    () => ({ plans: planPage(page.sections), scene: heroScene(page.route) }),
    [page],
  );
  return (
    <div
      className={`canonical-copy ${embedded ? '' : 'showcase-copy'}`}
      data-source-page={page.page}
      data-design={embedded ? undefined : designFor(page.page)}
    >
      {hero}
      {!embedded && nav}
      {embedded ? (
        <section className="editorial-sections section-wrap">{children}</section>
      ) : (
        <PagePlanContext.Provider value={plan}>
          <section className="page-flow section-wrap">{children}</section>
        </PagePlanContext.Provider>
      )}
    </div>
  );
}
