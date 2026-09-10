import { useAuthPage } from '../hooks/useAuthPage';
import { AuthIntroductionSlide } from '../slides/AuthIntroductionSlide';
import { AuthMainSlide } from '../slides/AuthMainSlide';

/** Compose the page in reading order. Edit each section in ../slides. */
export function AuthPage(props: { login?: boolean }) {
  const page = useAuthPage(props);
  return (
    <div className="auth-page">
      <AuthMainSlide
        login={page.login}
        step={page.step}
        context={page.context}
        setContext={page.setContext}
        setStep={page.setStep}
        busy={page.busy}
        demo={page.demo}
        submit={page.submit}
        visible={page.visible}
        setVisible={page.setVisible}
        error={page.error}
      />
      <AuthIntroductionSlide />
    </div>
  );
}
