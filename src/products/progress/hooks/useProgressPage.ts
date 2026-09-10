import { useEffect, useState } from 'react';
import { api } from '../../../api';
import { useWorkspace } from '../../workspace/components/WorkspaceShell';
import type { Snapshot } from '../types';

export function useProgressPage() {
  const { state } = useWorkspace();
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    api<Snapshot[]>('/progress')
      .then((items) => {
        if (active) setSnapshots(items);
      })
      .catch((error: Error) => {
        if (active) setError(error.message);
      });
    return () => {
      active = false;
    };
  }, []);
  return { state, error, snapshots };
}
