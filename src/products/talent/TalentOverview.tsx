import { CheckCircle2, Circle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { api } from '../../api';
import { PageHeader } from '../../shared/workspace/ui/PageHeader';
import type { Kpi } from '../workspace/overview/overviewModel';
import type { Credential, JobMatch, TalentProfile } from './hooks/useTalentPage';
import { reputationLabel } from './matcher/matchModel';
import { profileStrength } from './profileStrength';
import type { Reputation } from './talentTypes';

/** Talent page header: profile strength with what's missing, and verification, credentials,
 * matches and reputation — all from backend data. */
export function TalentOverview({
  profile,
  credentials,
  userId,
}: {
  profile: TalentProfile | null;
  credentials: Credential[];
  userId: string;
}) {
  const [matches, setMatches] = useState<number | null>(null);
  const [reputation, setReputation] = useState<Reputation | null>(null);
  useEffect(() => {
    let active = true;
    void api<Reputation>(`/talent/${userId}/reputation`)
      .then((r) => active && setReputation(r))
      .catch(() => {});
    if (profile)
      void api<JobMatch[]>('/talent/job-matches')
        .then((m) => active && setMatches(m.length))
        .catch(() => {});
    return () => {
      active = false;
    };
  }, [userId, profile]);
  const strength = profileStrength(profile, { credentials: credentials.length });
  const verified = credentials.filter((c) => c.verification_status === 'verified').length;
  const kpis: Kpi[] = [
    {
      domain: 'talent',
      label: 'Verification',
      value: profile ? profile.vetting_status : 'No profile',
      hint:
        profile?.vetting_status === 'verified'
          ? 'Shown to clients'
          : 'Verified profiles rank higher',
      to: '/os/talent#talent-profile',
    },
    {
      domain: 'talent',
      label: 'Credentials',
      value: String(credentials.length),
      hint: `${verified} verified`,
      to: '/os/talent#talent-credentials',
    },
    {
      domain: 'opportunities',
      label: 'Job matches',
      value: matches === null ? '—' : String(matches),
      hint: 'Open jobs that fit your profile',
      to: '/os/job-matcher',
    },
    {
      domain: 'money',
      label: 'Reputation',
      value: reputation?.averageRating != null ? `${reputation.averageRating.toFixed(1)} ★` : '—',
      hint: reputationLabel(reputation),
      to: '/os/talent',
    },
  ];
  return (
    <>
      <PageHeader
        eyebrow="TALENT · PROFILE"
        title="Talent"
        description="Your expert profile, credentials and availability — what clients and matching see."
        kpis={kpis}
      />
      <section className="ws-panel ws-strength" aria-labelledby="strength-title">
        <div className="ws-strength-meter">
          <div
            className="ws-strength-ring"
            style={{ ['--pct' as string]: `${strength.pct}%` }}
            role="img"
            aria-label={`Profile ${strength.pct}% complete`}
          >
            <span className="ws-strength-pct">{strength.pct}%</span>
          </div>
          <div>
            <h2 id="strength-title">Profile strength</h2>
            <p>
              {strength.missing.length
                ? `${strength.missing.length} ${strength.missing.length === 1 ? 'step' : 'steps'} to a complete profile. Complete profiles match more jobs and earn more trust.`
                : 'Your profile is complete. Keep your availability and rate current.'}
            </p>
          </div>
        </div>
        <ul className="ws-strength-list">
          {strength.missing.length === 0 ? (
            <li data-done>
              <CheckCircle2 size={16} aria-hidden="true" /> Everything clients look for is in place
            </li>
          ) : (
            strength.missing.map((item) => (
              <li key={item.key}>
                <Circle size={16} aria-hidden="true" />
                <a href={item.href}>{item.label}</a>
              </li>
            ))
          )}
        </ul>
      </section>
    </>
  );
}
