import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../../../api';

export function useVerifyAccountPage() {
  const [params] = useSearchParams();
  const [message, setMessage] = useState('');
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState('');
  const [continuation, setContinuation] = useState('');
  async function verify() {
    setBusy(true);
    setMessage('');
    try {
      await api('/auth/verify', { token: params.get('token') });
      setDone(true);
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return {
    done,
    message,
    busy,
    params,
    verify,
    setBusy,
    setMessage,
    setContinuation,
    email,
    setEmail,
    continuation,
  };
}
