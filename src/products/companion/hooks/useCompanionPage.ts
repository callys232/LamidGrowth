import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../../../api';
import { useWorkspace } from '../../workspace/components/WorkspaceShell';
import type { Policy } from '../../intelligence/types';

export function useCompanionPage() {
  const [, setSearchParams] = useSearchParams();
  const { state, refresh, notify } = useWorkspace();
  const [step, setStep] = useState(0);
  const [title, setTitle] = useState('');
  const [context, setContext] = useState('');
  const [success, setSuccess] = useState('');
  const [constraints, setConstraints] = useState('');
  const [next, setNext] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [pathway, setPathway] = useState<
    Array<{ title: string; notes: string; selected: boolean }>
  >([]);
  const [approach, setApproach] = useState('');
  const [previewing, setPreviewing] = useState(false);
  const [savedId, setSavedId] = useState('');
  const [aiPolicy, setAiPolicy] = useState<Policy | null>(null);
  const [consent, setConsent] = useState(false);
  const [source, setSource] = useState<'template' | 'ai'>('template');
  const [assumptions, setAssumptions] = useState<string[]>([]);
  useEffect(() => {
    let active = true;
    const loadPolicy = () =>
      void api<Policy>('/ai/settings')
        .then((policy) => {
          if (active) setAiPolicy(policy);
        })
        .catch(() => {});
    loadPolicy();
    window.addEventListener('focus', loadPolicy);
    return () => {
      active = false;
      window.removeEventListener('focus', loadPolicy);
    };
  }, [state.workspace.id]);
  const attempt = useRef({ fingerprint: '', key: '' });
  const saving = useRef(false);
  const generating = useRef(false);
  const previewInput = useRef('');
  function objective() {
    return {
      title,
      description: context,
      success,
      constraints,
      priority: 'Medium',
      context: state.workspace.context,
    };
  }
  async function prepareReview(mode: 'template' | 'ai' = 'template') {
    if (busy || generating.current) return;
    setStep(2);
    const input = {
      objective: objective(),
      mode,
      ...(mode === 'ai' ? { consent, rulesVersion: aiPolicy?.version } : {}),
    };
    const fingerprint = JSON.stringify(input.objective);
    if (mode === 'template' && fingerprint === previewInput.current) return;
    generating.current = true;
    if (mode === 'template') previewInput.current = '';
    setPreviewing(true);
    setError('');
    if (mode === 'template') {
      setPathway([]);
      setApproach('');
      setAssumptions([]);
      setSource('template');
    }
    try {
      const result = await api<{
        approach: string;
        steps: Array<{ title: string; notes: string }>;
        source: 'template' | 'ai';
        assumptions?: string[];
      }>('/plans/preview', input);
      setApproach(result.approach);
      setSource(result.source);
      setAssumptions(result.assumptions || []);
      setPathway(result.steps.map((step) => ({ ...step, selected: true })));
      previewInput.current = fingerprint;
    } catch (e) {
      setError(
        `Suggestions could not be loaded. Retry or save your own next action. ${(e as Error).message}`,
      );
    } finally {
      setPreviewing(false);
      generating.current = false;
    }
  }
  function reset() {
    if (saving.current) return;
    setTitle('');
    setContext('');
    setSuccess('');
    setConstraints('');
    setNext('');
    setPathway([]);
    setApproach('');
    setError('');
    setSavedId('');
    setConsent(false);
    setSource('template');
    setAssumptions([]);
    setStep(0);
    previewInput.current = '';
    attempt.current = { fingerprint: '', key: '' };
  }
  async function save() {
    if (saving.current || previewing) return;
    saving.current = true;
    setBusy(true);
    setError('');
    try {
      const input = {
        objective: objective(),
        nextAction: next,
        pathway: pathway
          .filter((step) => step.selected)
          .map(({ title, notes }) => ({ title, notes })),
      };
      const fingerprint = JSON.stringify(input);
      if (attempt.current.fingerprint !== fingerprint)
        attempt.current = { fingerprint, key: crypto.randomUUID() };
      const result = await api<{ objective: { id: string } }>(
        '/plans',
        input,
        'POST',
        attempt.current.key,
      );
      setSavedId(result.objective.id);
      setSearchParams({ objective: result.objective.id }, { replace: true });
      setStep(3);
      notify('Your goal and chosen steps are saved.');
      try {
        await refresh();
      } catch {
        setError('Your plan was saved, but progress could not refresh. Reload the page to see it.');
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
      saving.current = false;
    }
  }
  return {
    step,
    setStep,
    title,
    setTitle,
    context,
    setContext,
    success,
    setSuccess,
    constraints,
    setConstraints,
    next,
    setNext,
    error,
    busy,
    save,
    pathway,
    setPathway,
    approach,
    previewing,
    prepareReview,
    savedId,
    reset,
    aiPolicy,
    consent,
    setConsent,
    source,
    assumptions,
  };
}
