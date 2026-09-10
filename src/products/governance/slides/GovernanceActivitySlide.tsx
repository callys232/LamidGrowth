import { Check, Search } from 'lucide-react';
import { Empty } from '../../../shared/ui/Empty';
import type { useGovernancePage } from '../hooks/useGovernancePage';

export function GovernanceActivitySlide({
  filter,
  setFilter,
  state,
}: Pick<ReturnType<typeof useGovernancePage>, 'filter' | 'setFilter' | 'state'>) {
  return (
    <>
      <div className="panel-heading">
        <div>
          <h2>The activity trail</h2>
          <span>Recorded changes and the person behind each one.</span>
        </div>
        <label className="audit-search">
          <Search size={15} />
          <input
            placeholder="Filter activity…"
            aria-label="Filter activity"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </label>
      </div>
      <section className="panel audit-list">
        {state.audit
          .filter((e) =>
            `${e.action} ${e.detail} ${e.actor}`.toLowerCase().includes(filter.toLowerCase()),
          )
          .map((event) => (
            <div className="audit-event" key={event.id}>
              <span className="audit-event-icon">
                <Check size={14} />
              </span>
              <div>
                <strong>{event.action}</strong>
                <p>{event.detail}</p>
                <small>
                  {event.actor} · {new Date(event.createdAt).toLocaleString()}
                </small>
              </div>
            </div>
          ))}
        {!state.audit.some((e) =>
          `${e.action} ${e.detail} ${e.actor}`.toLowerCase().includes(filter.toLowerCase()),
        ) && <Empty title="No matching activity">Try a different search.</Empty>}
      </section>
    </>
  );
}
