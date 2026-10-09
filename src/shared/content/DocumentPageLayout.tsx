import { useMemo, type ReactNode } from 'react';
import { heroScene } from './heroScene';
import { designFor, PagePlanContext, planPage } from './pagePlan';
import { LongFormGroup } from './slides/DocumentSectionSlide';
import './slides/page-designs.css';
import type { DocumentPage, DocumentPageProps } from './types';

export function DocumentPageLayout({
  page,
  embedded = false,
  hero,
  nav,
  heroOrbit = false,
  contentId,
  children,
}: DocumentPageProps & {
  page: DocumentPage;
  hero: ReactNode;
  /** An optional bar under the hero (e.g. the pricing page's sticky plan bar). */
  nav?: ReactNode;
  /** Keep the interactive orbit graphic beside the hero, even on designs that drop it. */
  heroOrbit?: boolean;
  contentId?: string;
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
      data-hero-orbit={heroOrbit && !embedded ? '' : undefined}
    >
      {hero}
      {!embedded && nav}
      {embedded ? (
        <section className="editorial-sections section-wrap">{children}</section>
      ) : (
        <PagePlanContext.Provider value={plan}>
          {/* "Read the full section" cards act as one accordion: opening one closes the last. */}
          <LongFormGroup>
            <section id={contentId} className="page-flow section-wrap">{children}</section>
          </LongFormGroup>
        </PagePlanContext.Provider>
      )}
    </div>
  );
}
