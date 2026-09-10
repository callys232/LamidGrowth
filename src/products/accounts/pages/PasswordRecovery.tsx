import { usePasswordRecoveryPage } from '../hooks/usePasswordRecoveryPage';
import { PasswordRecoveryFormSlide } from '../slides/PasswordRecoveryFormSlide';
import { AccountVisualSlide } from '../slides/AccountVisualSlide';

/** Compose the page in reading order. Edit each section in ../slides. */
export function PasswordRecovery() {
  const page = usePasswordRecoveryPage();
  return (
    <div className="auth-page">
      <PasswordRecoveryFormSlide
        submit={page.submit}
        email={page.email}
        setEmail={page.setEmail}
        message={page.message}
        token={page.token}
        busy={page.busy}
      />
      <AccountVisualSlide />
    </div>
  );
}
