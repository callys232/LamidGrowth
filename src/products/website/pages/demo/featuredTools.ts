/** Curated copy for the /demo page — the hero tool and the four "Start here" tools. The live form,
 * method and run all come from the engine catalog; this only holds the marketing framing, kept in
 * line with each engine's `computes` and `limits` (see describeEngine on the server). */
export type FeaturedTool = {
  code: string;
  name: string;
  /** One plain-language line: the problem the visitor already has. */
  hook: string;
  minutes: number;
  /** What the visitor will be asked for. */
  input: string;
  benefits: { title: string; body: string }[];
  basedOn: string;
  /** What the tool does not do — shown so the promise stays honest. */
  limit: string;
};

export const HERO_TOOL: FeaturedTool = {
  code: 'Q44',
  name: 'Decision Quality',
  hook: 'Catch the gap in a decision before it costs you — not after.',
  minutes: 5,
  input: '19 quick questions about one decision',
  benefits: [
    {
      title: 'See exactly what’s missing',
      body: 'Six checks: the right question, real options, solid facts, clear criteria, sound logic and a committed owner. You’ll see which one is letting the decision down.',
    },
    {
      title: 'A score a strong pitch can’t inflate',
      body: 'Your score is capped by the weakest check, so one fatal gap can’t hide behind five good answers.',
    },
    {
      title: 'Bigger stakes, higher bar',
      body: 'Say what’s riding on it and how hard it is to undo. A costly, one-way call has to clear a higher bar before it counts as ready.',
    },
    {
      title: 'Leave with a to-do list, not a grade',
      body: 'Every gap comes with a specific fix, fundamentals first, so you know what to do before the meeting.',
    },
  ],
  basedOn: 'Decision Quality',
  limit:
    'It checks how well you’re deciding — it can’t promise the choice will turn out right. That part is still yours.',
};

export const START_HERE: FeaturedTool[] = [
  {
    code: 'S01',
    name: 'Purpose & Strategic Direction',
    hook: 'Is your strategy clear, shared, and actually used?',
    minutes: 2,
    input: '6 rated questions',
    benefits: [
      {
        title: 'See whether purpose reaches decisions',
        body: 'Checks that purpose, values and priorities are not just written down but used when choices are made.',
      },
      {
        title: 'Evidence counts',
        body: 'Answers backed by evidence count for more than opinion, so the score reflects what you can show.',
      },
      {
        title: 'Done in two minutes',
        body: 'Six questions, scored by area and overall — the quickest engine to try.',
      },
    ],
    basedOn: 'Mission, vision and values; ISO 9001',
    limit:
      'It reflects the answers you give — it’s a guided self-check, not an audit or certification.',
  },
  {
    code: 'F01',
    name: 'Financial Health Ratios',
    hook: 'Enter a few numbers, see your margins, burn and runway.',
    minutes: 3,
    input: 'Revenue and costs per month, cash and headcount',
    benefits: [
      {
        title: 'The ratios that matter, worked out',
        body: 'Gross and operating margin, revenue growth, net burn, runway and revenue per head from the figures you enter.',
      },
      {
        title: 'Runway in months, not guesswork',
        body: 'See how long your cash lasts at the current burn.',
      },
      {
        title: 'Spot the trend',
        body: 'Growth and margins are read across every period you enter, not a single snapshot.',
      },
    ],
    basedOn: 'Management accounts ratios',
    limit:
      'It reads the months you enter — it won’t forecast ahead or put a value on the business.',
  },
  {
    code: 'Q21',
    name: 'Option Comparison',
    hook: 'Torn between options? See which wins — and how fragile that win is.',
    minutes: 4,
    input: 'Your options, the criteria that matter and their weights',
    benefits: [
      {
        title: 'Score options on what matters to you',
        body: 'Weighted scoring against your own criteria, normalised so different scales compare fairly.',
      },
      {
        title: 'Know how fragile the winner is',
        body: 'Checks how sensitive the winner is to the weights, so you know whether a small shift would change the answer.',
      },
      {
        title: 'A choice you can explain',
        body: 'The criteria, weights and scores are laid out, so anyone can follow how the winner was picked.',
      },
    ],
    basedOn: 'Multi-criteria decision analysis',
    limit:
      'It weighs what you tell it — it won’t research the options or check your scores for you.',
  },
  {
    code: 'R25',
    name: 'Root Cause Analysis',
    hook: 'Keep fixing the same problem? Find what’s really causing it.',
    minutes: 4,
    input: 'The problem, and the causes you suspect',
    benefits: [
      {
        title: 'Causes, not symptoms',
        body: 'Builds the cause chains and ranks root causes by the evidence and by whether they explain the facts.',
      },
      {
        title: 'Find the blind spots',
        body: 'Shows which fishbone categories you have not considered yet.',
      },
      {
        title: 'Sharper with what it isn’t',
        body: 'Say where the problem does not happen and the analysis tests each cause against it.',
      },
    ],
    basedOn: '5 Whys and fishbone analysis',
    limit: 'It tests the causes you list — it can’t uncover ones you haven’t thought of yet.',
  },
];
