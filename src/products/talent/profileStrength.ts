import type { TalentProfile } from './hooks/useTalentPage';

export type StrengthItem = { key: string; label: string; href: string };

const CHECKS: (StrengthItem & {
  done: (p: TalentProfile, extra: { credentials: number }) => boolean;
})[] = [
  {
    key: 'headline',
    label: 'Write a headline',
    href: '#talent-profile',
    done: (p) => !!p.headline.trim(),
  },
  {
    key: 'skills',
    label: 'List at least three skills',
    href: '#talent-profile',
    done: (p) => p.skills.length >= 3,
  },
  {
    key: 'rate',
    label: 'Set an hourly rate and currency',
    href: '#talent-profile',
    done: (p) => p.hourly_rate != null && !!p.currency,
  },
  {
    key: 'availability',
    label: 'Say when you’re available',
    href: '#talent-profile',
    done: (p) => !!p.availability?.trim(),
  },
  {
    key: 'portfolio',
    label: 'Add a portfolio link',
    href: '#talent-profile',
    done: (p) => !!p.portfolio_url,
  },
  {
    key: 'languages',
    label: 'Add the languages you work in',
    href: '#talent-profile',
    done: (p) => p.languages.length > 0,
  },
  {
    key: 'verified',
    label: 'Request profile verification',
    href: '#talent-profile',
    done: (p) => p.vetting_status === 'verified',
  },
  {
    key: 'credential',
    label: 'Add a credential',
    href: '#talent-credentials',
    done: (_, extra) => extra.credentials > 0,
  },
];

/** How complete a talent profile is, from fields the backend stores, and what is still missing.
 * These are the details matching and clients rely on. */
export function profileStrength(profile: TalentProfile | null, extra: { credentials: number }) {
  if (!profile)
    return { pct: 0, missing: CHECKS.map(({ key, label, href }) => ({ key, label, href })) };
  const missing = CHECKS.filter((check) => !check.done(profile, extra)).map(
    ({ key, label, href }) => ({ key, label, href }),
  );
  return { pct: Math.round(((CHECKS.length - missing.length) / CHECKS.length) * 100), missing };
}
