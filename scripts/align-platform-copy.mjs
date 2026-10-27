import { readFileSync, writeFileSync } from 'node:fs';

function update(file, mutate) {
  const page = JSON.parse(readFileSync(file, 'utf8'));
  mutate(page);
  writeFileSync(file, `${JSON.stringify(page, null, 2)}\n`);
}

const platformDescription =
  'LAMID ONE brings relevant guidance, practical tools, and adviser support into one connected platform. AI suggests, explains, and prepares. You decide what happens next.';

update('src/products/website/pages/home/content.json', (page) => {
  page.seo_title = 'LAMID ONE | Decide. Build. Deliver.';
  page.meta_description = platformDescription;
  page.title = 'Decide what matters, build what\u2019s needed, and deliver the results \u2014 all in one place.';
  page.description = platformDescription;
  page.landingHero.eyebrow = 'The LAMID ONE platform';
  page.landingHero.description = platformDescription;
  page.hero.title = page.title;
  page.hero.paragraphs[0].text = page.title;
  page.hero.paragraphs[1].text = platformDescription;
});

update('src/products/website/pages/product/content.json', (page) => {
  const headline = 'Decide what matters. Build what\u2019s needed. Deliver the work.';
  page.seo_title = 'LAMID ONE Platform | Decide, Build, Deliver';
  page.meta_description = platformDescription;
  page.title = headline;
  page.description = platformDescription;
  page.hero = {
    title: headline,
    paragraphs: [
      { text: headline },
      { text: platformDescription },
      { text: 'AI suggests, explains, and prepares. You decide what happens next.' },
      { text: 'Explore the live demo or talk with an adviser.' },
    ],
  };
  page.sections = [
    {
      label: 'THE THREE PILLARS',
      title: 'Three pillars. One connected progression.',
      paragraphs: [
        { text: 'Clarity' },
        { text: 'Bring priorities, constraints, and opportunities into view. Understand where you are, what matters, and which decision or next step deserves attention.' },
        { text: 'Capability' },
        { text: 'Build the skills, habits, plans, and structures that make progress possible, for yourself or across a team.' },
        { text: 'Consistency' },
        { text: 'Connect decisions and capability to action, ownership, review, and steady delivery.' },
        { text: 'Each movement informs the next: a clearer direction reveals what capability is needed, and stronger capability makes delivery more reliable.' },
      ],
    },
    {
      label: 'FROM INTENT TO ACTION',
      title: 'Start with the situation in front of you.',
      paragraphs: [
        { text: 'Bring an objective, decision, opportunity, or challenge into focus.' },
        { text: 'The Companion uses relevant context to surface the questions, options, and next steps connected to that work.' },
        { text: 'Choose a task-specific tool when you need structured analysis, then carry the useful finding into a plan or action.' },
        { text: 'Review what changed and decide what to do next.' },
      ],
    },
    {
      label: 'HUMAN DIRECTION',
      title: 'Intelligence works within human direction.',
      paragraphs: [
        { text: 'AI support' },
        { text: 'AI can organize relevant context, compare information, explain its reasoning, and prepare recommendations.' },
        { text: 'Human judgment' },
        { text: 'You set the objective, review the reasoning, and decide what happens. Consequential work pauses for your approval.' },
        { text: 'Adviser support' },
        { text: 'When the work needs experience or a second perspective, an adviser can join the conversation.' },
      ],
    },
    {
      label: 'CONTINUITY AND CONTROL',
      title: 'Carry useful context forward.',
      paragraphs: [
        { text: 'With permission, relevant context and progress can remain available across sessions so you can continue from the work already done.' },
        { text: 'Review what is remembered, which sources or workflows may continue, and what each permission allows.' },
        { text: 'You can inspect progress, change direction, pause, or revoke permission through the available controls.' },
        { text: 'Any ongoing work remains within its defined authorization. New consequential decisions stay with people.' },
      ],
    },
    {
      label: 'RELEVANT DEPTH',
      title: 'The same method supports different kinds of work.',
      paragraphs: [
        { text: 'An individual can begin with a personal decision. A founder can bring a business question. A team can coordinate shared work, and an organization can apply governance across responsibilities.' },
        { text: 'The context changes the tools, detail, and coordination needed. Clarity, Capability, and Consistency keep the underlying progression recognizable.' },
        { text: 'Start with the depth that helps now, then move into related tools and workflows as the work calls for them.' },
      ],
    },
  ];
  let sourceParagraph = 15000;
  for (const block of [page.hero, ...page.sections]) {
    for (const paragraph of block.paragraphs) {
      paragraph.sourceParagraph ??= sourceParagraph++;
    }
  }
});
