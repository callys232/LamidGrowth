import { Link } from 'react-router-dom';
import { PageHeading } from '../../../shared/workspace/PageHeading';

export function CompanionHeadingSlide() {
  return (
    <>
      <PageHeading
        eyebrow="COMPANION · SPACE TO THINK"
        title="What are you working through?"
        description="Turn a question into a clearer objective and a deliberate next step."
      />
      <p>
        <Link to="/os/insights">Review an existing objective with AI</Link>, or use guided planning
        below.
      </p>
    </>
  );
}
