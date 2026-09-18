import { useEffect, useState } from 'react';
import { api } from '../../../../api';

export function formatMinor(amountMinor: number, currency: string) {
  const amount = amountMinor / 100;
  return `${currency === 'USD' ? '$' : currency + ' '}${amount % 1 === 0 ? amount : amount.toFixed(2)}`;
}

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
  learningPaths: { id: string; name: string; points_cost: number }[];
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

/** Anonymous-visitor pricing data — no session, no purchase actions. Backs the public /pricing
 * page's "see every billable" section, mounted by mountPublicPricing ahead of the session gate. */
export function usePublicBillables() {
  const [billables, setBillables] = useState<Billables | null>(null);
  const [bundles, setBundles] = useState<Bundle[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      api<Billables>('/billables', undefined, 'GET'),
      api<Bundle[]>('/bundles', undefined, 'GET'),
    ])
      .then(([b, bd]) => {
        if (cancelled) return;
        setBillables(b);
        setBundles(bd);
      })
      .catch((e) => {
        if (!cancelled) setError((e as Error).message);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { billables, bundles, error };
}
