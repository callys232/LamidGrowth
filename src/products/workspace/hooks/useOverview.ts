import { useCallback, useEffect, useState } from 'react';
import { api } from '../../../api';
import type { EscrowSummary } from '../../commercial/escrowSummary';
import type { Dispute } from '../../commercial/pages/DisputesPage';
import type { JobMatch } from '../../talent/hooks/useTalentPage';
import { useWorkspace } from '../components/WorkspaceShell';
import {
  needsYou,
  overviewKpis,
  type Kpi,
  type NeedsYouItem,
  type OverviewInput,
} from '../overview/overviewModel';

type Loaded = Omit<OverviewInput, 'state'>;

/** Loads what the Overview summarises: projects with milestone funding, disputes and, for users
 * with a talent profile, job matches. One escrow-summary call replaces the per-milestone fan-out. */
export function useOverview(): {
  loading: boolean;
  error: string;
  kpis: Kpi[];
  queue: NeedsYouItem[];
  retry: () => void;
} {
  const { state } = useWorkspace();
  const [revision, setRevision] = useState(0);
  const [data, setData] = useState<Loaded | null>(null);
  const [error, setError] = useState('');
  const retry = useCallback(() => setRevision((r) => r + 1), []);
  useEffect(() => {
    let live = true;
    setError('');
    async function load(): Promise<Loaded> {
      const [summary, disputes, profile] = await Promise.all([
        api<EscrowSummary>('/workspace/escrow-summary'),
        api<Dispute[]>('/disputes'),
        api<unknown>('/talent/profile/mine').catch(() => null),
      ]);
      const jobMatches = profile
        ? await api<JobMatch[]>('/talent/job-matches').catch(() => null)
        : null;
      const milestones = summary.projects.flatMap((project) => project.milestones);
      return {
        projects: summary.projects,
        disputes,
        jobMatches,
        fundings: Object.fromEntries(milestones.map((m) => [m.id, m.funding])),
      };
    }
    void load()
      .then((next) => {
        if (live) setData(next);
      })
      .catch((e) => {
        if (live) setError((e as Error).message);
      });
    return () => {
      live = false;
    };
  }, [revision, state.workspace.id]);
  const input = data && { state, ...data };
  return {
    loading: !data && !error,
    error,
    kpis: input ? overviewKpis(input) : [],
    queue: input ? needsYou(input) : [],
    retry,
  };
}
