import { useKnowledgePage } from '../hooks/useKnowledgePage';
import { KnowledgeEditorDialogSlide } from '../slides/KnowledgeEditorDialogSlide';
import { KnowledgeHeadingSlide } from '../slides/KnowledgeHeadingSlide';
import { KnowledgeRecordsSlide } from '../slides/KnowledgeRecordsSlide';
import { KnowledgeSearchSlide } from '../slides/KnowledgeSearchSlide';

/** Compose the page in reading order. Edit each section in ../slides. */
export function Knowledge() {
  const page = useKnowledgePage();
  return (
    <>
      <KnowledgeHeadingSlide setSelected={page.setSelected} />
      <KnowledgeSearchSlide
        query={page.query}
        setQuery={page.setQuery}
        setOffset={page.setOffset}
        error={page.error}
      />
      <KnowledgeRecordsSlide
        items={page.items}
        state={page.state}
        setSelected={page.setSelected}
        offset={page.offset}
        setOffset={page.setOffset}
        total={page.total}
      />
      <KnowledgeEditorDialogSlide
        selected={page.selected}
        setSelected={page.setSelected}
        setRevision={page.setRevision}
      />
    </>
  );
}
