import { documentPages } from '../../content/documentPages';
import { documentRoute } from './sourcePage';
export { sourcePage } from './sourcePage';

export function CanonicalCopy({ path, embedded = false }: { path: string; embedded?: boolean }) {
  const Page = documentPages[documentRoute(path)];
  return Page ? <Page embedded={embedded} /> : null;
}
