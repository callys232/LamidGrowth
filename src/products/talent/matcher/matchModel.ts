import type { Kpi } from '../../workspace/overview/overviewModel';
import type { JobMatch } from '../hooks/useTalentPage';
import type { Bid, JobWatch, Reputation } from '../talentTypes';

/** A score at or above this is shown as a strong match. */
export const STRONG_MATCH = 60;

const SIGNALS: Record<string, { label: string; max: number }> = {
  skillFit: { label: 'Skills', max: 70 },
  rateFit: { label: 'Within budget', max: 15 },
  budgetFit: { label: 'Under minimum budget', max: 15 },
  vettingBonus: { label: 'Verified profile', max: 15 },
};

/** A match score's parts with their labels and maxima, in the server's order. */
export function breakdownRows(breakdown: Record<string, number>) {
  return Object.entries(breakdown).map(([key, value]) => ({
    key,
    label: SIGNALS[key]?.label ?? key,
    value,
    max: SIGNALS[key]?.max ?? 100,
  }));
}

/** Job Matcher KPIs; `matches` is null when the user has no talent profile. */
export function matcherKpis({
  matches,
  bids,
  watches,
}: {
  matches: JobMatch[] | null;
  bids: Bid[];
  watches: JobWatch[];
}): Kpi[] {
  const strong = matches?.filter((m) => m.score >= STRONG_MATCH).length ?? 0;
  return [
    {
      domain: 'talent',
      label: 'Job matches',
      value: matches ? String(matches.length) : '—',
      hint: matches ? 'Open jobs that fit your profile' : 'Create a talent profile to match',
      to: '/os/job-matcher',
    },
    {
      domain: 'talent',
      label: 'Strong matches',
      value: matches ? String(strong) : '—',
      hint: `Scoring ${STRONG_MATCH} or more`,
      to: '/os/job-matcher',
    },
    {
      domain: 'opportunities',
      label: 'Bids submitted',
      value: String(bids.length),
      hint: bids.length ? 'Waiting on the client' : 'No bids yet',
      to: '/os/job-matcher?tab=bids',
    },
    {
      domain: 'opportunities',
      label: 'Saved searches',
      value: String(watches.length),
      hint: 'Alerts for new matching jobs',
      to: '/os/job-matcher?tab=saved',
    },
  ];
}

/** "4.6 ★ · 12 reviews", or "No reviews yet" — never a zero rating for someone unreviewed. */
export function reputationLabel(reputation: Reputation | null) {
  if (!reputation || reputation.reviewCount === 0 || reputation.averageRating === null)
    return 'No reviews yet';
  const count = reputation.reviewCount;
  return `${reputation.averageRating.toFixed(1)} ★ · ${count} ${count === 1 ? 'review' : 'reviews'}`;
}
