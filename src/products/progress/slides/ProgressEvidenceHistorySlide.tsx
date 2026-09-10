import { Link } from 'react-router-dom';
import { Empty } from '../../../shared/ui/Empty';
import type { useProgressPage } from '../hooks/useProgressPage';

export function ProgressEvidenceHistorySlide({
  error,
  snapshots,
  state,
}: Pick<ReturnType<typeof useProgressPage>, 'error' | 'snapshots' | 'state'>) {
  return (
    <>
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      {!snapshots.length && (
        <Empty title="Build an evidence history">
          Run an approved progress-recording workflow to capture your first snapshot.{' '}
          <Link to="/os/workflows">Open workflows</Link>
        </Empty>
      )}
      {snapshots.map((snapshot) => (
        <section className="panel settings-card" key={snapshot.id}>
          <h2>
            {state.objectives.find((o) => o.id === snapshot.objectiveId)?.title ||
              'Recorded objective'}
          </h2>
          <p>
            {new Date(snapshot.createdAt).toLocaleString()} · Objective version{' '}
            {snapshot.objectiveVersion}
          </p>
          <progress
            max={snapshot.total || 1}
            value={snapshot.completed}
            aria-label={`${snapshot.completed} of ${snapshot.total} actions complete`}
          />
          <p>
            {snapshot.completed} of {snapshot.total} actions were complete at this observation.
          </p>
        </section>
      ))}
    </>
  );
}
