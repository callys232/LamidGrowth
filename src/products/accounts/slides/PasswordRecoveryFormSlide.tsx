import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Brand } from '../../../shared/ui/Brand';
import { Button } from '../../../shared/ui/Button';
import { Eyebrow } from '../../../shared/ui/Eyebrow';
import { Field } from '../../../shared/ui/Field';
import type { usePasswordRecoveryPage } from '../hooks/usePasswordRecoveryPage';

export function PasswordRecoveryFormSlide({
  submit,
  email,
  setEmail,
  message,
  token,
  busy,
}: Pick<
  ReturnType<typeof usePasswordRecoveryPage>,
  'submit' | 'email' | 'setEmail' | 'message' | 'token' | 'busy'
>) {
  return (
    <>
      <div className="auth-main">
        <Brand />
        <Link to="/login" className="back-link">
          <ArrowLeft size={14} /> Back to sign in
        </Link>
        <div className="auth-content">
          <Eyebrow>ACCOUNT RECOVERY</Eyebrow>
          <h2>
            Recover <em>access.</em>
          </h2>
          <p>
            Enter the email associated with your account. We will not reveal whether an account
            exists.
          </p>
          <form onSubmit={submit}>
            <Field label="Email address">
              <input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                type="email"
                required
                autoComplete="email"
              />
            </Field>
            {message && (
              <p className="form-error" role="status">
                {message}
              </p>
            )}
            {token && (
              <Link
                className="button button-secondary full-width"
                to={`/reset-password?token=${token}`}
              >
                Continue to password reset <ArrowRight size={16} />
              </Link>
            )}
            {!token && (
              <Button type="submit" className="full-width" disabled={busy}>
                {busy ? 'Checking…' : 'Send recovery instructions'} <ArrowRight size={16} />
              </Button>
            )}
          </form>
        </div>
      </div>
    </>
  );
}
