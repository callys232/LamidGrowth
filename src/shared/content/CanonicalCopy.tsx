import { documentPages } from '../../content/documentPages';
import { Suspense } from 'react';
import { documentRoute } from './sourcePage';
export { sourcePage } from './sourcePage';

export function CanonicalCopy({ path, embedded = false }: { path: string; embedded?: boolean }) {
  const Page = documentPages[documentRoute(path)];
  return Page ? (
    <Suspense fallback={<p role="status">Loading page…</p>}>
      <Page embedded={embedded} />
    </Suspense>
  ) : null;
}
