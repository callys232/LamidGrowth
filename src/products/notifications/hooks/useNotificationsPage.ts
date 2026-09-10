import { useEffect, useState } from 'react';
import { api } from '../../../api';
import type { Notice } from '../types';

export function useNotificationsPage() {
  const [items, setItems] = useState<Notice[]>([]);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    api<Notice[]>('/notifications')
      .then((items) => {
        if (active) setItems(items);
      })
      .catch((error: Error) => {
        if (active) setError(error.message);
      });
    return () => {
      active = false;
    };
  }, []);
  return { error, items, setItems, setError };
}
