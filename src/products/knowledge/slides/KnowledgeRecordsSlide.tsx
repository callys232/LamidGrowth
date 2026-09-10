import { Button } from '../../../shared/ui/Button';
import { Empty } from '../../../shared/ui/Empty';
import type { useKnowledgePage } from '../hooks/useKnowledgePage';

export function KnowledgeRecordsSlide({
  items,
  state,
  setSelected,
  offset,
  setOffset,
  total,
}: Pick<
  ReturnType<typeof useKnowledgePage>,
  'items' | 'state' | 'setSelected' | 'offset' | 'setOffset' | 'total'
>) {
  return (
    <>
      {!items.length && (
        <Empty title="No matching knowledge">Add a note or import a small text document.</Empty>
      )}
      {items.map((item) => (
        <section className="panel settings-card" key={item.id}>
          <h2>{item.title}</h2>
          <p>
            {item.content.slice(0, 300)}
            {item.content.length > 300 ? '…' : ''}
          </p>
          <p>
            {item.sourceName || 'Workspace note'} · {item.classification} · Version {item.version} ·{' '}
            {new Date(item.observedAt).toLocaleString()}
          </p>
          {item.objectiveId && (
            <p>Objective: {state.objectives.find((o) => o.id === item.objectiveId)?.title}</p>
          )}
          <Button variant="secondary" onClick={() => setSelected(item)}>
            Read and edit
          </Button>
        </section>
      ))}
      <div className="modal-actions">
        <Button
          variant="secondary"
          disabled={!offset}
          onClick={() => setOffset(Math.max(0, offset - 50))}
        >
          Previous
        </Button>
        <span>{total} records</span>
        <Button
          variant="secondary"
          disabled={offset + 50 >= total}
          onClick={() => setOffset(offset + 50)}
        >
          Next
        </Button>
      </div>
    </>
  );
}
