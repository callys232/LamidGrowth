import { Link } from 'react-router-dom';
import { Button } from '../../../shared/ui/Button';
import { Field } from '../../../shared/ui/Field';
import type { useIntelligencePage } from '../hooks/useIntelligencePage';

export function IntelligenceReviewRequestSlide({
  settings,
  policy,
  state,
  review,
  objectiveId,
  setObjectiveId,
  knowledge,
  busy,
}: Pick<
  ReturnType<typeof useIntelligencePage>,
  | 'settings'
  | 'policy'
  | 'state'
  | 'review'
  | 'objectiveId'
  | 'setObjectiveId'
  | 'knowledge'
  | 'busy'
>) {
  return (
    <>
      {!settings && policy?.enabled && policy.accountEligible && state.objectives.length > 0 && (
        <section className="panel settings-card" id="request-review">
          <h2>Choose exactly what to share</h2>
          <form onSubmit={review}>
            <Field label="Objective to review">
              <select value={objectiveId} onChange={(e) => setObjectiveId(e.target.value)}>
                {state.objectives.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.title}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Question for the review">
              <textarea name="question" required maxLength={2000} rows={3} />
            </Field>
            <fieldset>
              <legend>Optional knowledge sources (up to five)</legend>
              {knowledge.map((item) => (
                <label className="checkbox-field" key={item.id}>
                  <input type="checkbox" name="knowledge" value={item.id} />
                  {item.title} · Version {item.version}
                </label>
              ))}
            </fieldset>
            <label className="checkbox-field">
              <input type="checkbox" name="consent" required />I agree to send this objective,
              question, and selected sources to {policy.provider} for this review.
            </label>
            <Button type="submit" disabled={busy}>
              {busy ? 'Preparing review…' : `Request AI review · ${policy.reviewCost} points`}
            </Button>
          </form>
        </section>
      )}
      {!settings && <Link to="/os/settings/ai">Manage AI and context controls</Link>}
    </>
  );
}
