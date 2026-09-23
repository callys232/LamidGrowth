import { useEffect, useState } from 'react';
import { api, ApiError } from '../../../api';

export type PointsLedgerEntry = {
  amount: number;
  reason: string;
  reference_id: string | null;
  created_at: number;
};
export type PointsOverview = {
  balance: number;
  unitPriceMinor: number;
  currency: string;
  totalPurchasedPoints: number;
  totalPurchasedMinor: number;
  recentLedger: PointsLedgerEntry[];
};
export type EscrowItem = {
  id: string;
  milestoneId: string;
  milestoneTitle: string;
  projectTitle: string;
  amountMinor: number;
  currency: string;
  status: string;
  createdAt: string;
  heldAt: string | null;
  releasedAt: string | null;
  refundedAt: string | null;
};
export type Transfer = {
  id: string;
  milestoneTitle: string;
  amountMinor: number;
  currency: string;
  status: string;
  createdAt: string;
};
export type FinanceOverview = {
  escrow: {
    heldMinor: number;
    releasedMinor: number;
    refundedMinor: number;
    pendingMinor: number;
    items: EscrowItem[];
  };
  transfers: Transfer[];
  billing: { lineItems: unknown[]; totalMinor: number; currency: string };
};

/** /os/finance — real workspace financial data. `overview` is owner-only (billing:manage); a
 * non-owner gets a 403 here, which we treat the same way usePricingPage treats a non-admin 403 on
 * /admin/bundles — silently leave that section absent rather than error-banner a page most
 * members can otherwise use fully. */
export function useFinancePage() {
  const [points, setPoints] = useState<PointsOverview | null>(null);
  const [overview, setOverview] = useState<FinanceOverview | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api<PointsOverview>('/finance/points', undefined, 'GET')
      .then(setPoints)
      .catch((e) => setError((e as Error).message));
    api<FinanceOverview>('/finance/overview', undefined, 'GET')
      .then((data) => {
        setOverview(data);
        setIsOwner(true);
      })
      .catch((e) => {
        if (!(e instanceof ApiError && e.status === 403)) setError((e as Error).message);
      });
  }, []);

  return { points, overview, isOwner, error };
}
