// Free, deterministic planning suggestions. These are editable starting points,
// not AI output or claims about the user's resources or readiness.
export function suggestGoalPathway(objective) {
  const goal = `${objective.title} ${objective.description}`.toLowerCase();
  let approach = 'Make progress in small, reviewable steps';
  let middle = [
    [
      'Identify the biggest uncertainty',
      'Write down what you need to learn before committing more effort.',
    ],
    ['Try one small action', 'Choose a manageable experiment and record what happened.'],
    [
      'Adjust and repeat what works',
      'Use the evidence from your first attempt to choose the next action.',
    ],
  ];
  if (/\b(business|market|customer|sales|grow|revenue)\b/.test(goal)) {
    approach = 'Validate demand before expanding';
    middle = [
      [
        'Define the audience and problem',
        'Name the people you want to help and the problem you want to solve.',
      ],
      [
        'Test the idea with potential customers',
        'Gather feedback on one small offer before increasing spending.',
      ],
      [
        'Run a small growth experiment',
        'Choose one channel, set a spending limit, and record the response.',
      ],
    ];
  } else if (/\b(learn|skill|career|job|study|practice)\b/.test(goal)) {
    approach = 'Build capability through practice and feedback';
    middle = [
      ['Identify one capability gap', 'Compare your current ability with what the goal requires.'],
      [
        'Complete a small practice project',
        'Choose a task that demonstrates the capability you want to build.',
      ],
      [
        'Get feedback and improve the work',
        'Ask for specific feedback and apply one useful improvement.',
      ],
    ];
  } else if (/\b(decision|decide|choose)\b/.test(goal)) {
    approach = 'Compare options and test the key assumption';
    middle = [
      [
        'List the options and decision criteria',
        'Identify realistic alternatives and what matters when comparing them.',
      ],
      [
        'Check the riskiest assumption',
        'Gather evidence for the assumption most likely to change your decision.',
      ],
      [
        'Choose a reversible first commitment',
        'Record your choice, the reasons, and when you will reconsider.',
      ],
    ];
  }
  return {
    source: 'template',
    approach,
    steps: [
      {
        title: 'Define a baseline and success checkpoint',
        notes:
          `Goal: ${objective.title}\nSuccess: ${objective.success || 'Choose an observable measure of success.'}\nRecord your starting point and choose a date to review progress.`.slice(
            0,
            5000,
          ),
      },
      ...middle.map(([title, notes]) => ({ title, notes })),
      {
        title: 'Review the outcome and choose what comes next',
        notes:
          `Compare results with your success measure. Record what you learned and decide whether to continue, adapt, or finish.\nConstraints to review: ${objective.constraints || 'Confirm available time, budget, and support.'}`.slice(
            0,
            5000,
          ),
      },
    ],
  };
}
