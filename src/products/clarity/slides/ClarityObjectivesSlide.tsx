import { ArrowUpRight } from 'lucide-react';
import { Button } from '../../../shared/ui/Button';
import { Empty } from '../../../shared/ui/Empty';
import { ObjectiveCard } from '../components/ObjectiveCard';
import type { useClarityPage } from '../hooks/useClarityPage';

export function ClarityObjectivesSlide({
  state,
  filter,
  setSelected,
  newObjective,
}: Pick<ReturnType<typeof useClarityPage>, 'state' | 'filter' | 'setSelected' | 'newObjective'>) {
  return (
    <>
      <div className="objective-grid clarity-grid">
        {state.objectives
          .filter((o) => filter === 'All' || o.priority === filter)
          .map((o) => (
            <div key={o.id}>
              <ObjectiveCard objective={o} />
              <button className="objective-context-link" onClick={() => setSelected(o.id)}>
                View context & success criteria <ArrowUpRight size={14} />
              </button>
            </div>
          ))}
      </div>
      {!state.objectives.length && (
        <Empty
          title="Clarity begins with a question."
          action={<Button onClick={newObjective}>Define your first objective</Button>}
        >
          What would meaningful progress look like for you?
        </Empty>
      )}
      {state.objectives.length > 0 &&
        !state.objectives.some((o) => filter === 'All' || o.priority === filter) && (
          <Empty title="No objectives at this priority">
            Choose another priority to see your work.
          </Empty>
        )}
    </>
  );
}
