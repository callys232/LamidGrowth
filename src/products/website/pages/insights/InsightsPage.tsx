import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Download, Search } from 'lucide-react';
import playbooks from './playbooks.json';
import { downloadTemplate } from './InsightPlaybooks';
import { MoreDetail } from '../../../../shared/content/MoreDetail';
import './insights-page.css';

type Step = { title: string; text: string };
type Card = {
  id: string;
  pillar: string;
  title: string;
  summary: string;
  time: string;
  steps: Step[];
  source: 'engines' | 'guide';
};

const guidePlaybooks: Card[] = [
  {
    id: 'first-30-days',
    pillar: 'Start here',
    title: 'Your first 30 days with LAMID ONE',
    summary: 'Go from one goal to one approved next step, then repeat.',
    time: '30 minutes to start',
    source: 'guide',
    steps: [
      { title: 'Name one goal', text: 'Write the goal in one sentence and the date it matters.' },
      {
        title: 'Ask the Growth Companion',
        text: 'Describe the decision or challenge and ask for a structured next step.',
      },
      { title: 'Run one tool', text: 'Pick the tool that matches the job and add your own data.' },
      { title: 'Approve the step', text: 'Nothing consequential happens until you approve it.' },
    ],
  },
  {
    id: 'quarterly-goals',
    pillar: 'Clarity',
    title: 'Quarterly goal check',
    summary: 'See what matters, what moved and what to drop.',
    time: '45 minutes a quarter',
    source: 'guide',
    steps: [
      { title: 'List the goals', text: 'Keep it to three. Add an owner and a measure to each.' },
      { title: 'Mark progress', text: 'On track, at risk or stalled, with one line of evidence.' },
      { title: 'Name the obstacles', text: 'Write the one thing in the way of each goal.' },
      { title: 'Choose the next step', text: 'Decide what to continue, change or stop.' },
    ],
  },
  {
    id: 'weekly-review',
    pillar: 'Consistency',
    title: 'Weekly review in 20 minutes',
    summary: 'Keep work moving with a short, repeatable check.',
    time: '20 minutes a week',
    source: 'guide',
    steps: [
      { title: 'What moved', text: 'List what was finished since the last review.' },
      { title: 'What is blocked', text: 'Name the blocker and who can clear it.' },
      { title: 'What needs skills', text: 'Note any gap that slowed the work down.' },
      { title: 'Next three priorities', text: 'Write them down with an owner each.' },
    ],
  },
  {
    id: 'adviser-handoff',
    pillar: 'Clarity',
    title: 'Bring in an adviser with full context',
    summary: 'Prepare the facts once, so the adviser starts where you are.',
    time: '15 minutes to prepare',
    source: 'guide',
    steps: [
      { title: 'State the question', text: 'One question the adviser should answer.' },
      { title: 'Share what you know', text: 'Goal, decisions made, data and constraints.' },
      { title: 'Agree the outcome', text: 'What a useful answer looks like and by when.' },
      { title: 'Approve the hand-off', text: 'You decide what is shared and what happens next.' },
    ],
  },
];

const enginePlaybooks: Card[] = playbooks.map((p) => ({
  id: p.id,
  pillar: p.category,
  title: p.title,
  summary: p.description,
  time: 'Engine playbook',
  source: 'engines',
  steps: p.tools.map((t) => ({ title: t.name, text: t.purpose })),
}));

const cards: Card[] = [...guidePlaybooks, ...enginePlaybooks];
const pillars = ['All', ...new Set(cards.map((c) => c.pillar))];

