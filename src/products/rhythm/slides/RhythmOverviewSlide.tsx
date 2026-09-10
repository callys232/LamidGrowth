import { Eyebrow } from '../../../shared/ui/Eyebrow';
import type { useRhythmPage } from '../hooks/useRhythmPage';

export function RhythmOverviewSlide({
  done,
  state,
}: Pick<ReturnType<typeof useRhythmPage>, 'done' | 'state'>) {
  return (
    <>
      <div className="review-overview">
        <div className="review-stat">
          <Eyebrow>COMPLETED ACTIONS</Eyebrow>
          <strong>
            {done}
            <span> / {state.actions.length}</span>
          </strong>
          <progress value={done} max={state.actions.length || 1} aria-label="Completed actions" />
          <p>Completion is one signal. Your reflection adds the context.</p>
        </div>
        <div>
          <Eyebrow>THE NEXT CYCLE</Eyebrow>
          <h2>{state.reviews[0]?.next || 'What deserves your attention next?'}</h2>
          <p>
            {state.reviews.length
              ? 'From your latest reflection. Revisit it as conditions change.'
              : 'Take a moment to see what you’ve learned before deciding where to go.'}
          </p>
        </div>
      </div>
    </>
  );
}
