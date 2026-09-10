import type { useSettingsPage } from '../hooks/useSettingsPage';
export function AccountSummary({ state }: Pick<ReturnType<typeof useSettingsPage>, 'state'>) {
  return (
    <>
      <section className="panel settings-card">
        <h2>Your account</h2>
        <dl className="detail-list">
          <div>
            <dt>Name</dt>
            <dd>{state.user.name}</dd>
          </div>
          <div>
            <dt>Email</dt>
            <dd>{state.user.email || 'Sample account'}</dd>
          </div>
          <div>
            <dt>Role</dt>
            <dd>Workspace {state.workspace.role}</dd>
          </div>
        </dl>
      </section>
    </>
  );
}
