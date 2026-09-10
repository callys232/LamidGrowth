import { api } from '../../../api';
import { Button } from '../../../shared/ui/Button';
import { Empty } from '../../../shared/ui/Empty';
import type { useIntelligencePage } from '../hooks/useIntelligencePage';

export function IntelligenceReviewHistorySlide({
  reviews,
  settings,
  state,
  load,
  setError,
  newAction,
}: Pick<
  ReturnType<typeof useIntelligencePage>,
  'reviews' | 'settings' | 'state' | 'load' | 'setError' | 'newAction'
>) {
  return (
    <>
      {!reviews.length && !settings && (
        <Empty title="No AI reviews yet">
          Reviews appear here after a permitted request. Model suggestions do not create or approve
          actions.
        </Empty>
      )}
      {!settings &&
        reviews.map((item) => (
          <section className="panel settings-card" key={item.id}>
            <h2>{item.question}</h2>
            <p>
              {item.status} · {item.model} · {new Date(item.createdAt).toLocaleString()}
            </p>
            {item.status === 'pending' &&
              (item.principalId === state.user.id || state.workspace.role === 'owner') && (
                <Button
                  variant="secondary"
                  onClick={() => {
                    void api(`/ai/reviews/${item.id}`, { command: 'cancel' }, 'PATCH')
                      .then(load)
                      .catch((error: Error) => setError(error.message));
                  }}
                >
                  Cancel review
                </Button>
              )}
            {item.review && (
              <>
                <p>{item.review.summary}</p>
                <h3>Assumptions to check</h3>
                <ul>
                  {item.review.assumptions.map((assumption, i) => (
                    <li key={i}>{assumption}</li>
                  ))}
                </ul>
                <h3>Suggested next steps</h3>
                {item.review.suggestions.map((suggestion, i) => (
                  <article key={i}>
                    <h4>{suggestion.title}</h4>
                    <p>{suggestion.rationale}</p>
                  </article>
                ))}
                <p>
                  Based on {item.sources.length} selected sources. Recheck current context before
                  deciding.
                </p>
                <Button variant="secondary" onClick={() => newAction(item.objectiveId)}>
                  Define an action after reviewing
                </Button>
              </>
            )}
          </section>
        ))}
    </>
  );
}
