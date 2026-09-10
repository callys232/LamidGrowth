import { useEffect, useState, type FormEvent } from 'react';
import { api } from '../../../api';
import { useWorkspace } from '../../workspace/components/WorkspaceShell';
import type { Policy, Review } from '../types';

export function useIntelligencePage({ settings = false }: { settings?: boolean }) {
  const { state, notify, newAction } = useWorkspace();
  const [policy, setPolicy] = useState<Policy | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [knowledge, setKnowledge] = useState<{ id: string; title: string; version: number }[]>([]);
  const [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  const [objectiveId, setObjectiveId] = useState(state.objectives[0]?.id || '');
  async function load() {
    const [policy, reviews] = await Promise.all([
      api<Policy>('/ai/settings'),
      api<Review[]>('/ai/reviews'),
    ]);
    setPolicy(policy);
    setReviews(reviews);
  }
  useEffect(() => {
    let active = true;
    Promise.all([
      api<Policy>('/ai/settings'),
      api<Review[]>('/ai/reviews'),
      api<{ items: { id: string; title: string; version: number }[] }>('/knowledge'),
    ])
      .then(([policy, reviews, knowledge]) => {
        if (active) {
          setPolicy(policy);
          setReviews(reviews);
          setKnowledge(knowledge.items);
        }
      })
      .catch((error: Error) => {
        if (active) setError(error.message);
      });
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    if (settings) return;
    let active = true;
    const timer = setInterval(() => {
      if (!document.hidden)
        void api<Review[]>('/ai/reviews')
          .then((items) => {
            if (active) setReviews(items);
          })
          .catch(() => {});
    }, 5000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [settings]);
  async function configure(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!policy) return;
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError('');
    try {
      await api(
        '/ai/settings',
        {
          enabled: form.get('enabled') === 'on',
          dailyLimit: Number(form.get('dailyLimit')),
          version: policy.version,
        },
        'PATCH',
      );
      await load();
      notify('AI review settings saved.');
    } catch (error) {
      setError((error as Error).message);
      await load().catch(() => {});
    } finally {
      setBusy(false);
    }
  }
  async function review(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    const form = new FormData(event.currentTarget);
    try {
      await api('/ai/reviews', {
        objectiveId,
        objectiveVersion: state.objectives.find((o) => o.id === objectiveId)?.version,
        knowledgeIds: form.getAll('knowledge'),
        question: form.get('question'),
        consent: form.get('consent') === 'on',
        requestKey: crypto.randomUUID(),
      });
      await load();
      notify('Review prepared. Consider its evidence and assumptions before acting.');
    } catch (error) {
      setError((error as Error).message);
      await load().catch(() => {});
    } finally {
      setBusy(false);
    }
  }
  return {
    settings,
    error,
    policy,
    state,
    configure,
    busy,
    review,
    objectiveId,
    setObjectiveId,
    knowledge,
    reviews,
    load,
    setError,
    newAction,
  };
}
