import { useState, type FormEvent } from 'react';
import { Button } from '../../../shared/ui/Button';
import { Field } from '../../../shared/ui/Field';
import { downloadJson } from '../../accounts/pages/AccountServicesPage';
import type { DemoWorkspace } from './scenarios';
export function DemoAccountServices({
  kind,
  state,
  change,
}: {
  kind: 'Profile' | 'Privacy & Security' | 'Payout Accounts' | 'Disputes';
  state: DemoWorkspace;
  change: (update: (sample: DemoWorkspace) => DemoWorkspace, message: string) => void;
}) {
  const [role, setRole] = useState<'client' | 'freelancer'>('client');
  const data = state.accountServices || {};
  function update(values: Partial<NonNullable<DemoWorkspace['accountServices']>>, message: string) {
    change((s) => ({ ...s, accountServices: { ...s.accountServices, ...values } }), message);
  }
  function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget));
    change(
      (sample) => ({
        ...sample,
        user: { ...sample.user, name: String(values.name) },
        accountServices: {
          ...sample.accountServices,
          profile: {
            name: String(values.name),
            role: String(values.role),
            bio: String(values.bio),
          },
        },
      }),
      'Sample profile updated.',
    );
  }
  const dispute = data.dispute;
  return (
    <section className="panel account-service">
      <h2>{kind}</h2>
      <p>Marketing demo. Changes stay in this sample account.</p>
      {kind === 'Profile' && (
        <form className="form-grid" onSubmit={saveProfile}>
          <Field label="Name">
            <input
              name="name"
              required
              maxLength={100}
              defaultValue={data.profile?.name || state.user.name}
            />
          </Field>
          <Field label="Professional role">
            <input
              name="role"
              maxLength={160}
              defaultValue={data.profile?.role || state.workspace.context}
            />
          </Field>
          <Field label="About you">
            <textarea
              name="bio"
              maxLength={2000}
              defaultValue={
                data.profile?.bio ||
                'Building measurable progress through focused goals and delivery.'
              }
            />
          </Field>
          <Button type="submit">Save sample profile</Button>
        </form>
      )}
      {kind === 'Payout Accounts' && (
        <section className="settings-card">
          <h3>Sample bank account</h3>
          <p>{state.user.name} · Paystack · ending 0042</p>
          <p>
            {data.payoutReady ? 'Ready for sample payouts' : 'No sample payout account registered'}
          </p>
          <Button
            disabled={data.payoutReady}
            onClick={() => update({ payoutReady: true }, 'Sample payout account registered.')}
          >
            {data.payoutReady ? 'Registered' : 'Register sample payout account'}
          </Button>
          <p>
            This simulation collects no bank details and sends no money. Live bank payouts require a
            configured provider. USDT on TRON (TRC-20) is awaiting payment-provider setup.
          </p>
        </section>
      )}
      {kind === 'Privacy & Security' && (
        <div className="account-service-grid">
          <section className="settings-card">
            <h3>Download sample data</h3>
            <p>Includes the selected profile’s fictional goals, actions, projects, and reviews.</p>
            <Button onClick={() => downloadJson(state, 'lamid-demo-workspace.json')}>
              Download sample data
            </Button>
          </section>
          <section className="settings-card">
            <h3>Deletion request</h3>
            <p>Live requests require password confirmation and administrator review.</p>
            <Button
              disabled={data.deletionStatus === 'pending'}
              onClick={() =>
                update({ deletionStatus: 'pending' }, 'Sample deletion request submitted.')
              }
            >
              {data.deletionStatus ? 'Sample request pending' : 'Simulate deletion request'}
            </Button>
          </section>
          <section className="settings-card">
            <h3>Two-factor authentication</h3>
            <p>
              Live accounts can set up an authenticator and save recovery codes. Authentication is
              not changed in the marketing demo.
            </p>
          </section>
        </div>
      )}
      {kind === 'Disputes' && (
        <section className="settings-card">
          <h3>{state.projects[0]?.title || 'Sample delivery'} · Milestone review</h3>
          <p>Sample issue: the delivery needs clearer supporting evidence.</p>
          <Field label="Act as">
            <select value={role} onChange={(e) => setRole(e.target.value as typeof role)}>
              <option value="client">Client</option>
              <option value="freelancer">Freelancer</option>
            </select>
          </Field>
          {dispute && (
            <>
              <p>
                Outcome: {dispute.outcome} · {dispute.status}
              </p>
              <p>{dispute.note}</p>
            </>
          )}
          {dispute?.status === 'proposed' && dispute.proposedBy !== role ? (
            <div className="account-service-actions">
              <Button
                onClick={() =>
                  update(
                    { dispute: { ...dispute, status: 'accepted' } },
                    'Sample resolution accepted. No payment moved.',
                  )
                }
              >
                Accept sample proposal
              </Button>
              <Button
                variant="secondary"
                onClick={() =>
                  update(
                    { dispute: { ...dispute, status: 'rejected' } },
                    'Sample resolution rejected.',
                  )
                }
              >
                Reject sample proposal
              </Button>
            </div>
          ) : (
            dispute?.status !== 'accepted' && (
              <form
                className="form-grid"
                onSubmit={(e) => {
                  e.preventDefault();
                  const values = Object.fromEntries(new FormData(e.currentTarget));
                  update(
                    {
                      dispute: {
                        outcome: String(values.outcome),
                        note: String(values.note),
                        proposedBy: role,
                        status: 'proposed',
                      },
                    },
                    'Sample resolution proposed.',
                  );
                }}
              >
                <Field label="Resolution">
                  <select name="outcome">
                    <option value="revision">Request revised work</option>
                    <option value="refund">Agree to a refund</option>
                    <option value="release">Accept work for payment</option>
                  </select>
                </Field>
                <Field label="Terms of your proposal">
                  <textarea name="note" required maxLength={4000} />
                </Field>
                <Button type="submit">Propose sample resolution</Button>
              </form>
            )
          )}
          <p>
            The other party must accept the proposal. Live payment actions remain in the project.
          </p>
        </section>
      )}
    </section>
  );
}
