import { useEffect, useState, type FormEvent } from 'react';
import { api } from '../../../api';
import { useWorkspace } from '../../workspace/components/WorkspaceShell';

export type Billable = {
  id: string;
  name: string;
  home_engine: string;
  max_authority: string;
  human_gate: string;
  points_cost: number;
};
export type Billables = {
  pointsUnitPriceMinor: number;
  currency: string;
  tools: Billable[];
  deepReview: { name: string; description: string; pointsCost: number };
};
export type Bundle = {
  id: string;
  name: string;
  description: string;
  price_minor: number;
  currency: string;
  points_included: number;
  billing_cycle: 'one_time' | 'monthly';
  status: 'draft' | 'active' | 'archived';
  items: Billable[];
};

export function usePricingPage() {
  const { notify } = useWorkspace();
  const [billables, setBillables] = useState<Billables | null>(null);
  const [bundles, setBundles] = useState<Bundle[]>([]);
  const [adminBundles, setAdminBundles] = useState<Bundle[]>([]);
  const [isEcosystemAdmin, setIsEcosystemAdmin] = useState(false);
  const [selectedAgentIds, setSelectedAgentIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function loadBillables() {
    try {
      setBillables(await api<Billables>('/billables', undefined, 'GET'));
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function loadBundles() {
    try {
      setBundles(await api<Bundle[]>('/bundles', undefined, 'GET'));
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function loadAdminBundles() {
    try {
      setAdminBundles(await api<Bundle[]>('/admin/bundles', undefined, 'GET'));
      setIsEcosystemAdmin(true);
    } catch {
      // Non-admins get a 403 here — silently leave the admin list empty and keep the
      // bundle-builder UI hidden, rather than error-banner or show a form only admins can submit.
      setIsEcosystemAdmin(false);
    }
  }
  useEffect(() => {
    void loadBillables();
    void loadBundles();
    void loadAdminBundles();
  }, []);

  async function purchasePoints(points: number) {
    setBusy(true);
    setError('');
    try {
      const result = await api<{ authorizationUrl: string }>('/points/purchase', { points });
      window.location.href = result.authorizationUrl;
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function purchaseBundle(bundleId: string) {
    setBusy(true);
    setError('');
    try {
      const result = await api<{ authorizationUrl: string }>('/points/purchase', { bundleId });
      window.location.href = result.authorizationUrl;
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function toggleAgent(id: string) {
    setSelectedAgentIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  async function createBundle(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setBusy(true);
    setError('');
    try {
      await api<Bundle>('/admin/bundles', {
        name: data.get('name'),
        description: data.get('description') || '',
        priceMinor: Math.round(Number(data.get('price')) * 100),
        currency: 'USD',
        pointsIncluded: Number(data.get('pointsIncluded')),
        billingCycle: data.get('billingCycle'),
        agentIds: selectedAgentIds,
      });
      form.reset();
      setSelectedAgentIds([]);
      await loadAdminBundles();
      notify('Bundle created as a draft.');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function setBundleStatus(bundleId: string, status: Bundle['status']) {
    setBusy(true);
    setError('');
    try {
      await api<Bundle>(`/admin/bundles/${bundleId}`, { status }, 'PATCH');
      await Promise.all([loadAdminBundles(), loadBundles()]);
      notify(`Bundle ${status === 'active' ? 'published' : status}.`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function deleteBundle(bundleId: string) {
    setBusy(true);
    setError('');
    try {
      await api(`/admin/bundles/${bundleId}`, {}, 'DELETE');
      await Promise.all([loadAdminBundles(), loadBundles()]);
      notify('Bundle deleted.');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return {
    billables,
    bundles,
    adminBundles,
    isEcosystemAdmin,
    selectedAgentIds,
    busy,
    error,
    purchasePoints,
    purchaseBundle,
    toggleAgent,
    createBundle,
    setBundleStatus,
    deleteBundle,
  };
}
