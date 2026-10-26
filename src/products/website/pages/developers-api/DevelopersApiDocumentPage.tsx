import { DocumentPageLayout } from '../../../../shared/content/DocumentPageLayout';
import type { DocumentPageProps } from '../../../../shared/content/types';
import content from './content.json';
import { InfoPage, fromContent } from '../info/InfoPage';
import {
  DevelopersApiHeroSlide,
  ApiPrinciplesSlide1,
  CoreDomainsSlide2,
  StartWithTheContractSlide3,
} from './slides';

/** /developers/api — sections in reading order. */
export function DevelopersApiDocumentPage({ embedded = false }: DocumentPageProps) {
  if (!embedded)
    return (
      <InfoPage
        content={fromContent(content, {
          eyebrow: 'API',
          primary: { label: 'Get started', to: '/signup' },
          secondary: { label: 'Contact us', to: '/contact' },
        })}
      />
    );
  return (
    <DocumentPageLayout
      page={content}
      embedded={embedded}
      hero={<DevelopersApiHeroSlide embedded={embedded} />}
    >
      <ApiPrinciplesSlide1 embedded={embedded} />
      <CoreDomainsSlide2 embedded={embedded} />
      <StartWithTheContractSlide3 embedded={embedded} />
    </DocumentPageLayout>
  );
}
