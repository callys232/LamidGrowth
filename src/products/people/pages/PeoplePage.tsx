import { Empty } from '../../../shared/ui/Empty';
import { SkeletonList } from '../../../shared/ui/Skeleton';
import { StatusPill } from '../../../shared/workspace/StatusPill';
import { usePeoplePage } from '../hooks/usePeoplePage';

function dateLabel(value: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString();
}

/** /os/people — real capability data: workspace roster, each member's talent profile (where one
 * exists), real assessment scores and credentials, expert teams assigned to this workspace's
 * projects, and recent Capability Mapper AI reviews. No quantified "capability gap score" — this
 * app doesn't persist structured gap data anywhere, so this page doesn't fabricate one; AI
 * commentary is shown as AI commentary, labeled as such. */
export function PeoplePage() {
  const page = usePeoplePage();

  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <h2>People &amp; Capability</h2>
          <span>
            Your workspace roster, real capability data, and expert teams on your projects.
          </span>
        </div>
      </div>

      {page.error && (
        <p className="form-error" role="alert">
          {page.error}
        </p>
      )}

      {!page.data ? (
        <SkeletonList rows={6} />
      ) : (
        <>
          <section className="panel settings-card">
            <h3>Roster</h3>
            <ol className="activity-feed-list">
              {page.data.roster.map((member) => (
                <li
                  key={member.userId}
                  className="activity-feed-row"
                  style={{ alignItems: 'flex-start' }}
                >
                  <span className="activity-feed-title">
                    <strong>{member.name}</strong>
                    <br />
                    <small>{member.email}</small>
                    {member.talent && (
                      <>
                        <br />
                        <small>
                          {member.talent.headline || 'No headline set'}
                          {member.talent.experienceYears != null && (
                            <> · {member.talent.experienceYears} yrs experience</>
                          )}
                        </small>
                        {member.talent.skills.length > 0 && (
                          <div style={{ marginTop: 4 }}>
                            <small>Skills: {member.talent.skills.join(', ')}</small>
                          </div>
                        )}
                        {member.talent.assessments.length > 0 && (
                          <div style={{ marginTop: 4 }}>
                            <small>
                              Assessments:{' '}
                              {member.talent.assessments
                                .map((a) => `${a.skill} (${a.score})`)
                                .join(', ')}
                            </small>
                          </div>
                        )}
                        {member.talent.credentials.length > 0 && (
                          <div style={{ marginTop: 4 }}>
                            <small>
                              Credentials:{' '}
                              {member.talent.credentials
                                .map((c) => `${c.title} — ${c.verificationStatus}`)
                                .join(', ')}
                            </small>
                          </div>
                        )}
                      </>
                    )}
                  </span>
                  <StatusPill status={member.role} />
                  {member.talent && <StatusPill status={member.talent.vettingStatus} />}
                </li>
              ))}
            </ol>
          </section>

          <section className="panel settings-card">
            <h3>Expert teams on your projects</h3>
            {page.data.teams.length === 0 ? (
              <Empty title="No expert teams assigned yet">
                Teams assigned to a project (via Commercial) will appear here.
              </Empty>
            ) : (
              <ol className="activity-feed-list">
                {page.data.teams.map((team) => (
                  <li
                    key={team.id}
                    className="activity-feed-row"
                    style={{ alignItems: 'flex-start' }}
                  >
                    <span className="activity-feed-title">
                      <strong>{team.name}</strong>
                      <br />
                      <small>
                        Led by {team.leadName}
                        {team.description && <> · {team.description}</>}
                      </small>
                      {team.members.length > 0 && (
                        <div style={{ marginTop: 4 }}>
                          <small>
                            Members:{' '}
                            {team.members
                              .map((m) => `${m.name} (${m.role || 'member'})`)
                              .join(', ')}
                          </small>
                        </div>
                      )}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </section>

          <section className="panel settings-card">
            <h3>Recent Capability Mapper reviews</h3>
            <p>AI-generated commentary on capability gaps — not a quantified score.</p>
            {page.data.recentCapabilityReviews.length === 0 ? (
              <Empty title="No Capability Mapper reviews yet">
                Ask the Companion about capability or skill gaps to see reviews here.
              </Empty>
            ) : (
              <ol className="activity-feed-list">
                {page.data.recentCapabilityReviews.map((review) => (
                  <li
                    key={review.id}
                    className="activity-feed-row"
                    style={{ alignItems: 'flex-start' }}
                  >
                    <span className="activity-feed-title">
                      <strong>{review.question || 'Capability review'}</strong>
                      <br />
                      <small>{review.response}</small>
                      <div>
                        <small>{dateLabel(review.createdAt)}</small>
                      </div>
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </>
      )}
    </section>
  );
}
