import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Brand } from '../../../shared/ui/Brand';
import { Button } from '../../../shared/ui/Button';
import { Eyebrow } from '../../../shared/ui/Eyebrow';
import { AccountContextChoices } from '../components/AccountContextChoices';
import { AccountCredentialsForm } from '../components/AccountCredentialsForm';
import { ArrowUpRightText } from '../components/ArrowUpRightText';
import type { useAuthPage } from '../hooks/useAuthPage';

export function AuthMainSlide({
  login,
  step,
  context,
  setContext,
  setStep,
  busy,
  demo,
  submit,
  visible,
  setVisible,
  error,
}: Pick<
  ReturnType<typeof useAuthPage>,
  | 'login'
  | 'step'
  | 'context'
  | 'setContext'
  | 'setStep'
  | 'busy'
  | 'demo'
  | 'submit'
  | 'visible'
  | 'setVisible'
  | 'error'
>) {
  return (
    <>
      <div className="auth-main">
        <Brand />
        <Link to="/" className="back-link">
          <ArrowLeft size={14} /> Back to LAMID ONE
        </Link>
        <div className="auth-content">
          <Eyebrow>
            {login ? 'YOUR CONTEXT IS WAITING' : `YOUR FIRST STEP · ${step + 1} OF 2`}
          </Eyebrow>
          <h2>
            {login ? (
              <>
                Welcome
                <br />
                <em>back.</em>
              </>
            ) : step === 0 ? (
              <>
                Start with
                <br />
                <em>your context.</em>
              </>
            ) : (
              <>
                A space to
                <br />
                <em>make progress.</em>
              </>
            )}
          </h2>
          <p>
            {login
              ? 'Pick up where you left off.'
              : step === 0
                ? 'Where are you starting? Choose what fits your work today.'
                : `Create your account to begin in a ${context.toLowerCase()} context.`}
          </p>
          {!login && step === 0 ? (
            <>
              <AccountContextChoices context={context} setContext={setContext} />
              <Button className="full-width" onClick={() => setStep(1)}>
                Continue <ArrowRight size={16} />
              </Button>
              <p className="auth-footnote">Your context can change as your work grows.</p>
              <div className="auth-divider">
                <span>or take a look first</span>
              </div>
              <Button variant="secondary" className="full-width" disabled={busy} onClick={demo}>
                {busy ? 'Opening…' : 'Explore a sample workspace'}
                <ArrowRight size={16} />
              </Button>
            </>
          ) : (
            <AccountCredentialsForm
              submit={submit}
              login={login}
              visible={visible}
              setVisible={setVisible}
              error={error}
              busy={busy}
              setStep={setStep}
            />
          )}
          {error && step === 0 && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <p className="auth-switch">
            {login ? 'Starting a new chapter?' : 'Already have a workspace?'}{' '}
            <Link to={login ? '/start' : '/login'}>
              {login ? 'Get started' : 'Sign in'} <ArrowUpRightText />
            </Link>
          </p>
        </div>
        <span className="auth-copyright">© {new Date().getFullYear()} LAMID ONE</span>
      </div>
    </>
  );
}
