import { ArrowRight } from 'lucide-react';
import { Button } from '../../../shared/ui/Button';
import { Empty } from '../../../shared/ui/Empty';
import { Eyebrow } from '../../../shared/ui/Eyebrow';
import type { useRhythmPage } from '../hooks/useRhythmPage';

export function RhythmReflectionsSlide({
  state,
  setOpen,
}: Pick<ReturnType<typeof useRhythmPage>, 'state' | 'setOpen'>) {
  return (
    <>
      <div className="panel-heading">
        <div>
          <h2>Learning that carries forward</h2>
          <span>{state.reviews.length} recorded reflections</span>
        </div>
      </div>
      {state.reviews.length ? (
        <div className="review-grid">
          {state.reviews.map((review) => (
            <article className="panel review-card" key={review.id}>
              <Eyebrow>
                {new Date(review.createdAt).toLocaleDateString('en', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </Eyebrow>
              <h3>What moved forward</h3>
              <p>{review.progressed}</p>
              {review.learned && (
                <>
                  <h3>What I learned</h3>
                  <p>{review.learned}</p>
                </>
              )}
              <div>
                <h3>Carry into the next cycle</h3>
                <p>{review.next}</p>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <Empty
          title="Make room for reflection."
          action={
            <Button variant="secondary" onClick={() => setOpen(true)}>
              Start your first review <ArrowRight size={16} />
            </Button>
          }
        >
          Useful learning is more than a score. Capture what changed and what it means for your next
          step.
        </Empty>
      )}
    </>
  );
}
