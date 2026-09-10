import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Brand } from '../../../shared/ui/Brand';
import { Button } from '../../../shared/ui/Button';
import { Eyebrow } from '../../../shared/ui/Eyebrow';
import { Field } from '../../../shared/ui/Field';
import type { useResetPasswordPage } from '../hooks/useResetPasswordPage';

export function ResetPasswordFormSlide({
  done,
  submit,
  password,
  setPassword,
  confirm,
  setConfirm,
  message,
  busy,
  params,
}: Pick<
  ReturnType<typeof useResetPasswordPage>,
  | 'done'
  | 'submit'
  | 'password'
  | 'setPassword'
  | 'confirm'
  | 'setConfirm'
  | 'message'
  | 'busy'
  | 'params'
>) {
  return (
    <>
      <div className="auth-main">
        <Brand />
        <Link to="/login" className="back-link">
          <ArrowLeft size={14} /> Back to sign in
        </Link>
        <div className="auth-content">
          <Eyebrow>RESET SECURITY</Eyebrow>
          <h2>
            Create a <em>new password.</em>
          </h2>
          {done ? (
            <>
              <p>Your password was changed and existing sessions were signed out.</p>
              <Link className="button button-primary full-width" to="/login">
                Return to sign in <ArrowRight size={16} />
              </Link>
            </>
          ) : (
            <form onSubmit={submit}>
              <Field label="New password">
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  minLength={12}
                  maxLength={128}
                  required
                  autoComplete="new-password"
                />
              </Field>
              <Field label="Confirm password">
                <input
                  type="password"
                  value={confirm}
                  onChange={(event) => setConfirm(event.target.value)}
                  minLength={12}
                  maxLength={128}
                  required
                  autoComplete="new-password"
                />
              </Field>
              {message && (
                <p className="form-error" role="alert">
                  {message}
                </p>
              )}
              <Button type="submit" className="full-width" disabled={busy || !params.get('token')}>
                {busy ? 'Saving…' : 'Save new password'} <ArrowRight size={16} />
              </Button>
            </form>
          )}
        </div>
      </div>
    </>
  );
}
