import type { FormEvent } from 'react';
import { useState } from 'react';
import { api } from '../../../api';

export function usePasswordRecoveryPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [token, setToken] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    try {
      const result = await api<{ recoveryToken?: string }>('/auth/request-recovery', { email });
      setToken(result.recoveryToken || '');
      setMessage('If an account matches, recovery instructions are ready.');
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return { submit, email, setEmail, message, token, busy };
}
