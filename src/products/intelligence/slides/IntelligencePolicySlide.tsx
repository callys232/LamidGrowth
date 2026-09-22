import { Button } from '../../../shared/ui/Button';
import { Field } from '../../../shared/ui/Field';
import type { useIntelligencePage } from '../hooks/useIntelligencePage';

export function IntelligencePolicySlide({
  settings,
  policy,
  state,
  configure,
  busy,
}: Pick<
  ReturnType<typeof useIntelligencePage>,
  'settings' | 'policy' | 'state' | 'configure' | 'busy'
>) {
  return (
    <>
      {settings && policy && state.permissions.includes('workspace:manage') && (
        <section className="panel settings-card ai-rules-card">
          <h2>Your AI rules</h2>
          <form key={policy.version} onSubmit={configure}>
            <label className="checkbox-field">
              <input
                name="enabled"
                type="checkbox"
                defaultChecked={policy.enabled}
                disabled={!policy.configured || !policy.accountEligible}
              />
              Allow external AI in this workspace
            </label>
            <Field label="Daily AI request limit">
              <input
                name="dailyLimit"
                type="number"
                min={1}
                max={100}
                required
                defaultValue={policy.dailyLimit}
              />
            </Field>
            <Field label="Maximum points per AI or specialist request">
              <input
                name="maxPointsPerRequest"
                type="number"
                min={0}
                max={10000}
                required
                defaultValue={policy.rules.maxPointsPerRequest}
              />
            </Field>
            <fieldset>
              <legend>Allowed features</legend>
              {(
                [
                  ['pathways', 'Suggest goal pathways'],
                  ['reviews', 'Review goals'],
                  ['specialists', 'Use Companion specialists'],
                  ['documents', 'Draft documents'],
                  ['deliverableReviews', 'Review deliverables'],
                  ['workflowCommands', 'Control workflows through Companion'],
                  ['humanHandoffs', 'Create requests for human expert review'],
                ] as const
              ).map(([key, label]) => (
                <label className="checkbox-field" key={key}>
                  <input name={key} type="checkbox" defaultChecked={policy.rules[key]} />
                  {label}
                </label>
              ))}
            </fieldset>
            <fieldset>
              <legend>Data AI may read</legend>
              {(
                [
                  ['objective', 'Goals and their context'],
                  ['action', 'Actions'],
                  ['knowledge', 'Knowledge'],
                  ['progress', 'Progress evidence'],
                  ['review', 'Reflections'],
                  ['notification', 'Notifications'],
                  ['job', 'Jobs'],
                  ['proposal', 'Proposals'],
                  ['submission', 'Deliverable submissions'],
                ] as const
              ).map(([key, label]) => (
                <label className="checkbox-field" key={key}>
                  <input
                    name="allowedSources"
                    value={key}
                    type="checkbox"
                    defaultChecked={policy.rules.allowedSources.includes(key)}
                  />
                  {label}
                </label>
              ))}
              <p>
                Your request text is also sent when you consent. Excluding a data type prevents
                automatic sharing; avoid copying excluded data into your request.
              </p>
            </fieldset>
            <fieldset>
              <legend>Changes automated workflows may make</legend>
              {(
                [
                  ['action.prepare', 'Create actions'],
                  ['progress.snapshot', 'Record progress'],
                  ['review.reminder', 'Create reminders'],
                ] as const
              ).map(([key, label]) => (
                <Field key={key} label={label}>
                  <select name={key} defaultValue={policy.rules.changes[key]}>
                    <option value="block">Never allow</option>
                    <option value="ask">Ask before each change</option>
                    <option value="allow">Allow in workflows I authorize</option>
                  </select>
                </Field>
              ))}
              <p>
                Allow applies only to the steps and inputs in a workflow you explicitly start, until
                its expiry. Changing these rules takes effect before the next step. Goal edits,
                deletion, dates, and budgets are controlled directly by people.
              </p>
            </fieldset>
            <Field label="Planning preferences for AI">
              <textarea
                name="instructions"
                rows={4}
                maxLength={2000}
                defaultValue={policy.rules.instructions}
                placeholder="For example: favour low-cost experiments and ask when a constraint is unclear."
              />
            </Field>
            <p>
              These preferences guide suggestions. The permissions above are enforced by the server
              and cannot be changed by an AI response.
            </p>
            <p>
              Requests, including failed attempts, count toward this limit. Each request still
              requires the sender's consent. Disabling external AI prevents new requests and
              discards responses from requests still in progress.
            </p>
            <Button type="submit" disabled={busy}>
              Save AI rules
            </Button>
          </form>
        </section>
      )}
    </>
  );
}
