/** The illustrations above the operating cycle. One question — "Can we take on another client this
 * month?" — followed through the Companion and then each stage of the cycle, so hovering a stage
 * shows what that stage adds. Stage steps mirror the /how-it-works/<stage> pages. */
export type HomeExample = {
  key: 'Companion' | 'Clarity' | 'Capability' | 'Consistency';
  heading: string;
  intro: string;
  steps: { title: string; body: string }[];
};

export const EXAMPLE_QUESTION = 'Can we take on another client this month?';

export const HOME_EXAMPLES: HomeExample[] = [
  {
    key: 'Companion',
    heading: 'A clearer next step, from your real question.',
    intro: 'Follow an example from the situation to a decision you control.',
    steps: [
      {
        title: 'Relevant context',
        body: 'Your shared plan shows a full delivery schedule and one project finishing next week.',
      },
      {
        title: 'A considered recommendation',
        body: 'Compare a smaller first phase with a later start. Check capacity before committing.',
      },
      {
        title: 'A practical next action',
        body: 'Prepare a phased delivery plan for your review.',
      },
      {
        title: 'Your decision',
        body: 'Sending the proposal needs your approval. Preparing a plan does not authorize a client commitment.',
      },
    ],
  },
  {
    key: 'Clarity',
    heading: 'See the situation before you choose.',
    intro: 'Separate what matters from what is merely urgent.',
    steps: [
      {
        title: 'Reduce noise',
        body: 'Three urgent requests this week — only the delivery schedule affects this decision.',
      },
      {
        title: 'Understand context',
        body: 'Capacity, the project finishing next week and the new client’s start date, side by side.',
      },
      {
        title: 'Reveal patterns',
        body: 'The last two rushed starts both slipped their first milestone.',
      },
      {
        title: 'A clear priority',
        body: 'Protect delivery quality while growing. The assumption to check: the team can absorb a phased start.',
      },
    ],
  },
  {
    key: 'Capability',
    heading: 'Know what taking it on requires.',
    intro: 'Check you can act on the decision before carrying more load.',
    steps: [
      {
        title: 'Knowledge',
        body: 'The client needs a data migration — a skill only one person on the team has.',
      },
      {
        title: 'Resources',
        body: 'Delivery capacity frees up when the current project closes next week.',
      },
      {
        title: 'Methods',
        body: 'A phased onboarding can reuse the plan from your last engagement.',
      },
      {
        title: 'The gap to close',
        body: 'Pair a second person on the migration before the first phase starts.',
      },
    ],
  },
  {
    key: 'Consistency',
    heading: 'Turn the decision into steady progress.',
    intro: 'Reduce the gap between deciding and doing.',
    steps: [
      {
        title: 'Move the next action',
        body: 'Send the phased plan for your approval by Thursday.',
      },
      {
        title: 'Build a rhythm',
        body: 'A short weekly capacity check while the new client ramps up.',
      },
      {
        title: 'Set a review trigger',
        body: 'If the first milestone slips by more than a week, revisit the scope.',
      },
      {
        title: 'Review the result',
        body: 'After phase one, compare planned and actual effort before committing to phase two.',
      },
    ],
  },
];
