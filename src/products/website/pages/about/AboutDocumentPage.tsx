import { UpdatedDocumentPage } from '../../../../shared/content/UpdatedDocumentPage';
import type { DocumentPageProps } from '../../../../shared/content/types';
import home from '../home/content.json';
import content from './content.json';

/** Original homepage slides whose ideas the newer homepage sections now carry ("How It Works",
 * "Human-directed intelligence." and the final call to action). They read here, before the
 * closing "What We Believe", using the homepage copy as written. */
const movedFromHome = [
  "Start With What You're Trying to Achieve",
  'Intelligence That Stays Current With the Work',
  'See LAMID ONE in Your Context',
].map((label) => {
  const section = home.sections.find((s) => s.label === label);
  if (!section) throw new Error(`Missing homepage section: ${label}`);
  return section;
});

const page = {
  ...content,
  sections: [...content.sections.slice(0, -1), ...movedFromHome, ...content.sections.slice(-1)],
};

export function AboutDocumentPage({ embedded = false }: DocumentPageProps) {
  return <UpdatedDocumentPage content={embedded ? content : page} embedded={embedded} />;
}
