import { useEffect, useState, type FormEvent } from 'react';
import { api } from '../../../api';
import { useWorkspace } from '../../workspace/components/WorkspaceShell';
import type { Member } from '../types';

export function useMembersPage() {
  const { state, notify } = useWorkspace();
  const [members, setMembers] = useState<Member[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const canManage = state.permissions.includes('members:manage');
  async function load() {
    setMembers(await api<Member[]>('/admin/members'));
  }
  useEffect(() => {
    if (!canManage) return;
    let active = true;
    api<Member[]>('/admin/members')
      .then((data) => {
        if (active) setMembers(data);
      })
      .catch((error: Error) => {
        if (active) setError(error.message);
      });
    return () => {
      active = false;
    };
  }, [canManage]);
  async function add(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setBusy(true);
    setError('');
    try {
      await api('/admin/members', { email: new FormData(form).get('email'), role: 'member' });
      form.reset();
      await load();
      notify('Member added to this workspace.');
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function change(member: Member) {
    setBusy(true);
    setError('');
    try {
      await api(
        `/admin/members/${member.userId}`,
        { status: member.status === 'active' ? 'disabled' : 'active' },
        'PATCH',
      );
      await load();
      notify('Workspace access updated.');
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return { canManage, error, members, state, busy, change, add };
}
