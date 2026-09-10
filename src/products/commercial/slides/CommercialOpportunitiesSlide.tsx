import { Button } from '../../../shared/ui/Button';
import { Empty } from '../../../shared/ui/Empty';
import type { useCommercialPage } from '../hooks/useCommercialPage';

export function CommercialOpportunitiesSlide({
  jobs,
  setSelected,
  view,
  offset,
  setOffset,
}: Pick<
  ReturnType<typeof useCommercialPage>,
  'jobs' | 'setSelected' | 'view' | 'offset' | 'setOffset'
>) {
  return (
    <>
      {!jobs.length && (
        <Empty title="No matching work yet">
          Start with a clear brief or explore another search.
        </Empty>
      )}
      <div className="objective-grid">
        {jobs.map((job) => (
          <section className="panel settings-card" key={job.id}>
            <span className="tag">{job.category}</span>
            <h2>{job.title}</h2>
            <p>{job.description}</p>
            <p>
              {job.budget_min}–{job.budget_max} {job.currency} · {job.timeline}
            </p>
            <Button variant="secondary" onClick={() => setSelected(job)}>
              View job
            </Button>
          </section>
        ))}
      </div>
      {view === 'marketplace' && (
        <div className="modal-actions">
          <Button
            variant="secondary"
            disabled={offset === 0}
            onClick={() => setOffset(Math.max(0, offset - 50))}
          >
            Previous
          </Button>
          <Button
            variant="secondary"
            disabled={jobs.length < 50}
            onClick={() => setOffset(offset + 50)}
          >
            Next
          </Button>
        </div>
      )}
    </>
  );
}
