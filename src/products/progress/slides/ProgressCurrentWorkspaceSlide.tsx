import { Link } from 'react-router-dom';
import type { useProgressPage } from '../hooks/useProgressPage';

export function ProgressCurrentWorkspaceSlide({
  state,
}: Pick<ReturnType<typeof useProgressPage>, 'state'>) {
  return (
    <>
      <section className="panel settings-card">
        <h2>Current workspace</h2>
        <p>
          {state.actions.filter((a) => a.status === 'Done').length} of {state.actions.length}{' '}
          actions complete · {state.reviews.length} reflections
        </p>
        <Link to="/os/rhythm">Read and record reflections</Link>
      </section>
    </>
  );
}
