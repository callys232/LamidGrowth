export type PillarId = 'clarity' | 'capability' | 'consistency' | 'growth';

export interface Pillar {
  id: PillarId;
  name: string;
  verb: string;
  tagline: string;
  color: string;
}

export const pillars: readonly Pillar[] = [
  {
    id: 'clarity',
    name: 'Clarity',
    verb: 'Decide',
    tagline: 'Know what matters.',
    color: '#c12129',
  },
  {
    id: 'capability',
    name: 'Capability',
    verb: 'Build',
    tagline: 'Build the people and tools.',
    color: '#6b7a3a',
  },
  {
    id: 'consistency',
    name: 'Consistency',
    verb: 'Deliver',
    tagline: 'Deliver reliably, week after week.',
    color: '#2f6f73',
  },
];

/** Growth is the outcome of the three pillars, not a pillar itself. */
export const outcome: Pillar = {
  id: 'growth',
  name: 'Growth',
  verb: 'Grow',
  tagline: 'Progress that compounds.',
  color: '#b8923a',
};

export const brandTaglines = {
  primary: 'Decide. Build. Deliver. Grow.',
  authority: 'Continuous intelligence. Human control.',
  support: 'One place for growth.',
  heritage: 'Advising businesses since 1988.',
  closing: 'Start with what matters.',
  howItWorks: 'Experts and AI, in one place.',
} as const;
