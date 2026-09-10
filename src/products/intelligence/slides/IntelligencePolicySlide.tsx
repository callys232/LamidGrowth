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
        <section className="panel settings-card">
          <h2>Workspace policy</h2>
          <form key={policy.version} onSubmit={configure}>
            <label className="checkbox-field">
              <input
                name="enabled"
                type="checkbox"
                defaultChecked={policy.enabled}
                disabled={!policy.configured || !policy.accountEligible}
              />
              Allow members to request external AI reviews
            </label>
            <Field label="Daily review limit">
              <input
                name="dailyLimit"
                type="number"
                min={1}
                max={100}
                required
                defaultValue={policy.dailyLimit}
              />
            </Field>
            <p>
              Requests, including failed attempts, count toward this limit. Each request still
              requires the sender's consent. Disabling reviews prevents new requests and discards
              responses from requests still in progress.
            </p>
            <Button type="submit" disabled={busy}>
              Save AI settings
            </Button>
          </form>
        </section>
      )}
    </>
  );
}
