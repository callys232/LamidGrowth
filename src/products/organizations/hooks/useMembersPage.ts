import { useEffect, useState, type FormEvent } from 'react';
import { api } from '../../../api';
import { useWorkspace } from '../../workspace/components/WorkspaceShell';
import type { Member } from '../types';

export type EscrowOverview = {
  totals: { heldMinor: number; releasedMinor: number; refundedMinor: number; pendingMinor: number };
  byStatus: Record<string, number>;
  currentlyHeld: Array<{
    milestoneId: string;
    workspaceId: string;
    amountMinor: number;
    currency: string;
    heldAt: string;
  }>;
};
export type ConciergeApplication = {
  id: string;
  user_id: string;
  headline: string;
  experience: string;
  status: 'pending' | 'approved' | 'rejected';
  monthly_rate_minor: number;
  applicantName: string;
  applicantEmail: string;
};

export function useMembersPage() {
  const { state, notify } = useWorkspace();
  const [members, setMembers] = useState<Member[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const canManage = state.permissions.includes('members:manage');
  const [isEcosystemAdmin, setIsEcosystemAdmin] = useState(false);
  const [conciergeApplications, setConciergeApplications] = useState<ConciergeApplication[]>([]);
  const [escrowOverview, setEscrowOverview] = useState<EscrowOverview | null>(null);
  useEffect(() => {
    api<EscrowOverview>('/admin/escrow-overview', undefined, 'GET')
      .then(setEscrowOverview)
      .catch(() => {});
  }, []);
  async function loadConciergeApplications() {
    try {
      const data = await api<ConciergeApplication[]>(
        '/admin/concierge-applications',
        undefined,
        'GET',
      );
      setConciergeApplications(data);
      setIsEcosystemAdmin(true);
    } catch {
      setIsEcosystemAdmin(false);
    }
  }
  useEffect(() => {
    void loadConciergeApplications();
  }, []);
  async function decideConciergeApplication(id: string, decision: 'approve' | 'reject') {
    setBusy(true);
    try {
      await api(`/admin/concierge-applications/${id}`, { decision }, 'PATCH');
      await loadConciergeApplications();
      notify(`Concierge application ${decision === 'approve' ? 'approved' : 'rejected'}.`);
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
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
  return {
    canManage,
    error,
    members,
    state,
    busy,
    change,
    add,
    isEcosystemAdmin,
    conciergeApplications,
    decideConciergeApplication,
    escrowOverview,
  };
}
