import type { FormEvent } from 'react';
import { useState } from 'react';
import { api } from '../../../api';
import { useWorkspace } from '../../workspace/components/WorkspaceShell';

export function useRhythmPage({ progress = false }: { progress?: boolean }) {
  const { state, refresh, notify } = useWorkspace();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const done = state.actions.filter((a) => a.status === 'Done').length;
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget));
    setBusy(true);
    try {
      await api('/reviews', data);
      await refresh();
      setOpen(false);
      notify('Reflection saved. Carry the learning forward.');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return { progress, setOpen, done, state, open, save, error, busy };
}
