import { Download } from 'lucide-react';
import type { useSettingsPage } from '../hooks/useSettingsPage';
export function WorkspaceDataExport({ state }: Pick<ReturnType<typeof useSettingsPage>, 'state'>) {
  return (
    <>
      <section className="panel settings-card">
        <h2>Your data, in view</h2>
        <p>
          Objectives, actions, reflections, and activity are stored in the local application
          database. External AI reviews share only the selected context after workspace opt-in and
          your consent.
        </p>
        {state.permissions.includes('workspace:export') && (
          <a className="button button-secondary" href="/api/export" download>
            <Download size={16} /> Export workspace data
          </a>
        )}
      </section>
    </>
  );
}
