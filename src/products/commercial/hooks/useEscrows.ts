import { useEffect, useState, useCallback } from 'react';
import { api } from '../../../api';
import type { EscrowSummary, SummaryProject } from '../escrowSummary';

export type EscrowRecord = {
  id: string;
  projectId: string;
  projectTitle: string;
  milestoneTitle: string;
  amountMinor: number;
  currency: string;
  status: string;
};
/** Flat funding rows (one per funded milestone) from the escrow summary. */
export function escrowRecords(projects: SummaryProject[]): EscrowRecord[] {
  return projects.flatMap((project) =>
    project.milestones.flatMap((milestone) =>
      milestone.funding
        ? [
            {
              id: milestone.funding.id,
              projectId: project.id,
              projectTitle: project.title,
              milestoneTitle: milestone.title,
              amountMinor: Number(milestone.funding.amount_minor),
              currency: milestone.funding.currency,
              status: milestone.funding.status,
            },
          ]
        : [],
    ),
  );
}
/** Party-scoped escrow data in one call (GET /workspace/escrow-summary); never requires billing
 * administration. */
export function useEscrows() {
  const [revision, setRevision] = useState(0);
  const [data, setData] = useState<{
    projects: SummaryProject[];
    internalProjectCount: number;
    escrows: EscrowRecord[];
  }>({ projects: [], internalProjectCount: 0, escrows: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const retry = useCallback(() => setRevision((r) => r + 1), []);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    void Promise.all([
      api<EscrowSummary>('/workspace/escrow-summary'),
      api<{ id: string }[]>('/internal-projects'),
    ])
      .then(([summary, internal]) => {
        if (active)
          setData({
            projects: summary.projects,
            internalProjectCount: internal.length,
            escrows: escrowRecords(summary.projects),
          });
      })
      .catch((e) => {
        if (active) setError((e as Error).message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [revision]);
  return { ...data, loading, error, retry };
}
