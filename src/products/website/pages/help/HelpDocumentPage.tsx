import { DocumentPageLayout } from '../../../../shared/content/DocumentPageLayout';
import { Link } from 'react-router-dom';
import type { DocumentPageProps } from '../../../../shared/content/types';
import content from './content.json';
import { InfoPage, fromContent } from '../info/InfoPage';
import { HelpHeroSlide, BrowseByNeedSlide1, GetUnblockedQuicklySlide2 } from './slides';

/** /help — sections in reading order. */
export function HelpDocumentPage({ embedded = false }: DocumentPageProps) {
  if (!embedded)
    return (
      <InfoPage
        content={fromContent(content, {
          eyebrow: 'Help',
          primary: { label: 'Get started', to: '/signup' },
          secondary: { label: 'Contact us', to: '/contact' },
        })}
      />
    );
  return (
    <DocumentPageLayout
      page={content}
      embedded={embedded}
      hero={<HelpHeroSlide embedded={embedded} />}
    >
      <p>
        <Link to="/guides#user-guide-title">Open the user guide</Link> for demo setup, account
        creation, workspace tools and troubleshooting.
      </p>
      <BrowseByNeedSlide1 embedded={embedded} />
      <GetUnblockedQuicklySlide2 embedded={embedded} />
    </DocumentPageLayout>
  );
}
