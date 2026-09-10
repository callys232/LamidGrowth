import { ArrowRight, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../../../shared/ui/Button';
import { Empty } from '../../../shared/ui/Empty';
import { Eyebrow } from '../../../shared/ui/Eyebrow';
import type { useCapabilityPage } from '../hooks/useCapabilityPage';

export function CapabilityObjectiveCapabilitiesSlide({
  state,
  newAction,
}: Pick<ReturnType<typeof useCapabilityPage>, 'state' | 'newAction'>) {
  return (
    <>
      <div className="capability-grid">
        {state.objectives.map((o) => (
          <section className="panel capability-card" key={o.id}>
            <span className="tag">{o.context}</span>
            <h2>{o.title}</h2>
            <Eyebrow>THE OUTCOME</Eyebrow>
            <p>{o.success || 'No success criteria recorded yet.'}</p>
            <Eyebrow>WHAT TO WORK THROUGH</Eyebrow>
            <p>
              {o.constraints ||
                'No constraints recorded. Consider time, knowledge, resources, and support.'}
            </p>
            <Button variant="secondary" onClick={() => newAction(o.id)}>
              Add a capability-building action <Plus size={15} />
            </Button>
          </section>
        ))}
      </div>
      {state.objectives.length === 0 && (
        <Empty
          title="Start with the work in front of you"
          action={
            <Link className="button button-primary" to="/os/clarity">
              Open Clarity <ArrowRight size={15} />
            </Link>
          }
        >
          Define an objective to understand what the next step requires.
        </Empty>
      )}
    </>
  );
}
