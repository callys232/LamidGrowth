import { KnowledgeEditor } from '../components/KnowledgeEditor';
import type { useKnowledgePage } from '../hooks/useKnowledgePage';

export function KnowledgeEditorDialogSlide({
  selected,
  setSelected,
  setRevision,
}: Pick<ReturnType<typeof useKnowledgePage>, 'selected' | 'setSelected' | 'setRevision'>) {
  return (
    <>
      {selected && (
        <KnowledgeEditor
          item={selected === 'new' ? undefined : selected}
          onClose={() => setSelected(null)}
          onSaved={() => {
            setSelected(null);
            setRevision((n) => n + 1);
          }}
        />
      )}
    </>
  );
}
