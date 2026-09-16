import { useVerifyAccountPage } from '../hooks/useVerifyAccountPage';
import { VerifyAccountVerificationSlide } from '../slides/VerifyAccountVerificationSlide';
import { AccountVisualSlide } from '../slides/AccountVisualSlide';

/** Compose the page in reading order. Edit each section in ../slides. */
export function VerifyAccount() {
  const page = useVerifyAccountPage();
  return (
    <div className="auth-page">
      <VerifyAccountVerificationSlide {...page} />
      <AccountVisualSlide />
    </div>
  );
}
