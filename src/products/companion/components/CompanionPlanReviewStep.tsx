import { ArrowLeft, Check } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../../../shared/ui/Button';
import { Eyebrow } from '../../../shared/ui/Eyebrow';
import { Field } from '../../../shared/ui/Field';
import type { useCompanionPage } from '../hooks/useCompanionPage';
export function CompanionPlanReviewStep({
  step,
  title,
  context,
  success,
  constraints,
  next,
  setNext,
  error,
  setStep,
  busy,
  save,
  pathway,
  setPathway,
  approach,
  previewing,
  prepareReview,
  aiPolicy,
  consent,
  setConsent,
  source,
  assumptions,
}: Pick<
  ReturnType<typeof useCompanionPage>,
  | 'step'
  | 'title'
  | 'context'
  | 'success'
  | 'constraints'
  | 'next'
  | 'setNext'
  | 'error'
  | 'setStep'
  | 'busy'
  | 'save'
  | 'pathway'
  | 'setPathway'
  | 'approach'
  | 'previewing'
  | 'prepareReview'
  | 'aiPolicy'
  | 'consent'
  | 'setConsent'
  | 'source'
  | 'assumptions'
>) {
  return (
    <>
      {step === 2 && (
        <>
          <div className="companion-message">
            <h2>Understanding becomes useful through action.</h2>
            <p>
              Choose the parts you want to follow. Edit the suggested steps to fit your situation;
              only selected steps will become actions.
            </p>
          </div>
          <div className="plan-summary">
            <Eyebrow>YOUR OBJECTIVE</Eyebrow>
            <h3>{title}</h3>
            <p>{context}</p>
            <dl>
              <dt>Success</dt>
              <dd>{success}</dd>
              <dt>Keep in view</dt>
              <dd>{constraints || 'No constraints recorded.'}</dd>
            </dl>
          </div>
          <section
            className="companion-pathway"
            aria-label="Suggested pathway"
            aria-busy={previewing}
          >
            <h3>{approach || 'Your suggested pathway'}</h3>
            <p>
              {source === 'ai'
                ? 'AI-generated draft based on your goal, context, success measure, constraints, and planning preferences. Review each suggestion before saving.'
                : 'Free planning template based on your goal. Review time, budget, and support before committing.'}
            </p>
            {assumptions.length > 0 && (
              <div>
                <h4>Questions and assumptions to check</h4>
                <ul>
                  {assumptions.map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
            <div className="plan-summary">
              <h4>Ask AI to refine this pathway</h4>
              <p>
                Shares only this draft goal and its context. Costs 0 points and counts toward your
                daily AI request limit. Replaces the suggestions below when successful.
              </p>
              <Link to="/os/settings/ai" target="_blank" rel="noopener noreferrer">
                Review your AI rules (opens in a new tab)
              </Link>
              {aiPolicy?.configured &&
              aiPolicy.enabled &&
              aiPolicy.accountEligible &&
              aiPolicy.rules.pathways &&
              aiPolicy.rules.allowedSources.includes('objective') ? (
                <>
                  <label className="checkbox-field">
                    <input
                      type="checkbox"
                      checked={consent}
                      disabled={busy || previewing}
                      onChange={(e) => setConsent(e.target.checked)}
                    />
                    Allow external AI to read this draft goal and suggest steps.
                  </label>
                  <Button
                    variant="secondary"
                    disabled={!consent || busy || previewing}
                    onClick={() => void prepareReview('ai')}
                  >
                    Generate AI pathway
                  </Button>
                </>
              ) : (
                <p>
                  AI pathways require a configured provider, a verified account, and permission in
                  your AI rules. You can continue with the template.
                </p>
              )}
            </div>
            {previewing && <p role="status">Preparing your pathway…</p>}
            {!previewing && !approach && (
              <Button variant="secondary" disabled={busy} onClick={() => void prepareReview()}>
                Retry suggestions
              </Button>
            )}
            <ol>
              {pathway.map((item, index) => (
                <li key={index}>
                  <label className="pathway-selection">
                    <input
                      type="checkbox"
                      checked={item.selected}
                      disabled={busy || previewing}
                      onChange={(e) =>
                        setPathway((items) =>
                          items.map((step, i) =>
                            i === index ? { ...step, selected: e.target.checked } : step,
                          ),
                        )
                      }
                    />
                    Follow step {index + 1}
                  </label>
                  <Field label={`Step ${index + 1} action`}>
                    <input
                      value={item.title}
                      maxLength={500}
                      disabled={busy || previewing || !item.selected}
                      onChange={(e) =>
                        setPathway((items) =>
                          items.map((step, i) =>
                            i === index ? { ...step, title: e.target.value } : step,
                          ),
                        )
                      }
                    />
                  </Field>
                  <Field label={`Step ${index + 1} guidance`}>
                    <textarea
                      rows={3}
                      value={item.notes}
                      maxLength={5000}
                      disabled={busy || previewing || !item.selected}
                      onChange={(e) =>
                        setPathway((items) =>
                          items.map((step, i) =>
                            i === index ? { ...step, notes: e.target.value } : step,
                          ),
                        )
                      }
                    />
                  </Field>
                </li>
              ))}
            </ol>
            {approach && (
              <p>
                {pathway.filter((item) => item.selected).length} suggested steps selected. You can
                also save just your goal and add actions later.
              </p>
            )}
          </section>
          <Field label="Your next action (optional)">
            <input
              value={next}
              disabled={busy || previewing}
              onChange={(e) => setNext(e.target.value)}
              maxLength={500}
              placeholder="One action you can take to move this forward"
            />
          </Field>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <div className="modal-actions">
            <Button variant="ghost" disabled={busy || previewing} onClick={() => setStep(1)}>
              <ArrowLeft size={15} /> Refine
            </Button>
            <Button
              disabled={
                busy || previewing || pathway.some((item) => item.selected && !item.title.trim())
              }
              onClick={() => void save()}
            >
              {busy ? 'Saving…' : 'Save my plan'}
              <Check size={16} />
            </Button>
          </div>
        </>
      )}
    </>
  );
}
