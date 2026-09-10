import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../../../api';
import { Brand } from '../../../shared/ui/Brand';
import { Button } from '../../../shared/ui/Button';
import { Eyebrow } from '../../../shared/ui/Eyebrow';
import { Field } from '../../../shared/ui/Field';
import type { useVerifyAccountPage } from '../hooks/useVerifyAccountPage';

export function VerifyAccountVerificationSlide({
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
}: Pick<
  ReturnType<typeof useVerifyAccountPage>,
  | 'done'
  | 'message'
  | 'busy'
  | 'params'
  | 'verify'
  | 'setBusy'
  | 'setMessage'
  | 'setContinuation'
  | 'email'
  | 'setEmail'
  | 'continuation'
>) {
  return (
    <>
      <div className="auth-main">
        <Brand />
        <Link to="/login" className="back-link">
          <ArrowLeft size={14} /> Back to sign in
        </Link>
        <div className="auth-content">
          <Eyebrow>ACCOUNT VERIFICATION</Eyebrow>
          <h2>
            Confirm <em>your account.</em>
          </h2>
          {done ? (
            <>
              <p>Your account is verified. You can continue into your workspace.</p>
              <Link className="button button-primary full-width" to="/login">
                Continue to sign in <ArrowRight size={16} />
              </Link>
            </>
          ) : (
            <>
              <p>
                Use the verification link from your account email. Links expire and can only be used
                once.
              </p>
              {message && (
                <p className="form-error" role="alert">
                  {message}
                </p>
              )}
              <Button
                className="full-width"
                disabled={busy || !params.get('token')}
                onClick={() => void verify()}
              >
                {busy ? 'Checking…' : 'Verify account'} <Check size={16} />
              </Button>
              {!params.get('token') && (
                <form
                  onSubmit={async (event) => {
                    event.preventDefault();
                    setBusy(true);
                    setMessage('');
                    try {
                      const result = await api<{ verificationToken?: string }>(
                        '/auth/resend-verification',
                        { email },
                      );
                      setContinuation(result.verificationToken || '');
                      setMessage(
                        'If the account needs verification, a continuation has been requested.',
                      );
                    } catch (error) {
                      setMessage((error as Error).message);
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  <Field label="Account email">
                    <input
                      type="email"
                      value={email}
                      required
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </Field>
                  <Button type="submit" disabled={busy}>
                    Request verification link
                  </Button>
                  {continuation && (
                    <Link to={`/verify?token=${continuation}`}>
                      Continue local account verification
                    </Link>
                  )}
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
