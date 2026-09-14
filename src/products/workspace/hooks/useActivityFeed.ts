import { useEffect, useState } from 'react';
import { api } from '../../../api';

export type ActivityItem = {
  id: string;
  type: 'objective' | 'action' | 'job' | 'bid' | 'proposal' | 'workflow' | 'agent_run' | 'points';
  title: string;
  status: string;
  createdAt: string;
};

export function useActivityFeed() {
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    api<ActivityItem[]>('/activity', undefined, 'GET')
      .then(setItems)
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, []);
  return { items, loading, error };
}
