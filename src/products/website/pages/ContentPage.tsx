import type { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { pageTheme } from '../../../pageThemes';
import { CanonicalCopy } from '../../../shared/content/CanonicalCopy';
import { sourcePage } from '../../../shared/content/sourcePage';
import { Footer } from '../../../shared/layout/Footer';
import { PublicHeader } from '../../../shared/layout/PublicHeader';
import { Cta } from '../../../shared/ui/Cta';
import { HelpSearchSlide } from '../slides/HelpSearchSlide';

/** Public shell; the document registry selects the product's named page composition. */
export function ContentPage({ children }: { children?: ReactNode }) {
  const { pathname } = useLocation();
  const page = sourcePage(pathname);
  return (
    <>
      <PublicHeader />
      <main id="main" className="content-page" data-page-theme={pageTheme(pathname)}>
        {children && (
          <section id="working-controls" className="canonical-controls">
            {children}
          </section>
        )}
        {page ? (
          children ? (
            <details className="canonical-copy-disclosure">
              <summary>Getting started</summary>
              <CanonicalCopy path={pathname} embedded />
            </details>
          ) : (
            <CanonicalCopy path={pathname} />
          )
        ) : (
          <section className="section-wrap">
            <h1>Page not found</h1>
            <Cta to="/">Return home</Cta>
          </section>
        )}
        {pathname === '/help' && <HelpSearchSlide />}
      </main>
      {pathname !== '/' && <Footer />}
    </>
  );
}
