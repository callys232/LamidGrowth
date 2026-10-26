import { useState } from 'react';
import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { outcome, pillars } from '../../../../shared/brand/pillars';
import '../motion.css';
import './responsible-ai.css';

const trustNav = [
  { label: 'Security', to: '/security' },
  { label: 'Responsible AI', to: '/responsible-ai' },
  { label: 'Privacy', to: '/trust/privacy' },
  { label: 'Governance', to: '/trust/governance' },
  { label: 'Enterprise', to: '/enterprise' },
];

type Engine = 'clarity' | 'capability' | 'consistency' | 'growth';

interface Agent {
  name: string;
  does: string;
  engine: Engine;
  approval?: boolean;
}

const engines: Record<Engine, { name: string; color: string }> = {
  clarity: { name: pillars[0].name, color: pillars[0].color },
  capability: { name: pillars[1].name, color: pillars[1].color },
  consistency: { name: pillars[2].name, color: pillars[2].color },
  growth: { name: outcome.name, color: outcome.color },
};

const agents: readonly Agent[] = [
  {
    name: 'Starter planner',
    does: 'Turns your first goal into a short starting plan.',
    engine: 'clarity',
  },
  {
    name: 'Context gatherer',
    does: 'Summarises the workspace context relevant to your question.',
    engine: 'clarity',
  },
  {
    name: 'Health checker',
    does: 'Runs a business-health diagnostic from your own data.',
    engine: 'clarity',
  },
  {
    name: 'Change watcher',
    does: 'Monitors signals and flags what has shifted.',
    engine: 'clarity',
  },
  { name: 'Goal advisor', does: 'Suggests the next stage for a goal and why.', engine: 'clarity' },
  {
    name: 'Skills mapper',
    does: 'Maps the capability you have against what the work needs.',
    engine: 'capability',
  },
  { name: 'Proposal writer', does: 'Drafts a proposal from a defined need.', engine: 'capability' },
  { name: 'Scope definer', does: 'Writes the scope of work for review.', engine: 'capability' },
  { name: 'Statement writer', does: 'Drafts the statement of work.', engine: 'capability' },
  {
    name: 'Brief writer',
    does: 'Turns a request into a clear client brief.',
    engine: 'capability',
  },
  {
    name: 'Deliverables planner',
    does: 'Lists what will be delivered and by when.',
    engine: 'capability',
  },
  {
    name: 'Acceptance setter',
    does: 'Writes the criteria that mark work as accepted.',
    engine: 'capability',
  },
  {
    name: 'Change-order drafter',
    does: 'Drafts a change order when the scope moves.',
    engine: 'capability',
  },
  { name: 'Contract drafter', does: 'Prepares contract wording for review.', engine: 'capability' },
  { name: 'Quote preparer', does: 'Prepares a quote from the agreed scope.', engine: 'capability' },
  {
    name: 'Estimate preparer',
    does: 'Prepares an estimate of effort and cost.',
    engine: 'capability',
  },
  { name: 'Invoice preparer', does: 'Prepares an invoice for review.', engine: 'capability' },
  {
    name: 'Workflow runner',
    does: 'Moves approved workflow steps forward, pausing for your approval.',
    engine: 'consistency',
    approval: true,
  },
  {
    name: 'Performance tracker',
    does: 'Reads your measures and shows the trend.',
    engine: 'growth',
  },
  { name: 'Market reader', does: 'Brings market context into the decision.', engine: 'growth' },
  { name: 'Opportunity spotter', does: 'Surfaces signals worth a closer look.', engine: 'growth' },
  {
    name: 'Experiment designer',
    does: 'Designs a small test before you commit.',
    engine: 'growth',
  },
];

const filters: ('all' | Engine)[] = ['all', 'clarity', 'capability', 'consistency', 'growth'];

const sources = [
  { name: 'Workspace notes', on: true },
  { name: 'Connected calendar', on: true },
  { name: 'Finance records', on: false },
  { name: 'Shared drive', on: false },
];

const memory = [
  'Prefers weekly reviews on Friday',
  'Q3 priority: retention',
  'Team of 12, two locations',
];

const bands = [
  {
    name: 'Observe & Update',
    text: 'Permitted context ingestion, synchronization, recalculation, status refresh, pattern detection and analysis.',
    gate: 'Runs within permitted scope',
  },
  {
    name: 'Progress Within Authorization',
    text: 'Already-approved workflow steps, scheduled processing, defined notifications and explicitly delegated work within scope.',
    gate: 'Runs only inside what you approved',
  },
  {
    name: 'Consequential Commitment',
    text: 'Financial, legal, strategic, external, permission-changing, reputational or irreversible actions pause for human approval unless that exact authority was explicitly delegated in advance under policy.',
    gate: 'Pauses for human approval',
  },
];

