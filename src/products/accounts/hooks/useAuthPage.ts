import type { FormEvent } from 'react';
import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../../../api';
import { contexts } from '../../../shared/lib/contexts';
import type { Context } from '../../../types';

function contextFromParams(params: URLSearchParams): Context {
  const requested = params.get('context');
  return (contexts as readonly string[]).includes(requested ?? '')
    ? (requested as Context)
    : 'Professional';
}

export function useAuthPage({ login = false }: { login?: boolean }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState(login ? 1 : 0);
  // Pre-ticks whichever context the visitor arrived to explore (e.g. a who-its-for/professionals
  // page's "Explore LAMID ONE for Professionals" link), instead of always defaulting silently.
  const [context, setContext] = useState<Context>(() => contextFromParams(searchParams));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [visible, setVisible] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError('');
    const data = new FormData(e.currentTarget);
    try {
      const result = await api<{ verificationRequired?: boolean; challengeId?: string; developmentCode?: string }>(
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
      if (result.verificationRequired) {
        if (result.developmentCode) sessionStorage.setItem('lamid-development-otp', result.developmentCode);
        navigate(`/verify?email=${encodeURIComponent(String(data.get('email')))}${result.challengeId ? `&challenge=${result.challengeId}` : ''}`);
      } else navigate('/os');
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
