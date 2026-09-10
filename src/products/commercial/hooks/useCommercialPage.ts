import { useEffect, useState } from 'react';
import { api } from '../../../api';
import { useWorkspace } from '../../workspace/components/WorkspaceShell';
import type { Job, Options } from '../types';

export function useCommercialPage() {
  const { state } = useWorkspace();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [options, setOptions] = useState<Options | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [view, setView] = useState<'workspace' | 'marketplace'>('workspace');
  const [query, setQuery] = useState('');
  const [offset, setOffset] = useState(0);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const [selected, setSelected] = useState<Job | null>(null);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    Promise.all([
      api<Options>('/job-options'),
      api<{ balance: number }>('/points'),
      api<Job[]>(
        view === 'workspace'
          ? '/jobs'
          : `/marketplace/jobs?q=${encodeURIComponent(query)}&offset=${offset}`,
      ),
    ])
      .then(([options, points, jobs]) => {
        if (active) {
          setOptions(options);
          setBalance(points.balance);
          setJobs(jobs);
          setError('');
        }
      })
      .catch((error: Error) => {
        if (active) setError(error.message);
      });
    return () => {
      active = false;
    };
  }, [view, query, offset, revision]);
  return {
    setCreating,
    options,
    balance,
    view,
    setView,
    setOffset,
    state,
    query,
    setQuery,
    error,
    jobs,
    setSelected,
    offset,
    creating,
    setRevision,
    selected,
  };
}
