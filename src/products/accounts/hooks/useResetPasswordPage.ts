import type { FormEvent } from 'react';
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../../../api';

export function useResetPasswordPage() {
  const [params] = useSearchParams();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [message, setMessage] = useState('');
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (password !== confirm) return setMessage('Passwords do not match.');
    setBusy(true);
    setMessage('');
    try {
      await api('/auth/reset-password', { token: params.get('token'), password });
      setDone(true);
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return { done, submit, password, setPassword, confirm, setConfirm, message, busy, params };
}
