import { ShieldCheck } from 'lucide-react';
import type { useGovernancePage } from '../hooks/useGovernancePage';

export function GovernanceAuthoritySlide({
  state,
}: Pick<ReturnType<typeof useGovernancePage>, 'state'>) {
  return (
    <>
      <div className="governance-summary">
        <ShieldCheck size={28} strokeWidth={1.3} />
        <div>
          <h3>Your authority stays explicit.</h3>
          <p>
            You are a workspace {state.workspace.role}. Owners record review decisions; members
            prepare and submit work. Actions requiring approval must pass an explicit review.
          </p>
        </div>
        <span className="tag">OWNER CONTROLLED</span>
      </div>
    </>
  );
}
