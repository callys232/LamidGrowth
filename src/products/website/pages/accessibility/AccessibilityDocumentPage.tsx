import { DocumentPageLayout } from '../../../../shared/content/DocumentPageLayout';
import type { DocumentPageProps } from '../../../../shared/content/types';
import content from './content.json';
import {
  AccessibilityHeroSlide,
  KeyboardAndAssistiveTechnologySlide1,
  VisualAccessibilitySlide2,
  ReportAnAccessibilityIssueSlide3,
} from './slides';

/** /accessibility — sections in reading order. */
export function AccessibilityDocumentPage({ embedded = false }: DocumentPageProps) {
  return (
    <DocumentPageLayout
      page={content}
      embedded={embedded}
      hero={<AccessibilityHeroSlide embedded={embedded} />}
    >
      <KeyboardAndAssistiveTechnologySlide1 embedded={embedded} />
      <VisualAccessibilitySlide2 embedded={embedded} />
      <ReportAnAccessibilityIssueSlide3 embedded={embedded} />
    </DocumentPageLayout>
  );
}
