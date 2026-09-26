import { useState } from 'react';
import { Button } from '../../../shared/ui/Button';
import { Field } from '../../../shared/ui/Field';
import { StatusPill } from '../../../shared/workspace/StatusPill';
import { useScopingPage, type ReviewDiff } from '../hooks/useScopingPage';

type Step = 'objective' | 'scope' | 'review';

const RISK_COPY: Record<string, string> = {
  green: 'This scope is clear enough to proceed. Review it below and publish when ready.',
  amber:
    'A few fields are still missing. Fill in what you can, or publish anyway with what is known.',
  red: 'This looks like it may need qualified review before it is executed. You can still publish, but you must confirm you understand that explicitly.',
};

/** /os/scoping/new — guided project discovery: start from an outcome or problem, not a rigid
 * job-posting form. "I don't know yet" is a valid state at every field. */
export function ScopingWizardPage() {
  const page = useScopingPage();
  const [step, setStep] = useState<Step>('objective');
  const [objective, setObjective] = useState('');
  const [problemStatement, setProblemStatement] = useState('');
  const [confirmRisk, setConfirmRisk] = useState(false);
  const [jobTitle, setJobTitle] = useState('');
  const [projectType, setProjectType] = useState('');
  const [budgetMin, setBudgetMin] = useState('');
  const [budgetMax, setBudgetMax] = useState('');
  const [timeline, setTimeline] = useState('');

  const c = page.scopingCase;

  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <h2>Guided project scoping</h2>
          <span>Start with the outcome or problem — not a scope you have to already know.</span>
        </div>
        {c && <StatusPill status={c.risk_band} />}
      </div>

      {page.error && (
        <p className="form-error" role="alert">
          {page.error}
        </p>
      )}

      {page.isJurisdictionAdmin ? (
        <section className="panel settings-card">
          <h3>Jurisdiction rules (admin)</h3>
          <p>
            A jurisdiction and category pair that always forces qualified review, regardless of
            keywords.
          </p>
          <form onSubmit={page.addJurisdictionRule}>
            <Field label="Jurisdiction">
              <input name="jurisdiction" required maxLength={120} placeholder="e.g. Germany" />
            </Field>
            <Field label="Category">
              <select name="category" required defaultValue="">
                <option value="" disabled>
                  Choose one
                </option>
                {page.options?.categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Notes (optional)">
              <input name="notes" maxLength={1000} placeholder="Why this rule exists" />
            </Field>
            <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13 }}>
              <input type="checkbox" name="requiresLicense" defaultChecked />
              Requires a licensed reviewer
            </label>
            <Button type="submit" disabled={page.busy}>
              Add rule
            </Button>
          </form>
          {page.jurisdictionRules.length > 0 && (
            <ol className="activity-feed-list">
              {page.jurisdictionRules.map((rule) => (
                <li key={rule.id} className="activity-feed-row">
                  <span className="activity-feed-title">
                    <strong>
                      {rule.jurisdiction} · {rule.category}
                    </strong>
                    <br />
                    <small>{rule.notes || 'No notes'}</small>
                  </span>
                  <Button
                    variant="secondary"
                    disabled={page.busy}
                    onClick={() => void page.removeJurisdictionRule(rule.id)}
                  >
                    Remove
                  </Button>
                </li>
              ))}
            </ol>
          )}
        </section>
      ) : null}

      {step === 'objective' && (
        <section className="panel settings-card">
          <h3>What are you trying to achieve?</h3>
          <p>
            A decision, a problem, an opportunity, or a plan. “I don’t know yet” is a valid answer
            for everything after this.
          </p>
          <Field label="Objective" hint="Example: Improve customer retention">
            <input
              value={objective}
              onChange={(e) => setObjective(e.target.value)}
              placeholder="What outcome do you want?"
            />
          </Field>
          <Field
            label="Problem (optional)"
            hint="What's happening that makes this necessary? Leave blank if you're not sure yet."
          >
            <input value={problemStatement} onChange={(e) => setProblemStatement(e.target.value)} />
          </Field>
          <Button
            disabled={page.busy || !objective.trim()}
            onClick={async () => {
              const created = await page.start(objective, problemStatement);
              if (created) setStep('scope');
            }}
          >
            Continue
          </Button>
        </section>
      )}

      {step === 'scope' && c && (
        <section className="panel settings-card">
          <h3>Working scope</h3>
          <p>
            Fill in what you know. Use “Suggest for me” for a starting point you can edit or reject.
          </p>
          <Field label="Desired outcome">
            <input
              defaultValue={c.desired_outcome}
              onBlur={(e) => page.update({ desiredOutcome: e.target.value })}
            />
          </Field>
          <Field label="Category">
            <select
              defaultValue={c.category ?? ''}
              onChange={(e) => page.update({ category: e.target.value || null })}
            >
              <option value="">Not sure yet</option>
              {page.options?.categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Deliverables">
            <input
              defaultValue={c.deliverables}
              onBlur={(e) => page.update({ deliverables: e.target.value })}
            />
          </Field>
          <Field label="Acceptance criteria" hint="How will you know it's done and accepted?">
            <input
              defaultValue={c.acceptance_criteria}
              onBlur={(e) => page.update({ acceptanceCriteria: e.target.value })}
            />
          </Field>
          <Field label="In scope">
            <input
              defaultValue={c.in_scope}
              onBlur={(e) => page.update({ inScope: e.target.value })}
            />
          </Field>
          <Field label="Out of scope">
            <input
              defaultValue={c.out_of_scope}
              onBlur={(e) => page.update({ outOfScope: e.target.value })}
            />
          </Field>
          <Field label="Assumptions">
            <input
              defaultValue={c.assumptions}
              onBlur={(e) => page.update({ assumptions: e.target.value })}
            />
          </Field>
          <Field label="Budget context" hint="A rough figure or range is fine">
            <input
              defaultValue={c.budget_context}
              onBlur={(e) => page.update({ budgetContext: e.target.value })}
            />
          </Field>
          <Field label="Timeline context">
            <input
              defaultValue={c.timeline_context}
              onBlur={(e) => page.update({ timelineContext: e.target.value })}
            />
          </Field>
          <Field
            label="Jurisdiction (optional)"
            hint="Country or region the work is governed under, if relevant"
          >
            <input onBlur={(e) => page.update({ jurisdiction: e.target.value || null })} />
          </Field>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button
              variant="secondary"
              disabled={page.busy}
              onClick={async () => {
                const result = await page.suggest();
                if (!result) return;
                await page.update(
                  Object.fromEntries(
                    Object.entries(result.suggestions).filter(([, v]) => v),
                  ) as Record<string, string>,
                );
              }}
            >
              Suggest for me
            </Button>
            <Button onClick={() => setStep('review')}>Continue to review</Button>
          </div>
        </section>
      )}

      {step === 'review' && c && (
        <section className="panel settings-card">
          <h3>Ready to publish?</h3>
          <p>{RISK_COPY[c.risk_band]}</p>
          <Field label="Project title">
            <input
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              placeholder={c.objective}
            />
          </Field>
          <Field label="Engagement type">
            <select value={projectType} onChange={(e) => setProjectType(e.target.value)}>
              <option value="">Choose one</option>
              {page.options?.projectTypes.map((pt) => (
                <option key={pt} value={pt}>
                  {pt}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Budget range (USD)">
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="number"
                min={0}
                placeholder="Min"
                value={budgetMin}
                onChange={(e) => setBudgetMin(e.target.value)}
              />
              <input
                type="number"
                min={0}
                placeholder="Max"
                value={budgetMax}
                onChange={(e) => setBudgetMax(e.target.value)}
              />
            </div>
          </Field>
          <Field label="Timeline">
            <input
              value={timeline}
              onChange={(e) => setTimeline(e.target.value)}
              placeholder="e.g. 3 weeks"
            />
          </Field>
          {c.risk_band === 'red' && (
            <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13 }}>
              <input
                type="checkbox"
                checked={confirmRisk}
                onChange={(e) => setConfirmRisk(e.target.checked)}
              />
              I understand this scope may need qualified review and want to proceed anyway.
            </label>
          )}
          {c.risk_band !== 'green' && !page.reviewEntry && (
            <p>
              <Button
                variant="secondary"
                disabled={page.busy}
                onClick={() => void page.requestReview()}
              >
                Request expert review instead
              </Button>
            </p>
          )}
          {page.reviewEntry && (
            <p>
              Sent to the expert review queue — <StatusPill status={page.reviewEntry.status} />. You
              can still publish yourself once you're ready.{' '}
              <Button variant="secondary" disabled={page.busy} onClick={() => void page.loadReviewDiff()}>
                Check for a reviewer proposal
              </Button>
            </p>
          )}
          {page.reviewDiff && (
            <ReviewReconciliation diff={page.reviewDiff} busy={page.busy} reconcile={page.reconcile} />
          )}
          <Button
            disabled={
              page.busy ||
              !jobTitle.trim() ||
              !projectType ||
              !budgetMin ||
              !budgetMax ||
              !timeline.trim() ||
              (c.risk_band === 'red' && !confirmRisk)
            }
            onClick={() =>
              void page.publish({
                title: jobTitle,
                projectType,
                budgetMin: Math.round(Number(budgetMin)),
                budgetMax: Math.round(Number(budgetMax)),
                currency: 'USD',
                timeline,
                confirmed: confirmRisk,
              })
            }
          >
            Publish project
          </Button>
          {c.status === 'published' && <p>Published — this scoping case is now a live project.</p>}
        </section>
      )}
    </section>
  );
}

/** Compare-accept-reject for a reviewer's proposed field changes (F-SC-03). Fields not checked
 * stay as they are — rejection is the implicit default, never applied silently. */
function ReviewReconciliation({
  diff,
  busy,
  reconcile,
}: {
  diff: ReviewDiff;
  busy: boolean;
  reconcile: (accept: string[]) => Promise<void>;
}) {
  const [accepted, setAccepted] = useState<Record<string, boolean>>({});
  return (
    <section className="settings-card">
      <h4>Reviewer's proposed changes</h4>
      {Object.entries(diff.fields).map(([field, { current, proposed }]) => (
        <label key={field} style={{ display: 'block', marginBottom: 8 }}>
          <input
            type="checkbox"
            checked={Boolean(accepted[field])}
            onChange={(e) => setAccepted((prev) => ({ ...prev, [field]: e.target.checked }))}
          />{' '}
          <strong>{field}</strong>: <span style={{ textDecoration: 'line-through' }}>{String(current)}</span>
          {' → '}
          {String(proposed)}
        </label>
      ))}
      <Button
        disabled={busy}
        onClick={() => void reconcile(Object.keys(accepted).filter((field) => accepted[field]))}
      >
        Reconcile accepted fields
      </Button>
    </section>
  );
}
