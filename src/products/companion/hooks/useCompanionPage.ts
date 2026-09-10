import { useState } from 'react';
import { api } from '../../../api';
import { useWorkspace } from '../../workspace/components/WorkspaceShell';

export function useCompanionPage() {
  const { state, refresh, notify } = useWorkspace();
  const [step, setStep] = useState(0);
  const [title, setTitle] = useState('');
  const [context, setContext] = useState('');
  const [success, setSuccess] = useState('');
  const [constraints, setConstraints] = useState('');
  const [next, setNext] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function save() {
    setBusy(true);
    setError('');
    try {
      await api('/plans', {
        objective: {
          title,
          description: context,
          success,
          constraints,
          priority: 'Medium',
          context: state.workspace.context,
        },
        nextAction: next,
      });
      await refresh();
      setStep(3);
      notify('Your thinking is now connected to your work.');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
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
  };
}
