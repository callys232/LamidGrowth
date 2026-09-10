import { ArrowLeft, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { Button } from '../../../shared/ui/Button';
import { Field } from '../../../shared/ui/Field';
import type { useAuthPage } from '../hooks/useAuthPage';
export function AccountCredentialsForm({
  submit,
  login,
  visible,
  setVisible,
  error,
  busy,
  setStep,
}: Pick<
  ReturnType<typeof useAuthPage>,
  'submit' | 'login' | 'visible' | 'setVisible' | 'error' | 'busy' | 'setStep'
>) {
  return (
    <>
      <form onSubmit={submit}>
        {!login && (
          <Field label="Your name">
            <input
              name="name"
              autoComplete="name"
              required
              maxLength={100}
              placeholder="How should we call you?"
            />
          </Field>
        )}
        <Field label="Email address">
          <input
            name="email"
            type="email"
            autoComplete="email"
            required
            maxLength={254}
            placeholder="you@example.com"
          />
        </Field>
        <Field label="Password" hint={login ? undefined : 'Use at least 12 characters.'}>
          <div className="password-field">
            <input
              name="password"
              type={visible ? 'text' : 'password'}
              autoComplete={login ? 'current-password' : 'new-password'}
              minLength={login ? 1 : 12}
              maxLength={128}
              required
              placeholder={login ? 'Your password' : 'Create a strong password'}
            />
            <button
              type="button"
              onClick={() => setVisible(!visible)}
              aria-label={visible ? 'Hide password' : 'Show password'}
            >
              {visible ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </Field>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <Button type="submit" className="full-width" disabled={busy}>
          {busy ? 'One moment…' : login ? 'Sign in' : 'Create your workspace'}
          <ArrowRight size={16} />
        </Button>
        {!login && (
          <button type="button" className="text-button change-context" onClick={() => setStep(0)}>
            <ArrowLeft size={14} /> Change starting context
          </button>
        )}
        <p className="auth-footnote">
          Local development edition. Account data is saved on this computer.
        </p>
      </form>
    </>
  );
}
