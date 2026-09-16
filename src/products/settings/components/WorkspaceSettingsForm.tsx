import { Button } from '../../../shared/ui/Button';
import { Field } from '../../../shared/ui/Field';
import type { useSettingsPage } from '../hooks/useSettingsPage';
export function WorkspaceSettingsForm({
  save,
  state,
  canManage,
  error,
  busy,
}: Pick<ReturnType<typeof useSettingsPage>, 'save' | 'state' | 'canManage' | 'error' | 'busy'>) {
  return (
    <>
      <section className="panel settings-card">
        <h2>Workspace</h2>
        <p>A name and context that fit the work you’re doing.</p>
        <form onSubmit={save}>
          <Field label="Workspace name">
            <input
              name="name"
              defaultValue={state.workspace.name}
              disabled={!canManage}
              required
              maxLength={100}
            />
          </Field>
          <Field label="Starting context" hint="Set at signup and fixed from then on.">
            <div className="field-static">{state.workspace.context}</div>
          </Field>
          {error && (
            <p role="alert" className="form-error">
              {error}
            </p>
          )}
          <Button type="submit" disabled={busy || !canManage}>
            {busy ? 'Saving…' : 'Save changes'}
          </Button>
        </form>
      </section>
    </>
  );
}
