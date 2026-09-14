import { useState } from 'react';
import { Button } from '../../../shared/ui/Button';
import { Empty } from '../../../shared/ui/Empty';
import { Field } from '../../../shared/ui/Field';
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
        <h3>
          My profile{' '}
          {page.profile && <StatusPill status={page.profile.vetting_status} />}
        </h3>
        <form onSubmit={page.saveProfile}>
          <Field label="Headline">
            <input name="headline" defaultValue={page.profile?.headline} required maxLength={200} />
          </Field>
          <Field label="Skills" hint="Comma-separated, e.g. javascript, react, node">
            <input name="skills" defaultValue={page.profile?.skills.join(', ')} required />
          </Field>
          <Field label="Experience (years)">
            <input name="experienceYears" type="number" min={0} max={60} defaultValue={page.profile?.experience_years ?? undefined} />
          </Field>
          <Field label="Availability">
            <input name="availability" defaultValue={page.profile?.availability ?? undefined} />
          </Field>
          <Field label="Hourly rate (USD)">
            <input name="hourlyRate" type="number" min={0} step="0.01" defaultValue={page.profile ? page.profile.hourly_rate ?? undefined : undefined} />
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
          <Field label="Functions" hint="Comma-separated, e.g. M&A and due diligence, Growth strategy">
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
          <Button variant="secondary" disabled={page.busy} onClick={() => void page.requestVetting()}>
            Request vetting
          </Button>
        )}
      </section>

      <section className="panel settings-card">
        <h3>Credentials</h3>
        <p>Licenses, certifications, degrees, publications, or prior roles submitted for verification.</p>
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
            <input name="issuedAt" type="date" />
          </Field>
          <Field label="Expires">
            <input name="expiresAt" type="date" />
          </Field>
          <Field label="Evidence URL">
            <input name="evidenceUrl" placeholder="Link to certificate, profile, or proof" />
          </Field>
          <Button type="submit" disabled={page.busy}>
            Submit credential
          </Button>
        </form>
        {page.credentials.length === 0 ? (
          <Empty title="No credentials yet">Submit a credential to strengthen your expert profile.</Empty>
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
        <h3>Skills assessment</h3>
        <p>A deterministic multiple-choice quiz — 80% or higher earns a pass badge.</p>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="secondary" disabled={page.busy} onClick={() => void page.loadQuiz('javascript')}>
            Take JavaScript assessment
          </Button>
          <Button variant="secondary" disabled={page.busy} onClick={() => void page.loadQuiz('project-management')}>
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
              {page.lastAssessment.score}% — {page.lastAssessment.passed ? 'Passed' : 'Not yet passed'}
            </strong>
          </p>
        )}
      </section>

      <section className="panel settings-card">
        <h3>Expert Finder</h3>
        <p>Search for verified talent by skill — every result shows why it ranked, not just a black-box score.</p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input placeholder="e.g. react javascript" value={skillQuery} onChange={(e) => setSkillQuery(e.target.value)} />
          <input placeholder="Domain filter" value={domainFilter} onChange={(e) => setDomainFilter(e.target.value)} />
          <input placeholder="Function filter" value={functionFilter} onChange={(e) => setFunctionFilter(e.target.value)} />
          <input placeholder="Industry filter" value={industryFilter} onChange={(e) => setIndustryFilter(e.target.value)} />
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
          <input value={inviteJobId} onChange={(e) => setInviteJobId(e.target.value)} placeholder="job id" />
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
                    {result.domains.length > 0 && ` · ${result.domains.join(', ')}`} · score {result.score} (skill{' '}
                    {result.breakdown.skillScore}, rate {result.breakdown.rateFit}, vetting {result.breakdown.vettingBonus}, credentials{' '}
                    {result.breakdown.credentialBonus})
                  </small>
                </span>
                <StatusPill status={result.vettingStatus} />
                <Button
                  variant="secondary"
                  disabled={page.busy || !inviteJobId.trim()}
                  onClick={() => void page.inviteToJob(inviteJobId.trim(), result.userId, `Interested in working with you on this project.`)}
                >
                  Invite
                </Button>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className="panel settings-card">
        <h3>Invitations</h3>
        <p>Project invitations sent to you or by you.</p>
        {page.invitations.length === 0 ? (
          <Empty title="No invitations yet">Invitations you send or receive will appear here.</Empty>
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
                    <Button disabled={page.busy} onClick={() => void page.respondToInvitation(invitation.id, 'accept')}>
                      Accept
                    </Button>
                    <Button variant="ghost" disabled={page.busy} onClick={() => void page.respondToInvitation(invitation.id, 'reject')}>
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
        <p>Open projects ranked by fit to your own profile, so you can prioritize what to bid on.</p>
        <Button variant="secondary" disabled={page.busy} onClick={() => void page.loadJobMatches()}>
          Find matching projects
        </Button>
        {page.jobMatches.length === 0 ? (
          <Empty title="No matches loaded yet">Click above to see open projects ranked for you.</Empty>
        ) : (
          <ol className="activity-feed-list">
            {page.jobMatches.map((match) => (
              <li key={match.jobId} className="activity-feed-row">
                <span className="activity-feed-title">
                  <strong>{match.title}</strong>
                  <br />
                  <small>
                    {match.category} · {match.budgetMin}-{match.budgetMax} {match.currency} · score {match.score}
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
