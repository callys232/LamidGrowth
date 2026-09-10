import type { FormEvent } from 'react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../../api';
import type { Context } from '../../../types';

export function useAuthPage({ login = false }: { login?: boolean }) {
  const navigate = useNavigate();
  const [step, setStep] = useState(login ? 1 : 0);
  const [context, setContext] = useState<Context>('Professional');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [visible, setVisible] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError('');
    const data = new FormData(e.currentTarget);
    try {
      await api(
        login ? '/auth/login' : '/auth/signup',
        login
          ? { email: data.get('email'), password: data.get('password') }
          : {
              name: data.get('name'),
              email: data.get('email'),
              password: data.get('password'),
              context,
            },
      );
      navigate('/os');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function demo() {
    setBusy(true);
    setError('');
    try {
      await api('/auth/demo', {});
      navigate('/os');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return {
    login,
    step,
    context,
    setContext,
    setStep,
    busy,
    demo,
    submit,
    visible,
    setVisible,
    error,
  };
}
