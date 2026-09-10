import { useGovernancePage } from '../hooks/useGovernancePage';
import { GovernanceActivitySlide } from '../slides/GovernanceActivitySlide';
import { GovernanceAuthoritySlide } from '../slides/GovernanceAuthoritySlide';
import { GovernanceHeadingSlide } from '../slides/GovernanceHeadingSlide';
import { GovernanceReviewsSlide } from '../slides/GovernanceReviewsSlide';

/** Compose the page in reading order. Edit each section in ../slides. */
export function Governance() {
  const page = useGovernancePage();
  return (
    <>
      <GovernanceHeadingSlide />
      <GovernanceAuthoritySlide state={page.state} />
      <GovernanceReviewsSlide pending={page.pending} />
      <GovernanceActivitySlide filter={page.filter} setFilter={page.setFilter} state={page.state} />
    </>
  );
}
