import { useEffect, useState } from 'react';
import { api } from '../../../api';
import { useWorkspace } from '../../workspace/components/WorkspaceShell';
import type { KnowledgeItem } from '../types';

export function useKnowledgePage() {
  const { state } = useWorkspace();
  const [items, setItems] = useState<KnowledgeItem[]>([]);
  const [total, setTotal] = useState(0),
    [offset, setOffset] = useState(0);
  const [query, setQuery] = useState(''),
    [error, setError] = useState('');
  const [selected, setSelected] = useState<KnowledgeItem | 'new' | null>(null);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    const timer = setTimeout(() => {
      api<{ items: KnowledgeItem[]; total: number }>(
        `/knowledge?q=${encodeURIComponent(query)}&offset=${offset}`,
      )
        .then((data) => {
          if (active) {
            setItems(data.items);
            setTotal(data.total);
            setError('');
          }
        })
        .catch((error: Error) => {
          if (active) setError(error.message);
        });
    }, 200);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [query, offset, revision]);
  return {
    setSelected,
    query,
    setQuery,
    setOffset,
    error,
    items,
    state,
    offset,
    total,
    selected,
    setRevision,
  };
}
