import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../../../api';

export function useVerifyAccountPage() {
  const [params] = useSearchParams();
  const [message, setMessage] = useState('');
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState(params.get('email') || '');
  const [challenge, setChallenge] = useState(params.get('challenge') || '');
  const [code, setCode] = useState('');
  const [developmentCode, setDevelopmentCode] = useState(() => sessionStorage.getItem('lamid-development-otp') || '');
  const [retryAt, setRetryAt] = useState(0);
  async function verify() {
    setBusy(true); setMessage('');
    try {
      const result = await api<{ welcomeReward: { status: string; points: number } }>('/auth/verify', params.get('token') ? { token: params.get('token') } : { challengeId: challenge, code });
      setDone(true);
      sessionStorage.removeItem('lamid-development-otp');
      setMessage(result.welcomeReward.points === 100 ? 'Your 100 welcome points have been added.' : result.welcomeReward.status === 'review' ? 'Your account is verified. Your welcome reward is awaiting review.' : 'Your account is verified. No additional welcome reward was issued.');
    } catch (error) { setMessage((error as Error).message); }
    finally { setBusy(false); }
  }
  async function resend() {
    if (Date.now() < retryAt) { setMessage('Please wait one minute before requesting another code.'); return; }
    setBusy(true); setMessage('');
    try {
      const result = await api<{ challengeId: string; developmentCode?: string }>('/auth/resend-verification', { email });
      setChallenge(result.challengeId); setCode(''); setDevelopmentCode(result.developmentCode || '');
      setRetryAt(Date.now() + 60000);
      setMessage('If this account needs verification, a new code has been queued for delivery. Check your inbox and spam folder.');
    } catch (error) { setMessage((error as Error).message); }
    finally { setBusy(false); }
  }
  return { params, message, done, busy, email, setEmail, challenge, code, setCode, developmentCode, verify, resend };
}
