import { Empty } from '../../../shared/ui/Empty';
import { ActionRow } from '../../consistency/components/ActionRow';
import type { useGovernancePage } from '../hooks/useGovernancePage';

export function GovernanceReviewsSlide({
  pending,
}: Pick<ReturnType<typeof useGovernancePage>, 'pending'>) {
  return (
    <>
      <section className="dashboard-section" id="pending-approvals">
        <div className="panel-heading">
          <div>
            <h2>Ready for your judgment</h2>
            <span>{pending.length} actions waiting for review</span>
          </div>
        </div>
        <div className="panel">
          {pending.length ? (
            pending.map((a) => <ActionRow key={a.id} action={a} />)
          ) : (
            <Empty title="Nothing waiting on you">
              When an action is submitted for review, it will appear here.
            </Empty>
          )}
        </div>
      </section>
    </>
  );
}