function downloadGuide(card: Card) {
  const lines = [
    `# ${card.title}`,
    '',
    card.summary,
    '',
    'Date: __________',
    'Owner: __________',
    '',
  ];
  card.steps.forEach((s, i) =>
    lines.push(`## ${i + 1}. ${s.title}`, s.text, '', 'Notes: __________', ''),
  );
  const url = URL.createObjectURL(
    new Blob([lines.join('\n')], { type: 'text/markdown;charset=utf-8' }),
  );
  const a = document.createElement('a');
  a.href = url;
  a.download = `${card.id}-template.md`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function download(card: Card) {
  const engine = playbooks.find((p) => p.id === card.id);
  if (card.source === 'engines' && engine) downloadTemplate(engine);
  else downloadGuide(card);
}

export function InsightsPage() {
  const [pillar, setPillar] = useState('All');
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    if (window.location.hash === '#playbook-library')
      document.getElementById('playbook-library')?.scrollIntoView();
  }, []);

  const shown = useMemo(
    () =>
      cards.filter(
        (c) =>
          (pillar === 'All' || c.pillar === pillar) &&
          `${c.title} ${c.summary}`.toLowerCase().includes(query.toLowerCase()),
      ),
    [pillar, query],
  );

  return (
    <div className="ins-page">
      <section className="ins-hero">
        <p className="ins-eyebrow">Insights · Playbooks</p>
        <h1>Practical playbooks for steady growth.</h1>
        <p>Short, step-by-step guides with a template you can use today.</p>
        <div className="ins-actions">
          <a className="ins-btn ins-btn-ink" href="#playbook-library">
            Browse playbooks
          </a>
          <Link className="ins-btn" to="/signup">
            Get started
          </Link>
        </div>
      </section>

      <section className="ins-library" id="playbook-library" aria-labelledby="ins-lib-title">
        <div className="ins-lib-head">
          <h2 id="ins-lib-title">Playbook library</h2>
          <label className="ins-search">
            <Search size={16} aria-hidden="true" />
            <span className="sr-only">Search playbooks</span>
            <input
              type="search"
              placeholder="Search playbooks"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
        </div>
        <div className="ins-filters" role="group" aria-label="Filter by area">
          {pillars.map((p) => (
            <button key={p} type="button" aria-pressed={pillar === p} onClick={() => setPillar(p)}>
              {p}
            </button>
          ))}
        </div>
        <p className="ins-count" aria-live="polite">
          {shown.length} playbooks
        </p>
        <div className="ins-grid">
          {shown.map((c) => {
            const isOpen = open === c.id;
            return (
              <article key={c.id} className="ins-card" data-pillar={c.pillar.toLowerCase()}>
                <span className="ins-tag">{c.pillar}</span>
                <h3>{c.title}</h3>
                <p>{c.summary}</p>
                <p className="ins-time">{c.time}</p>
                {isOpen && (
                  <ol className="ins-steps">
                    {c.steps.map((s) => (
                      <li key={s.title}>
                        <strong>{s.title}</strong>
                        <span>{s.text}</span>
                      </li>
                    ))}
                  </ol>
                )}
                {isOpen && c.source === 'engines' && (
                  <p className="ins-note">
                    Use each tool separately. The template helps you prepare and review; it does not
                    run the tools for you.
                  </p>
                )}
                <div className="ins-card-actions">
                  <button
                    type="button"
                    className="ins-btn ins-btn-ink"
                    aria-expanded={isOpen}
                    onClick={() => setOpen(isOpen ? null : c.id)}
                  >
                    {isOpen ? 'Hide steps' : 'View steps'}
                  </button>
                  <button type="button" className="ins-btn" onClick={() => download(c)}>
                    <Download size={15} aria-hidden="true" /> Download template
                  </button>
                </div>
              </article>
            );
          })}
        </div>
        {!shown.length && <p className="ins-count">No playbooks match. Choose All.</p>}
      </section>

      <MoreDetail />

      <section className="ins-close">
        <h2>Want a playbook built around your work?</h2>
        <p>Talk to us, or start with the Growth Companion.</p>
        <div className="ins-actions">
          <Link className="ins-btn ins-btn-ink" to="/contact">
            Get a demo
          </Link>
          <Link className="ins-btn" to="/experts">
            Talk to an adviser
          </Link>
        </div>
      </section>
    </div>
  );
}
