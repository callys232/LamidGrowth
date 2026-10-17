import { useEffect, useState, type ReactNode, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { networkApi, setApiTransport, ApiError } from '../../../../api';
import {
  demoIdentity,
  demoRequest,
  forgetDemoAccess,
  rememberDemo,
  type DemoIdentity,
} from '../../../workspace/sandbox/demoAccess';
import './demo-access.css';

export function DemoAccessGate({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [action] = useState(() => {
    const params = new URLSearchParams(window.location.hash.slice(1));
    return {
      token: params.get('return') || params.get('unsubscribe'),
      unsubscribe: params.has('unsubscribe'),
      signup: params.get('next') === 'signup',
    };
  });
  const [ready, setReady] = useState(false);
  const [checking, setChecking] = useState(!action.token && Boolean(demoIdentity()));
  const [sent, setSent] = useState(false);
  const [unsubscribed, setUnsubscribed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [accessAttempt, setAccessAttempt] = useState(0);
  useEffect(() => {
    setApiTransport(null);
    if (action.token) {
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
      return;
    }
    if (!demoIdentity()) return;
    setChecking(true);
    let current = true;
    void demoRequest<Omit<DemoIdentity, 'token'>>('session')
      .then((value) => {
        if (!current) return;
        rememberDemo({ ...value, token: demoIdentity()!.token });
        setReady(true);
      })
      .catch((cause: Error) => {
        if (!current) return;
        if (cause instanceof ApiError && cause.status === 401) forgetDemoAccess();
        setError(cause.message);
      })
      .finally(() => {
        if (current) setChecking(false);
      });
    return () => {
      current = false;
    };
  }, [action.token, accessAttempt]);
  async function openLink() {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      if (action.unsubscribe) {
        await networkApi('/demo/unsubscribe', { token: action.token });
        setUnsubscribed(true);
      } else {
        const identity = await networkApi<DemoIdentity>('/demo/redeem', { token: action.token });
        rememberDemo(identity);
        navigate(
          action.signup
            ? '/signup'
            : `/demo/workspace?${new URLSearchParams({ profile: identity.profile, tier: identity.tier })}`,
          { replace: true },
        );
        setReady(true);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Please try again.');
    } finally {
      setBusy(false);
    }
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const data = new FormData(event.currentTarget);
    setBusy(true);
    setError('');
    try {
      await networkApi('/demo/register', {
        name: data.get('name'),
        email: data.get('email'),
        followup: data.get('followup') === 'on',
      });
      setSent(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Please try again.');
    } finally {
      setBusy(false);
    }
  }
  if (checking)
    return (
      <p className="demo-access" role="status">
        Checking your demo access…
      </p>
    );
  if (ready) return children;
  return (
    <section className="demo-access" aria-labelledby="demo-access-title">
      <span>EXPLORE LAMID ONE</span>
      <h1 id="demo-access-title">
        {unsubscribed
          ? 'Demo reminders stopped.'
          : sent
            ? 'Check your inbox.'
            : 'Your next chapter starts here.'}
      </h1>
      {error && <p role="alert">{error}</p>}
      {error && !action.token && demoIdentity() && (
        <button
          type="button"
          onClick={() => {
            setError('');
            setAccessAttempt(accessAttempt + 1);
          }}
        >
          Retry demo access
        </button>
      )}
      {unsubscribed ? (
        <p>You will receive no more demo reminders.</p>
      ) : sent ? (
        <>
          <p>
            Your welcome email is queued. Use its personal link to confirm your email and open your
            demo. Check spam if it hasn’t arrived.
          </p>
          <button type="button" onClick={() => setSent(false)}>
            Correct your details or request another email
          </button>
        </>
      ) : action.token && !error ? (
        <>
          <p>
            {action.unsubscribe
              ? 'Stop the optional demo reminder email.'
              : action.signup
                ? 'Confirm your email to use your demo details when creating an account.'
                : 'Confirm your email and continue your saved demo on this device. Keep this personal link private.'}
          </p>
          <button className="button button-primary" disabled={busy} onClick={() => void openLink()}>
            {busy
              ? 'Please wait…'
              : action.unsubscribe
                ? 'Stop demo reminders'
                : action.signup
                  ? 'Confirm email and create account'
                  : 'Confirm email and open demo'}
          </button>
        </>
      ) : (
        <>
          <p>
            Enter your name and email to try the demo. We’ll send your personal access link and use
            these details to prefill account creation when you’re ready.
          </p>
          <p>
            One demo registration per IP address, including shared office or school networks. Keep
            your personal email link to resume your existing demo.
          </p>
          <form onSubmit={submit}>
            <label>
              Your name
              <input name="name" autoComplete="name" required maxLength={100} />
            </label>
            <label>
              Email address
              <input name="email" type="email" autoComplete="email" required maxLength={254} />
            </label>
            <label className="demo-access-consent">
              <input type="checkbox" name="followup" />
              Email me one reminder in two days. I can unsubscribe at any time.
            </label>
            <p>
              Your registration, demo progress, and feature usage are saved to help you resume and
              help us improve the demo. Use sample information.{' '}
              <Link to="/legal/privacy">Privacy policy</Link>. No password or payment required.
            </p>
            <button className="button button-primary" disabled={busy} type="submit">
              {busy ? 'Preparing your email…' : 'Email my demo link'}
            </button>
          </form>
        </>
      )}
    </section>
  );
}
