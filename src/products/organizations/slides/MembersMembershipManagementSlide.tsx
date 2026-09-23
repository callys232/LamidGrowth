import { Button } from '../../../shared/ui/Button';
import { Empty } from '../../../shared/ui/Empty';
import { Field } from '../../../shared/ui/Field';
import type { useMembersPage } from '../hooks/useMembersPage';

export function MembersMembershipManagementSlide({
  canManage,
  error,
  members,
  state,
  busy,
  change,
  add,
  isEcosystemAdmin,
  conciergeApplications,
  decideConciergeApplication,
  escrowOverview,
}: Pick<
  ReturnType<typeof useMembersPage>,
  | 'canManage'
  | 'error'
  | 'members'
  | 'state'
  | 'busy'
  | 'change'
  | 'add'
  | 'isEcosystemAdmin'
  | 'conciergeApplications'
  | 'decideConciergeApplication'
  | 'escrowOverview'
>) {
  return (
    <>
      {!canManage ? (
        <Empty title="Managed by your workspace owner">
          Ask your workspace owner to manage membership.
        </Empty>
      ) : (
        <>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <section className="panel settings-card">
            <h2>
              Members · {members.filter((m) => m.status === 'active').length} /{' '}
              {state.workspace.member_limit}
            </h2>
            <p>
              Owners manage settings, exports, and review decisions. Members can create and update
              work. Disabling membership removes access to this workspace only.
            </p>
            {members.map((member) => (
              <div className="audit-event" key={member.userId}>
                <div>
                  <strong>{member.name}</strong>
                  <p>
                    {member.email} · {member.role} · {member.status}
                  </p>
                </div>
                {member.role !== 'owner' && state.workspace.tier === 'enterprise' && (
                  <Button variant="secondary" disabled={busy} onClick={() => void change(member)}>
                    {member.status === 'active' ? 'Disable access' : 'Restore access'}
                  </Button>
                )}
              </div>
            ))}
          </section>
          {state.workspace.tier === 'enterprise' ? (
            <section className="panel settings-card">
              <h2>Add an existing account</h2>
              <p>
                The person must already have a LAMID ONE account. They can select this workspace
                after being added.
              </p>
              <form onSubmit={add}>
                <Field label="Account email">
                  <input name="email" type="email" required maxLength={254} />
                </Field>
                <Button type="submit" disabled={busy}>
                  Add member
                </Button>
              </form>
            </section>
          ) : (
            <p>Shared membership is available in enterprise workspaces.</p>
          )}
        </>
      )}
      {isEcosystemAdmin && escrowOverview && (
        <section className="panel settings-card">
          <h2>Escrow overview (platform-wide)</h2>
          <p>
            Held: ${(escrowOverview.totals.heldMinor / 100).toFixed(2)} · Released: $
            {(escrowOverview.totals.releasedMinor / 100).toFixed(2)} · Refunded: $
            {(escrowOverview.totals.refundedMinor / 100).toFixed(2)} · Pending: $
            {(escrowOverview.totals.pendingMinor / 100).toFixed(2)}
          </p>
          {escrowOverview.currentlyHeld.length === 0 ? (
            <Empty title="Nothing currently held">
              No milestone has funds in escrow right now.
            </Empty>
          ) : (
            escrowOverview.currentlyHeld.map((item) => (
              <div className="audit-event" key={item.milestoneId}>
                <div>
                  <strong>
                    ${(item.amountMinor / 100).toFixed(2)} {item.currency}
                  </strong>
                  <p>Held since {new Date(item.heldAt).toLocaleString()}</p>
                </div>
              </div>
            ))
          )}
        </section>
      )}

      {isEcosystemAdmin && (
        <section className="panel settings-card">
          <h2>Concierge applications</h2>
          <p>
            Platform-wide review — approving a provider lets any workspace owner assign them as a
            concierge.
          </p>
          {conciergeApplications.length === 0 && (
            <Empty title="No applications yet">Nothing to review.</Empty>
          )}
          {conciergeApplications.map((application) => (
            <div className="audit-event" key={application.id}>
              <div>
                <strong>{application.headline}</strong>
                <p>
                  {application.applicantName} · {application.applicantEmail} · {application.status}
                  {application.monthly_rate_minor > 0 &&
                    ` · $${(application.monthly_rate_minor / 100).toFixed(2)}/mo`}
                </p>
                {application.experience && <p>{application.experience}</p>}
              </div>
              {application.status === 'pending' && (
                <div style={{ display: 'flex', gap: 8 }}>
                  <Button
                    disabled={busy}
                    onClick={() => void decideConciergeApplication(application.id, 'approve')}
                  >
                    Approve
                  </Button>
                  <Button
                    variant="ghost"
                    disabled={busy}
                    onClick={() => void decideConciergeApplication(application.id, 'reject')}
                  >
                    Reject
                  </Button>
                </div>
              )}
            </div>
          ))}
        </section>
      )}
    </>
  );
}