const checks = [
  'Evaluation',
  'Freshness checks',
  'Explanation',
  'Permission controls',
  'Override paths',
  'Auditability',
  'Human review',
];

function ChatPanel() {
  const [state, setState] = useState<'wait' | 'ok' | 'hold'>('wait');
  return (
    <div className="rai-panel rai-chat" aria-label="Illustration: a companion conversation">
      <div className="rai-panel-bar">
        <i />
        <i />
        <i />
        <span>Companion</span>
      </div>
      <div className="rai-bubble rai-me">Prepare the quote for the Lagos project.</div>
      <div className="rai-bubble rai-ai">
        <b>Quote preparer</b>
        Draft ready from the agreed scope. Sending it to the client is an external commitment.
      </div>
      <div className="rai-ask">
        <span>
          {state === 'wait'
            ? 'Waiting for your approval'
            : state === 'ok'
              ? 'Approved by you'
              : 'On hold'}
        </span>
        <div>
          <button type="button" disabled={state !== 'wait'} onClick={() => setState('ok')}>
            Approve
          </button>
          <button type="button" disabled={state !== 'wait'} onClick={() => setState('hold')}>
            Hold
          </button>
          {state !== 'wait' && (
            <button type="button" onClick={() => setState('wait')}>
              Reset
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function ContextPanel() {
  const [on, setOn] = useState(sources.map((s) => s.on));
  return (
    <div className="rai-panel" aria-label="Illustration: source permissions">
      <div className="rai-panel-bar">
        <i />
        <i />
        <i />
        <span>Permitted sources</span>
      </div>
      <ul className="rai-toggles">
        {sources.map((s, i) => (
          <li key={s.name}>
            <span>{s.name}</span>
            <button
              type="button"
              role="switch"
              aria-checked={on[i]}
              aria-label={s.name}
              onClick={() => setOn((p) => p.map((v, j) => (j === i ? !v : v)))}
            />
          </li>
        ))}
      </ul>
      <p className="rai-foot">
        {on.filter(Boolean).length} of {sources.length} sources in use. No permission expands
        itself.
      </p>
    </div>
  );
}

function MemoryPanel() {
  const [items, setItems] = useState(memory);
  const [paused, setPaused] = useState(false);
  return (
    <div className="rai-panel" aria-label="Illustration: remembered context">
      <div className="rai-panel-bar">
        <i />
        <i />
        <i />
        <span>Remembered context</span>
      </div>
      <ul className={paused ? 'rai-mem is-paused' : 'rai-mem'}>
        {items.map((m) => (
          <li key={m}>
            <span>{m}</span>
            <button
              type="button"
              aria-label={`Delete ${m}`}
              onClick={() => setItems((p) => p.filter((x) => x !== m))}
            >
              Delete
            </button>
          </li>
        ))}
        {!items.length && <li className="rai-empty">Nothing remembered.</li>}
      </ul>
      <div className="rai-foot rai-row">
        <button type="button" onClick={() => setPaused((p) => !p)}>
          {paused ? 'Turn memory on' : 'Turn memory off'}
        </button>
        <button
          type="button"
          onClick={() => {
            setItems(memory);
            setPaused(false);
          }}
        >
          Reset
        </button>
      </div>
    </div>
  );
}

function LadderPanel() {
  const [i, setI] = useState(0);
  return (
    <div className="rai-ladder">
      <div className="rai-rungs" role="tablist" aria-label="Authority bands">
        {bands.map((b, n) => (
          <button
            key={b.name}
            type="button"
            role="tab"
            aria-selected={n === i}
            className={n === i ? 'is-active' : undefined}
            onClick={() => setI(n)}
            onMouseEnter={() => setI(n)}
          >
            <span>{String(n + 1).padStart(2, '0')}</span>
            {b.name}
          </button>
        ))}
      </div>
      <div className="rai-rung-body">
        <p>{bands[i].text}</p>
        <strong>{bands[i].gate}</strong>
      </div>
      <p className="rai-note">A lower authority band never silently becomes a higher one.</p>
    </div>
  );
}

function GovernPanel() {
  const [level, setLevel] = useState(2);
  return (
    <div className="rai-panel" aria-label="Illustration: governance checks">
      <div className="rai-panel-bar">
        <i />
        <i />
        <i />
        <span>Governance checks</span>
      </div>
      <label className="rai-range">
        <span>How consequential is the work?</span>
        <input
          type="range"
          min={1}
          max={checks.length}
          value={level}
          onChange={(e) => setLevel(Number(e.target.value))}
        />
      </label>
      <ul className="rai-checks">
        {checks.map((c, n) => (
          <li key={c} className={n < level ? 'on' : undefined}>
            {c}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ResponsibleAiPage() {
  const [filter, setFilter] = useState<'all' | Engine>('all');
  const shown = agents.filter((a) => filter === 'all' || a.engine === filter);

  return (
    <div className="rai-page">
      <nav className="rai-nav" aria-label="Trust">
        {trustNav.map((n) => (
          <Link key={n.to} to={n.to} aria-current={n.to === '/responsible-ai' ? 'page' : undefined}>
            {n.label}
          </Link>
        ))}
      </nav>

      <header className="rai-hero">
        <div>
          <p className="rai-eyebrow">Responsible AI</p>
          <h1>AI should strengthen human judgment.</h1>
          <p className="rai-lede">
            LamidOne keeps intent, accountability and consequential control with people, while
            continuous intelligence and already-authorized work progress over time within defined
            boundaries.
          </p>
          <div className="rai-actions">
            <a className="rai-btn rai-btn-solid" href="#rai-agents">
              Meet the agents
            </a>
            <Link className="rai-link" to="/trust/governance">
              Governance →
            </Link>
          </div>
        </div>
        <ChatPanel />
      </header>

      <section className="rai-row-block" aria-labelledby="rai-ctx">
        <div className="rai-copy">
          <span className="rai-n">01</span>
          <h2 id="rai-ctx">Context &amp; privacy</h2>
          <p>
            Use only information, connected sources and progression scopes permitted for the task,
            workspace or organization. No permission expands itself.
          </p>
        </div>
        <ContextPanel />
      </section>

      <section className="rai-row-block is-flip" aria-labelledby="rai-mem">
        <div className="rai-copy">
          <span className="rai-n">02</span>
          <h2 id="rai-mem">Memory &amp; continuity control</h2>
          <p>
            Review, edit, disable or delete remembered context; control eligible progression
            permissions; and revoke them where available.
          </p>
        </div>
        <MemoryPanel />
      </section>

      <section className="rai-authority" aria-labelledby="rai-auth">
        <span className="rai-n">03</span>
        <h2 id="rai-auth">Progression does not equal unlimited authority.</h2>
        <LadderPanel />
      </section>

      <section className="rai-agents" id="rai-agents" aria-labelledby="rai-agents-title">
        <div className="rai-agents-head">
          <div>
            <span className="rai-n">04</span>
            <h2 id="rai-agents-title">Helpers that do the groundwork. You make the call.</h2>
          </div>
          <p>
            Each one has a clear job, from drafting a quote to spotting a risk. They work inside the
            limits you set, so the decisions stay yours.
          </p>
        </div>
        <div className="rai-filters" role="group" aria-label="Filter agents by area">
          {filters.map((f) => (
            <button
              key={f}
              type="button"
              aria-pressed={filter === f}
              className={filter === f ? 'is-active' : undefined}
              style={f === 'all' ? undefined : ({ '--rai-c': engines[f].color } as CSSProperties)}
              onClick={() => setFilter(f)}
            >
              {f !== 'all' && <i aria-hidden="true" />}
              {f === 'all' ? 'All' : engines[f].name}
            </button>
          ))}
        </div>
        <ul className="rai-grid">
          {shown.map((a) => (
            <li key={a.name} style={{ '--rai-c': engines[a.engine].color } as CSSProperties}>
              <span className="rai-ico" aria-hidden="true">
                {a.name[0]}
              </span>
              <h3>{a.name}</h3>
              <p>{a.does}</p>
              <span className="rai-tag">
                {a.approval ? 'Pauses for your approval' : 'Prepares for your review'}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="rai-row-block is-flip" aria-labelledby="rai-gov">
        <div className="rai-copy">
          <span className="rai-n">05</span>
          <h2 id="rai-gov">More capable AI requires more deliberate governance.</h2>
          <p>
            Increase evaluation, freshness checks, explanation, permission controls, override paths,
            auditability and human review as persistent progression influences more consequential
            work.
          </p>
        </div>
        <GovernPanel />
      </section>

      <footer className="rai-close">
        <h2>Read our AI principles.</h2>
        <div className="rai-actions">
          <Link className="rai-btn rai-btn-light" to="/trust/governance">
            Governance
          </Link>
          <Link className="rai-btn rai-btn-ghost" to="/contact">
            Contact us
          </Link>
        </div>
      </footer>
    </div>
  );
}
