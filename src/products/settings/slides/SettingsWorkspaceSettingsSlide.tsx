import { ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { AccountSummary } from '../components/AccountSummary';
import { WorkspaceDataExport } from '../components/WorkspaceDataExport';
import { WorkspaceSettingsForm } from '../components/WorkspaceSettingsForm';
import type { useSettingsPage } from '../hooks/useSettingsPage';

export function SettingsWorkspaceSettingsSlide({
  save,
  state,
  canManage,
  error,
  busy,
}: Pick<ReturnType<typeof useSettingsPage>, 'save' | 'state' | 'canManage' | 'error' | 'busy'>) {
  return (
    <>
      <div className="settings-grid">
        <WorkspaceSettingsForm
          save={save}
          state={state}
          canManage={canManage}
          error={error}
          busy={busy}
        />
        <div>
          <AccountSummary state={state} />
          <WorkspaceDataExport state={state} />
          <section className="settings-note">
            <ShieldCheck size={20} />
            <div>
              <p>
                Workspace owners manage access and review decisions. Enterprise workspaces can add
                existing accounts.
              </p>
              <ul className="settings-note-links">
                <li>
                  <Link to="/os/settings/members">Manage people and access</Link>
                </li>
                <li>
                  <Link to="/os/settings/notifications">Review reminders</Link>
                </li>
                <li>
                  <Link to="/os/settings/ai">AI and context controls</Link>
                </li>
              </ul>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
