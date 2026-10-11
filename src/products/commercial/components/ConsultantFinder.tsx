import { BadgeCheck, RefreshCw, Star } from 'lucide-react';
import { useEffect, useState } from 'react';
import { api } from '../../../api';
import { Button } from '../../../shared/ui/Button';
import { SkeletonList } from '../../../shared/ui/Skeleton';
import { StatusPill } from '../../../shared/workspace/ui/StatusPill';
import { useWorkspace } from '../../workspace/components/WorkspaceShell';
import type { ExpertResult } from '../../talent/hooks/useTalentPage';
import { Breakdown } from '../../talent/matcher/Breakdown';
import { reputationLabel } from '../../talent/matcher/matchModel';
import { ScoreRing } from '../../talent/matcher/ScoreRing';
import type { Reputation, ScreeningResult } from '../../talent/talentTypes';

/** Reputation is fetched for the leading candidates only, to keep the panel quick. */
const REPUTATION_LIMIT = 10;

/** Consultant finder for a job owner: every talent profile ranked against this job, with score
 * breakdown, verification and reputation, an invite flow, and bids already received ranked by the
 * screening blend. Scores guide a shortlist; they do not judge suitability. */
export function ConsultantFinder({ jobId }: { jobId: string }) {
  const { state } = useWorkspace();
  const [candidates, setCandidates] = useState<ExpertResult[]>([]);
  const [reputation, setReputation] = useState<Record<string, Reputation>>({});
  const [screening, setScreening] = useState<ScreeningResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const [invited, setInvited] = useState<string[]>([]);
  const [busy, setBusy] = useState('');
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    void (async () => {
      const [matches, invitations, screened] = await Promise.all([
        api<ExpertResult[]>(`/jobs/${jobId}/candidate-matches`),
        api<{ freelancer_user_id: string; status: string }[]>(`/jobs/${jobId}/invitations`),
        api<ScreeningResult[]>(`/jobs/${jobId}/screening`).catch(() => []),
      ]);
      const ranked = matches.filter((m) => m.userId !== state.user.id);
      const reps = await Promise.all(
        ranked
          .slice(0, REPUTATION_LIMIT)
          .map((c) => api<Reputation>(`/talent/${c.userId}/reputation`).catch(() => null)),
      );
      if (!active) return;
      setCandidates(ranked);
      setScreening(screened);
      setReputation(Object.fromEntries(reps.flatMap((r) => (r ? [[r.userId, r]] : []))));
      setInvited(
        invitations
          .filter((i) => ['pending', 'accepted'].includes(i.status))
          .map((i) => i.freelancer_user_id),
      );
    })()
      .catch((e) => {
        if (active) setError((e as Error).message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [jobId, state.user.id, revision]);
  async function invite(userId: string) {
    setBusy(userId);
    setError('');
    try {
      await api(`/jobs/${jobId}/invitations`, {
        freelancerUserId: userId,
        message: 'Please review this project brief and let us know whether you are available.',
      });
      setInvited((ids) => [...ids, userId]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy('');
    }
  }
  const headlineOf = (userId: string) =>
    candidates.find((c) => c.userId === userId)?.headline ?? 'Freelancer';
  return (
    <section className="ws-finder" data-domain="talent" data-scroll-feedback="off">
      <div className="ws-finder-head">
        <div>
          <h3>Find a consultant for this project</h3>
          <span>
            Profiles ranked against this job’s scope and deliverables — a guide for your shortlist.
            Review skills, credentials, availability and terms before engaging anyone.
          </span>
        </div>
        <Button variant="secondary" disabled={loading} onClick={() => setRevision((r) => r + 1)}>
          <RefreshCw size={14} /> Refresh matches
        </Button>
      </div>
      {loading && <SkeletonList rows={3} />}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {!loading && !error && !candidates.length && (
        <p className="ws-finder-empty">
          No consultants match this brief yet. Refine the scope or review expert profiles in Talent.
        </p>
      )}
      {!loading && candidates.length > 0 && (
        <ul className="ws-candidates">
          {candidates.map((candidate) => {
            const rep = reputation[candidate.userId] ?? null;
            const isInvited = invited.includes(candidate.userId);
            return (
              <li className="ws-candidate" key={candidate.userId}>
                <ScoreRing score={candidate.score} />
                <div className="ws-candidate-main">
                  <div className="ws-candidate-head">
                    <strong>{candidate.headline}</strong>
                    {candidate.vettingStatus === 'verified' ? (
                      <StatusPill tone="money">
                        <BadgeCheck size={13} /> Verified
                      </StatusPill>
                    ) : (
                      <StatusPill tone="neutral">{candidate.vettingStatus}</StatusPill>
                    )}
                  </div>
                  <p className="ws-candidate-skills">{candidate.skills.join(' · ')}</p>
                  <p className="ws-candidate-facts">
                    <span className="ws-reputation">
                      <Star size={13} aria-hidden="true" /> {reputationLabel(rep)}
                    </span>
                    {rep && rep.completedMilestones > 0 && (
                      <span>{rep.completedMilestones} milestones delivered</span>
                    )}
                    {candidate.hourlyRate != null && (
                      <span>
                        {candidate.hourlyRate} {candidate.currency ?? ''}/hour
                      </span>
                    )}
                  </p>
                  <Breakdown breakdown={candidate.breakdown} />
                </div>
                <Button
                  disabled={!!busy || isInvited}
                  variant={isInvited ? 'secondary' : 'primary'}
                  onClick={() => void invite(candidate.userId)}
                >
                  {isInvited
                    ? 'Invited'
                    : busy === candidate.userId
                      ? 'Inviting…'
                      : 'Invite to this project'}
                </Button>
              </li>
            );
          })}
        </ul>
      )}
      {!loading && screening.length > 0 && (
        <div className="ws-screening-wrap">
          <h4>Bids received, ranked</h4>
          <p>
            Half the bid’s own fit (budget, currency, relevance, timeline), plus assessments,
            verification and delivered milestones.
          </p>
          <ol className="ws-screening">
            {screening.map((result) => (
              <li key={result.bidId}>
                <ScoreRing score={result.blendedTotal} label="Screening score" />
                <div>
                  <strong>{headlineOf(result.freelancerUserId)}</strong>
                  <span>
                    Bid fit {result.bidScore.total} · assessments {result.assessmentAvg}% ·{' '}
                    {result.completedMilestones} milestones delivered · {result.vettingStatus}
                  </span>
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}
    </section>
  );
}
