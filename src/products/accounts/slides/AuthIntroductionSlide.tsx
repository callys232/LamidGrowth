import { Eyebrow } from '../../../shared/ui/Eyebrow';
import { OrbitVisual } from '../../../shared/visuals/Orbit';

export function AuthIntroductionSlide() {
  return (
    <>
      <aside className="auth-aside">
        <Eyebrow>PROGRESS, WITH INTENTION.</Eyebrow>
        <OrbitVisual small />
        <blockquote>
          “A clearer view.
          <br />A stronger next step.
          <br />
          <em>A continuous journey.</em>”
        </blockquote>
        <div className="auth-aside-bottom">
          <span className="live-dot" /> HUMAN JUDGMENT AT THE CENTER
        </div>
      </aside>
    </>
  );
}
