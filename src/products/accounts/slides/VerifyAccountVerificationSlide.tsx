import { Link } from 'react-router-dom';
import { Brand } from '../../../shared/ui/Brand';
import { Button } from '../../../shared/ui/Button';
import { Field } from '../../../shared/ui/Field';
import type { useVerifyAccountPage } from '../hooks/useVerifyAccountPage';

export function VerifyAccountVerificationSlide(page: ReturnType<typeof useVerifyAccountPage>) {
  return (
    <div className="auth-main">
      <Brand />
      <Link to="/login" className="back-link">
        Back to sign in
      </Link>
      <div className="auth-content">
        <h2>Verify your account.</h2>
        {page.message && <p role="status">{page.message}</p>}
        {page.done ? (
          <Link className="button button-primary full-width" to="/os">
            Continue to workspace
          </Link>
        ) : (
          <>
            <p>
              Enter the six-digit code from your email. It expires in 10 minutes. Eligible
              first-time accounts receive 100 welcome points after verification.
            </p>
            {page.params.get('token') ? (
              <Button disabled={page.busy} onClick={() => void page.verify()}>
                Verify account
              </Button>
            ) : (
              <>
                {page.challenge && (
                  <form
                    onSubmit={(event) => {
                      event.preventDefault();
                      void page.verify();
                    }}
                  >
                    <Field label="Verification code">
                      <input
                        name="code"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        pattern="[0-9]{6}"
                        minLength={6}
                        maxLength={6}
                        required
                        value={page.code}
                        onChange={(event) => page.setCode(event.target.value.replace(/\D/g, ''))}
                      />
                    </Field>
                    <Button type="submit" disabled={page.busy || page.code.length !== 6}>
                      {page.busy ? 'Checking…' : 'Verify account'}
                    </Button>
                  </form>
                )}
                {page.developmentCode && (
                  <p className="auth-footnote">
                    Local development code:{' '}
                    <strong data-testid="development-otp">{page.developmentCode}</strong>
                  </p>
                )}
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    void page.resend();
                  }}
                >
                  <Field label="Account email">
                    <input
                      type="email"
                      autoComplete="email"
                      required
                      value={page.email}
                      onChange={(event) => page.setEmail(event.target.value)}
                    />
                  </Field>
                  <Button type="submit" variant="secondary" disabled={page.busy}>
                    Send a new verification code
                  </Button>
                </form>
              </>
            )}
            <p>
              <Link to="/os">Continue with goal drafting while you verify</Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
