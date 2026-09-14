import { useMembersPage } from '../hooks/useMembersPage';
import { MembersHeadingSlide } from '../slides/MembersHeadingSlide';
import { MembersMembershipManagementSlide } from '../slides/MembersMembershipManagementSlide';

/** Compose the page in reading order. Edit each section in ../slides. */
export function Members() {
  const page = useMembersPage();
  return (
    <>
      <MembersHeadingSlide />
      <MembersMembershipManagementSlide
        canManage={page.canManage}
        error={page.error}
        members={page.members}
        state={page.state}
        busy={page.busy}
        change={page.change}
        add={page.add}
        isEcosystemAdmin={page.isEcosystemAdmin}
        conciergeApplications={page.conciergeApplications}
        decideConciergeApplication={page.decideConciergeApplication}
        escrowOverview={page.escrowOverview}
      />
    </>
  );
}
