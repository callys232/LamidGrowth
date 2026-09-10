import { useResetPasswordPage } from '../hooks/useResetPasswordPage';
import { ResetPasswordFormSlide } from '../slides/ResetPasswordFormSlide';
import { AccountVisualSlide } from '../slides/AccountVisualSlide';

/** Compose the page in reading order. Edit each section in ../slides. */
export function ResetPassword() {
  const page = useResetPasswordPage();
  return (
    <div className="auth-page">
      <ResetPasswordFormSlide
        done={page.done}
        submit={page.submit}
        password={page.password}
        setPassword={page.setPassword}
        confirm={page.confirm}
        setConfirm={page.setConfirm}
        message={page.message}
        busy={page.busy}
        params={page.params}
      />
      <AccountVisualSlide />
    </div>
  );
}
