import { useEffect, useState, type FormEvent } from 'react';
import { api } from '../../../api';
import { useWorkspace } from '../../workspace/components/WorkspaceShell';

export type ConciergeApplication = {
  id: string;
  headline: string;
  experience: string;
  status: 'pending' | 'approved' | 'rejected';
  monthly_rate_minor: number;
};
export type ConciergeProvider = {
  id: string;
  name: string;
  headline: string;
  monthlyRateMinor: number;
};
export type BillingLineItem = {
  id: string;
  kind: 'ecosystem_fee' | 'pm_fee';
  description: string;
  amount_minor: number;
  currency: string;
  period_start: number;
  period_end: number;
};
export type BillingStatement = {
  lineItems: BillingLineItem[];
  totalMinor: number;
  currency: string;
  pointsUsage: {
    totalPointsSpent: number;
    estimatedCostMinor: number;
    currency: string;
    note: string;
  };
};

export function useConciergePage() {
  const { state, notify } = useWorkspace();
  const [myApplication, setMyApplication] = useState<ConciergeApplication | null>(null);
  const [providers, setProviders] = useState<ConciergeProvider[]>([]);
  const [statement, setStatement] = useState<BillingStatement | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const canAssign = state.permissions.includes('workspace:manage');
  const canViewBilling = state.permissions.includes('billing:manage');

  useEffect(() => {
    api<ConciergeApplication[]>('/concierge/applications/mine', undefined, 'GET')
      .then((rows) => setMyApplication(rows[0] ?? null))
      .catch(() => {});
  }, []);
  useEffect(() => {
    if (!canAssign) return;
    api<ConciergeProvider[]>('/concierge/providers', undefined, 'GET')
      .then(setProviders)
      .catch(() => {});
  }, [canAssign]);
  useEffect(() => {
    if (!canViewBilling) return;
    api<BillingStatement>('/billing/statement', undefined, 'GET')
      .then(setStatement)
      .catch(() => {});
  }, [canViewBilling]);

  async function apply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setBusy(true);
    setError('');
    try {
      const rate = Number(data.get('monthlyRate') || 0);
      const application = await api<ConciergeApplication>('/concierge/applications', {
        headline: data.get('headline'),
        experience: data.get('experience') || '',
        monthlyRateMinor: Math.round(rate * 100),
      });
      setMyApplication(application);
      notify('Concierge application submitted.');
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function assign(userId: string) {
    setBusy(true);
    setError('');
    try {
      await api('/workspace/concierge', { userId });
      notify('Concierge assigned to this workspace.');
      const refreshed = await api<BillingStatement>('/billing/statement', undefined, 'GET').catch(
        () => null,
      );
      if (refreshed) setStatement(refreshed);
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return {
    myApplication,
    providers,
    statement,
    busy,
    error,
    canAssign,
    canViewBilling,
    apply,
    assign,
  };
}
