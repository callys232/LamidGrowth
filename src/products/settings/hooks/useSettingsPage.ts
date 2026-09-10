import type { FormEvent } from 'react';
import { useState } from 'react';
import { api } from '../../../api';
import { useWorkspace } from '../../workspace/components/WorkspaceShell';

export function useSettingsPage() {
  const { state, refresh, notify } = useWorkspace();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const canManage = state.permissions.includes('workspace:manage');
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    const data = Object.fromEntries(new FormData(e.currentTarget));
    try {
      await api('/workspace', data, 'PATCH');
      await refresh();
      notify('Workspace settings saved.');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return { save, state, canManage, error, busy };
}
