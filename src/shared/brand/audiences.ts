import type { PillarId } from './pillars';

export interface AudiencePillar {
  pillar: Exclude<PillarId, 'growth'>;
  /** The pillar in this audience's own words. */
  words: string;
}

export interface Audience {
  id: string;
  name: string;
  route: string;
  lead: AudiencePillar;
  second: AudiencePillar;
  /** The one idea only this audience page carries; other pages must not repeat it. */
  ownsIdea: string;
}

/** One lead pillar and one supporting pillar per audience, in the audience's own words. */
export const audiences: readonly Audience[] = [
  {
    id: 'individuals',
    name: 'Individuals',
    route: '/who-its-for/individuals',
    lead: { pillar: 'clarity', words: 'Bring competing priorities into one clear view.' },
    second: { pillar: 'consistency', words: 'Turn intentions into realistic action and review.' },
    ownsIdea: 'Your personal context stays personal.',
  },
  {
    id: 'professionals',
    name: 'Professionals',
    route: '/who-its-for/professionals',
    lead: { pillar: 'capability', words: 'Build the capability your role or next stage requires.' },
    second: {
      pillar: 'clarity',
      words: 'Make stronger decisions with context and options in view.',
    },
    ownsIdea: 'Turn a career goal into a living path.',
  },
  {
    id: 'creators',
    name: 'Creators',
    route: '/who-its-for/creators',
    lead: { pillar: 'clarity', words: 'Define what you are building and what success means.' },
    second: {
      pillar: 'capability',
      words: 'Build the business behind the work: pricing, planning and finance.',
    },
    ownsIdea: 'Structure supports the work. It does not replace it.',
  },
  {
    id: 'founders',
    name: 'Founders',
    route: '/who-its-for/founders',
    lead: {
      pillar: 'clarity',
      words: 'Understand the assumptions and dependencies shaping the business.',
    },
    second: { pillar: 'capability', words: 'See what the next stage requires from your team.' },
    ownsIdea: 'Runway, cash flow and scenarios with transparent assumptions.',
  },
  {
    id: 'teams',
    name: 'Teams',
    route: '/who-its-for/teams',
    lead: {
      pillar: 'consistency',
      words: 'Review progress, blockers and next priorities together.',
    },
    second: { pillar: 'capability', words: 'See strengths, gaps and where support is needed.' },
    ownsIdea: 'Alignment becomes visible in the work.',
  },
  {
    id: 'smes',
    name: 'SMEs',
    route: '/who-its-for/smes',
    lead: { pillar: 'consistency', words: 'Find bottlenecks and recurring issues, then fix them.' },
    second: {
      pillar: 'capability',
      words: 'Improve margin by building the right skills and systems.',
    },
    ownsIdea: 'More capability, less fragmentation.',
  },
  {
    id: 'organisations',
    name: 'Organisations',
    route: '/who-its-for/enterprises',
    lead: {
      pillar: 'capability',
      words: 'See where capability supports strategy and where constraints are emerging.',
    },
    second: {
      pillar: 'consistency',
      words: 'Keep roles, review and accountability clear as you scale.',
    },
    ownsIdea: 'Technology should strengthen responsibility, not blur it.',
  },
  {
    id: 'social',
    name: 'Social & community',
    route: '/who-its-for/institutions',
    lead: { pillar: 'consistency', words: 'Deliver programmes reliably and show the impact.' },
    second: {
      pillar: 'capability',
      words: 'Strengthen the teams and partners who serve communities.',
    },
    ownsIdea: 'Reliable delivery for the people you serve.',
  },
];
