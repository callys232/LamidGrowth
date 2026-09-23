import { useState } from 'react';
import { Button } from '../../../shared/ui/Button';
import { DatePicker } from '../../../shared/ui/DatePicker';
import { Empty } from '../../../shared/ui/Empty';
import { Field } from '../../../shared/ui/Field';
import { WeekCalendar } from '../../../shared/ui/WeekCalendar';
import { StatusPill } from '../../../shared/workspace/StatusPill';
import { useTalentPage } from '../hooks/useTalentPage';

/** /os/talent — expert profile, skills assessments, expert finder, and job matches. */
export function TalentDashboardPage() {
  const page = useTalentPage();
  const [skillQuery, setSkillQuery] = useState('');
  const [domainFilter, setDomainFilter] = useState('');
  const [functionFilter, setFunctionFilter] = useState('');
  const [industryFilter, setIndustryFilter] = useState('');
  const [inviteJobId, setInviteJobId] = useState('');
  const [quizAnswers, setQuizAnswers] = useState<number[]>([]);

  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <h2>Talent</h2>
          <span>Your expert profile, skills assessments, and matching across projects.</span>
        </div>
      </div>

      {page.error && (
        <p className="form-error" role="alert">
          {page.error}
        </p>
      )}

      <section className="panel settings-card">
        <h3>My profile {page.profile && <StatusPill status={page.profile.vetting_status} />}</h3>
        <form onSubmit={page.saveProfile}>
          <Field label="Headline">
            <input name="headline" defaultValue={page.profile?.headline} required maxLength={200} />
          </Field>
          <Field label="Skills" hint="Comma-separated, e.g. javascript, react, node">
            <input name="skills" defaultValue={page.profile?.skills.join(', ')} required />
          </Field>
          <Field label="Experience (years)">
            <input
              name="experienceYears"
              type="number"
              min={0}
              max={60}
              defaultValue={page.profile?.experience_years ?? undefined}
            />
          </Field>
          <Field label="Availability">
            <input name="availability" defaultValue={page.profile?.availability ?? undefined} />
          </Field>
          <Field label="Hourly rate (USD)">
            <input
              name="hourlyRate"
              type="number"
              min={0}
              step="0.01"
              defaultValue={page.profile ? (page.profile.hourly_rate ?? undefined) : undefined}
            />
          </Field>
          <input type="hidden" name="currency" value="USD" />
          <Field label="Location">
            <input name="location" defaultValue={page.profile?.location ?? undefined} />
          </Field>
          <Field label="Languages" hint="Comma-separated">
            <input name="languages" defaultValue={page.profile?.languages.join(', ')} />
          </Field>
          <Field label="Portfolio URL">
            <input name="portfolioUrl" defaultValue={page.profile?.portfolio_url ?? undefined} />
          </Field>
          <Field label="Domains" hint="Comma-separated, e.g. Finance, Technology and engineering">
            <input name="domains" defaultValue={page.profile?.domains.join(', ')} />
          </Field>
          <Field
            label="Functions"
            hint="Comma-separated, e.g. M&A and due diligence, Growth strategy"
          >
            <input name="functions" defaultValue={page.profile?.functions.join(', ')} />
          </Field>
          <Field label="Industries" hint="Comma-separated, e.g. Fintech, Healthcare">
            <input name="industries" defaultValue={page.profile?.industries.join(', ')} />
          </Field>
          <Button type="submit" disabled={page.busy}>
            Save profile
          </Button>
        </form>
        {page.profile && page.profile.vetting_status === 'unverified' && (
          <Button
            variant="secondary"
            disabled={page.busy}
            onClick={() => void page.requestVetting()}
          >
            Request vetting
          </Button>
        )}
      </section>

      <section className="panel settings-card">
        <h3>Credentials</h3>
        <p>
          Licenses, certifications, degrees, publications, or prior roles submitted for
          verification.
        </p>
        <form onSubmit={page.addCredential}>
          <Field label="Type">
            <select name="type" required defaultValue="certification">
              <option value="license">License</option>
              <option value="certification">Certification</option>
              <option value="degree">Degree</option>
              <option value="publication">Publication</option>
              <option value="prior-role">Prior role</option>
            </select>
          </Field>
          <Field label="Title">
            <input name="title" required maxLength={200} placeholder="e.g. CFA Charterholder" />
          </Field>
          <Field label="Issuer">
            <input name="issuer" required maxLength={200} placeholder="e.g. CFA Institute" />
          </Field>
          <Field label="Issued">
            <DatePicker name="issuedAt" />
          </Field>
          <Field label="Expires">
            <DatePicker name="expiresAt" />
          </Field>
          <Field label="Evidence URL">
            <input name="evidenceUrl" placeholder="Link to certificate, profile, or proof" />
          </Field>
          <Button type="submit" disabled={page.busy}>
            Submit credential
          </Button>
        </form>
        {page.credentials.length === 0 ? (
          <Empty title="No credentials yet">
            Submit a credential to strengthen your expert profile.
          </Empty>
        ) : (
          <ol className="activity-feed-list">
            {page.credentials.map((credential) => (
              <li key={credential.id} className="activity-feed-row">
                <span className="activity-feed-title">
                  <strong>{credential.title}</strong>
                  <br />
                  <small>
                    {credential.type} · {credential.issuer}
                  </small>
                </span>
                <StatusPill status={credential.verification_status} />
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className="panel settings-card">
        <h3>This week</h3>
        <p>Your open availability and confirmed bookings, at a glance.</p>
        <WeekCalendar
          events={[
            ...page.availability
              .filter((slot) => slot.status === 'open')
              .map((slot) => ({
                id: slot.id,
                startAt: slot.start_at,
                endAt: slot.end_at,
                label: slot.format.replace(/_/g, ' '),
                status: slot.status,
              })),
            ...page.bookings
              .filter((b) => b.status === 'confirmed')
              .map((booking) => ({
                id: booking.id,
                startAt: booking.start_at,
                endAt: booking.end_at,
                label: `Booked — ${booking.format.replace(/_/g, ' ')}`,
                status: booking.status,
              })),
          ]}
        />
      </section>

      <section className="panel settings-card">
        <h3>Availability</h3>
        <p>
          Open slots for advisory sessions, workshops, or fractional blocks that clients can book
          directly.
        </p>
        <form onSubmit={page.addAvailability}>
          <Field label="Starts">
            <input name="startAt" type="datetime-local" required />
          </Field>
          <Field label="Ends">
            <input name="endAt" type="datetime-local" required />
          </Field>
          <Field label="Format">
            <select name="format" defaultValue="advisory_session">
              <option value="advisory_session">Advisory session</option>
              <option value="workshop">Workshop</option>
              <option value="fractional_block">Fractional block</option>
            </select>
          </Field>
          <Button type="submit" disabled={page.busy}>
            Publish slot
          </Button>
        </form>
        {page.availability.length === 0 ? (
          <Empty title="No availability published">
            Publish a slot so clients can book time with you.
          </Empty>
        ) : (
          <ol className="activity-feed-list">
            {page.availability.map((slot) => (
              <li key={slot.id} className="activity-feed-row">
                <span className="activity-feed-title">
                  <strong>
                    {new Date(slot.start_at).toLocaleString()} →{' '}
                    {new Date(slot.end_at).toLocaleString()}
                  </strong>
                  <br />
                  <small>{slot.format.replace(/_/g, ' ')}</small>
                </span>
                <StatusPill status={slot.status} />
                {slot.status === 'open' && (
                  <Button
                    variant="secondary"
                    disabled={page.busy}
                    onClick={() => void page.removeAvailability(slot.id)}
                  >
                    Remove
                  </Button>
                )}
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className="panel settings-card">
        <h3>Bookings</h3>
        <p>Confirmed sessions where you are the client or the expert.</p>
        {page.bookings.length === 0 ? (
          <Empty title="No bookings yet">
            Book a slot from an expert's profile, or publish your own availability above.
          </Empty>
        ) : (
          <ol className="activity-feed-list">
            {page.bookings.map((booking) => (
              <li key={booking.id} className="activity-feed-row">
                <span className="activity-feed-title">
                  <strong>
                    {new Date(booking.start_at).toLocaleString()} →{' '}
                    {new Date(booking.end_at).toLocaleString()}
                  </strong>
                  <br />
                  <small>{booking.format.replace(/_/g, ' ')}</small>
                </span>
                <StatusPill status={booking.status} />
                {booking.status === 'confirmed' && (
                  <Button
                    variant="secondary"
                    disabled={page.busy}
                    onClick={() => void page.cancelBooking(booking.id)}
                  >
                    Cancel
                  </Button>
                )}
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className="panel settings-card">
        <h3>Expert teams</h3>
        <p>
          Compose complementary specialists around a complex objective while preserving
          responsibilities and access boundaries.
        </p>
        <form onSubmit={page.createTeam}>
          <Field label="Team name">
            <input name="name" required maxLength={200} placeholder="e.g. Growth Pod" />
          </Field>
          <Field label="Description">
            <input
              name="description"
              maxLength={2000}
              placeholder="What this team is composed for"
            />
          </Field>
          <Button type="submit" disabled={page.busy}>
            Create team
          </Button>
        </form>
        {page.teams.length === 0 ? (
          <Empty title="No expert teams yet">
            Create a team to compose specialists around a complex objective.
          </Empty>
        ) : (
          <ol className="activity-feed-list">
            {page.teams.map((team) => (
              <li key={team.id} className="activity-feed-row">
                <span className="activity-feed-title">
                  <strong>{team.name}</strong>
                  <br />
                  <small>
                    {team.members.length} member{team.members.length === 1 ? '' : 's'}
                    {team.description ? ` · ${team.description}` : ''}
                  </small>
                  <br />
                  <small>
                    Team ID (share with a client to assign this team to their project):{' '}
                    <code>{team.id}</code>
                  </small>
                </span>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className="panel settings-card">
        <h3>Review queue</h3>
        <p>
          Scoping cases flagged for qualified human review — claim one, then mark it complete when
          you've reviewed it.
        </p>
        {page.reviewQueue.length === 0 ? (
          <Empty title="Nothing pending">
            Amber and red-flagged scoping cases that need review will appear here.
          </Empty>
        ) : (
          <ol className="activity-feed-list">
            {page.reviewQueue.map((entry) => (
              <li key={entry.id} className="activity-feed-row">
                <span className="activity-feed-title">
                  <strong>{entry.objective}</strong>
                  <br />
                  <small>
                    {entry.category || 'No category'}
                    {entry.jurisdiction ? ` · ${entry.jurisdiction}` : ''}
                  </small>
                </span>
                <StatusPill status={entry.risk_band} />
                <StatusPill status={entry.status} />
                {entry.status === 'pending' && (
                  <Button
                    variant="secondary"
                    disabled={page.busy}
                    onClick={() => void page.claimReview(entry.id)}
                  >
                    Claim
                  </Button>
                )}
                {entry.status === 'claimed' && (
                  <form
                    onSubmit={(event) => {
                      event.preventDefault();
                      const notes = new FormData(event.currentTarget).get('notes');
                      void page.completeReview(entry.id, String(notes || ''));
                    }}
                    style={{ display: 'flex', gap: 8, gridColumn: '1 / -1' }}
                  >
                    <input name="notes" placeholder="Review notes" style={{ flex: 1 }} />
                    <Button type="submit" disabled={page.busy}>
                      Mark reviewed
                    </Button>
                  </form>
                )}
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className="panel settings-card">
        <h3>Handoff inbox</h3>
        <p>Work an AI agent could not complete on its own and handed off with its full context.</p>
        {page.handoffInbox.length === 0 ? (
          <Empty title="No handoffs waiting">
            When an agent needs qualified human judgment, it will appear here.
          </Empty>
        ) : (
          <ol className="activity-feed-list">
            {page.handoffInbox.map((handoff) => (
              <li key={handoff.id} className="activity-feed-row">
                <span className="activity-feed-title">
                  <strong>{handoff.source}</strong>
                  <br />
                  <small>{handoff.context_summary}</small>
                </span>
                <StatusPill status={handoff.status} />
                {handoff.status === 'pending' && (
                  <>
                    <Button
                      disabled={page.busy}
                      onClick={() => void page.acceptHandoff(handoff.id)}
                    >
                      Accept
                    </Button>
                    <Button
                      variant="secondary"
                      disabled={page.busy}
                      onClick={() => void page.declineHandoff(handoff.id)}
                    >
                      Decline
                    </Button>
                  </>
                )}
                {handoff.status === 'accepted' && (
                  <Button
                    disabled={page.busy}
                    onClick={() => void page.completeHandoff(handoff.id)}
                  >
                    Mark complete
                  </Button>
                )}
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className="panel settings-card">
        <h3>Skills assessment</h3>
        <p>A deterministic multiple-choice quiz — 80% or higher earns a pass badge.</p>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button
            variant="secondary"
            disabled={page.busy}
            onClick={() => void page.loadQuiz('javascript')}
          >
            Take JavaScript assessment
          </Button>
          <Button
            variant="secondary"
            disabled={page.busy}
            onClick={() => void page.loadQuiz('project-management')}
          >
            Take Project Management assessment
          </Button>
        </div>
        {page.quiz && (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void page.submitQuiz(quizAnswers);
            }}
          >
            {page.quiz.map((question, index) => (
              <div key={index} style={{ marginTop: 10 }}>
                <strong>{question.question}</strong>
                {question.options.map((option, optionIndex) => (
                  <label key={optionIndex} style={{ display: 'block', fontSize: 12 }}>
                    <input
                      type="radio"
                      name={`q${index}`}
                      onChange={() =>
                        setQuizAnswers((prev) => {
                          const next = [...prev];
                          next[index] = optionIndex;
                          return next;
                        })
                      }
                    />{' '}
                    {option}
                  </label>
                ))}
              </div>
            ))}
            <Button type="submit" disabled={page.busy || quizAnswers.length !== page.quiz.length}>
              Submit assessment
            </Button>
          </form>
        )}
        {page.lastAssessment && (
          <p>
            <strong>
              {page.lastAssessment.score}% —{' '}
              {page.lastAssessment.passed ? 'Passed' : 'Not yet passed'}
            </strong>
          </p>
        )}
      </section>

      <section className="panel settings-card">
        <h3>Expert Finder</h3>
        <p>
          Search for verified talent by skill — every result shows why it ranked, not just a
          black-box score.
        </p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input
            placeholder="e.g. react javascript"
            value={skillQuery}
            onChange={(e) => setSkillQuery(e.target.value)}
          />
          <input
            placeholder="Domain filter"
            value={domainFilter}
            onChange={(e) => setDomainFilter(e.target.value)}
          />
          <input
            placeholder="Function filter"
            value={functionFilter}
            onChange={(e) => setFunctionFilter(e.target.value)}
          />
          <input
            placeholder="Industry filter"
            value={industryFilter}
            onChange={(e) => setIndustryFilter(e.target.value)}
          />
          <Button
            disabled={page.busy || !skillQuery.trim()}
            onClick={() =>
              void page.searchExperts(skillQuery, undefined, {
                domain: domainFilter || undefined,
                function: functionFilter || undefined,
                industry: industryFilter || undefined,
              })
            }
          >
            Search
          </Button>
        </div>
        <Field label="Invite to job ID" hint="Paste the job's ID to enable the Invite action below">
          <input
            value={inviteJobId}
            onChange={(e) => setInviteJobId(e.target.value)}
            placeholder="job id"
          />
        </Field>
        {page.expertResults.length === 0 ? (
          <Empty title="No results yet">Search by skill to find matching experts.</Empty>
        ) : (
          <ol className="activity-feed-list">
            {page.expertResults.map((result) => (
              <li key={result.userId} className="activity-feed-row">
                <span className="activity-feed-title">
                  <strong>{result.headline}</strong>
                  <br />
                  <small>
                    {result.skills.join(', ')}
                    {result.domains.length > 0 && ` · ${result.domains.join(', ')}`} · score{' '}
                    {result.score} (skill {result.breakdown.skillScore}, rate{' '}
                    {result.breakdown.rateFit}, vetting {result.breakdown.vettingBonus}, credentials{' '}
                    {result.breakdown.credentialBonus}, reputation{' '}
                    {result.breakdown.reputationBonus})
                  </small>
                </span>
                <StatusPill status={result.vettingStatus} />
                <Button
                  variant="secondary"
                  disabled={page.busy || !inviteJobId.trim()}
                  onClick={() =>
                    void page.inviteToJob(
                      inviteJobId.trim(),
                      result.userId,
                      `Interested in working with you on this project.`,
                    )
                  }
                >
                  Invite
                </Button>
                <Button
                  variant="secondary"
                  disabled={page.busy}
                  onClick={() => void page.viewExpertAvailability(result.userId)}
                >
                  {page.viewingAvailability?.userId === result.userId
                    ? 'Hide availability'
                    : 'View availability'}
                </Button>
                {page.viewingAvailability?.userId === result.userId && (
                  <div style={{ flexBasis: '100%', marginTop: 8 }}>
                    {page.viewingAvailability.slots.length === 0 ? (
                      <Empty title="No open slots">
                        This expert hasn't published availability yet.
                      </Empty>
                    ) : (
                      <ol className="activity-feed-list">
                        {page.viewingAvailability.slots.map((slot) => (
                          <li key={slot.id} className="activity-feed-row">
                            <span className="activity-feed-title">
                              <strong>{new Date(slot.start_at).toLocaleString()}</strong>
                              <br />
                              <small>
                                {new Date(slot.start_at).toLocaleTimeString()} –{' '}
                                {new Date(slot.end_at).toLocaleTimeString()} ·{' '}
                                {slot.format.replace(/_/g, ' ')}
                              </small>
                            </span>
                            <Button
                              disabled={page.busy}
                              onClick={() => void page.bookSlot(slot.id, '')}
                            >
                              Book
                            </Button>
                          </li>
                        ))}
                      </ol>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className="panel settings-card">
        <h3>Invitations</h3>
        <p>Project invitations sent to you or by you.</p>
        {page.invitations.length === 0 ? (
          <Empty title="No invitations yet">
            Invitations you send or receive will appear here.
          </Empty>
        ) : (
          <ol className="activity-feed-list">
            {page.invitations.map((invitation) => (
              <li key={invitation.id} className="activity-feed-row">
                <span className="activity-feed-title">
                  <strong>{invitation.jobTitle || invitation.job_id}</strong>
                  <br />
                  <small>{invitation.message}</small>
                </span>
                <StatusPill status={invitation.status} />
                {invitation.status === 'pending' && (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <Button
                      disabled={page.busy}
                      onClick={() => void page.respondToInvitation(invitation.id, 'accept')}
                    >
                      Accept
                    </Button>
                    <Button
                      variant="ghost"
                      disabled={page.busy}
                      onClick={() => void page.respondToInvitation(invitation.id, 'reject')}
                    >
                      Decline
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className="panel settings-card">
        <h3>Job matches</h3>
        <p>
          Open projects ranked by fit to your own profile, so you can prioritize what to bid on.
        </p>
        <Button variant="secondary" disabled={page.busy} onClick={() => void page.loadJobMatches()}>
          Find matching projects
        </Button>
        {page.jobMatches.length === 0 ? (
          <Empty title="No matches loaded yet">
            Click above to see open projects ranked for you.
          </Empty>
        ) : (
          <ol className="activity-feed-list">
            {page.jobMatches.map((match) => (
              <li key={match.jobId} className="activity-feed-row">
                <span className="activity-feed-title">
                  <strong>{match.title}</strong>
                  <br />
                  <small>
                    {match.category} · {match.budgetMin}-{match.budgetMax} {match.currency} · score{' '}
                    {match.score}
                  </small>
                </span>
              </li>
            ))}
          </ol>
        )}
      </section>
    </section>
  );
}
