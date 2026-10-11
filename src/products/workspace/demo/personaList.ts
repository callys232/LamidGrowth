import type { Context } from '../../../types';

/** The demo personas and tiers on their own, so light modules (the demo-session flag, the shell
 * banner) can use them without pulling in the seeded sample content. */
export type DemoProfile = Context | 'Freelancer';
export const PROFILES: DemoProfile[] = [
  'Individual',
  'Professional',
  'Freelancer',
  'Creator',
  'Founder',
  'Team',
  'SME',
  'Enterprise',
  'Institution',
];
export const TIERS = ['individual', 'team', 'enterprise'] as const;
export type DemoTier = (typeof TIERS)[number];
