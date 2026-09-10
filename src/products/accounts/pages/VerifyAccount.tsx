import { useVerifyAccountPage } from '../hooks/useVerifyAccountPage';
import { VerifyAccountVerificationSlide } from '../slides/VerifyAccountVerificationSlide';
import { AccountVisualSlide } from '../slides/AccountVisualSlide';

/** Compose the page in reading order. Edit each section in ../slides. */
export function VerifyAccount() {
  const page = useVerifyAccountPage();
  return (
    <div className="auth-page">
      <VerifyAccountVerificationSlide
        done={page.done}
        message={page.message}
        busy={page.busy}
        params={page.params}
        verify={page.verify}
        setBusy={page.setBusy}
        setMessage={page.setMessage}
        setContinuation={page.setContinuation}
        email={page.email}
        setEmail={page.setEmail}
        continuation={page.continuation}
      />
      <AccountVisualSlide />
    </div>
  );
}
