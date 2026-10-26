import type { ReactNode } from 'react';
import type { PillarId } from './pillars';
import './brand.css';

function Frame({
  pillar,
  label,
  children,
}: {
  pillar: PillarId;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="mock" data-pillar={pillar} role="img" aria-label={`${label} example screen`}>
      <div className="mock-bar">
        <span>
          <strong>LAMID ONE</strong> / {label}
        </span>
        <span className="mock-sample">Sample data</span>
      </div>
      <div className="mock-body">{children}</div>
    </div>
  );
}

function Expert({ children }: { children: ReactNode }) {
  return (
    <div className="mock-expert">
      <b>Expert-guided</b>
      <span>{children}</span>
    </div>
  );
}

export function ClarityMockup() {
  const rows = [
    ['Grow repeat customers', 'High impact'],
    ['Open a second branch', 'Needs funding'],
    ['Launch an online shop', 'Quick win'],
  ];
  return (
    <Frame pillar="clarity" label="Clarity">
      <h3 className="mock-title">What matters most this year?</h3>
      {rows.map(([goal, note], i) => (
        <div className="mock-row" key={goal}>
          <span className="dot" />
          <span className="grow">
            {i + 1}. {goal}
          </span>
          <small>{note}</small>
        </div>
      ))}
      <Expert>Start with repeat customers. It funds the other two.</Expert>
    </Frame>
  );
}

export function CapabilityMockup() {
  const skills = [
    ['Financial planning', 70],
    ['Team leadership', 45],
    ['Digital marketing', 25],
  ] as const;
  return (
    <Frame pillar="capability" label="Capability">
      <h3 className="mock-title">What your team can do today</h3>
      {skills.map(([name, pct]) => (
        <div key={name}>
          <div className="mock-row">
            <span className="grow">{name}</span>
            <small>{pct}%</small>
          </div>
          <div className="mock-meter" aria-hidden="true">
            <span style={{ width: `${pct}%` }} />
          </div>
        </div>
      ))}
      <Expert>Next: a 2-week digital marketing track and a CRM setup.</Expert>
    </Frame>
  );
}

export function ConsistencyMockup() {
  const tasks = [
    ['Business plan drafted', 'Done'],
    ['Loan application', 'In review'],
    ['Staff onboarding', 'This week'],
  ];
  return (
    <Frame pillar="consistency" label="Consistency">
      <h3 className="mock-title">Deliver the work</h3>
      {tasks.map(([task, status]) => (
        <div className="mock-row" key={task}>
          <span className="dot" />
          <span className="grow">{task}</span>
          <small>{status}</small>
        </div>
      ))}
      <div className="mock-meter" aria-hidden="true">
        <span style={{ width: '58%' }} />
      </div>
      <Expert>Two items need your sign-off before Friday.</Expert>
    </Frame>
  );
}

export function DashboardMockup() {
  return (
    <Frame pillar="clarity" label="Your growth path">
      <h3 className="mock-title">Where you are on the path</h3>
      <div className="mock-grid">
        <div className="mock-stat" data-pillar="clarity">
          <strong>3</strong>
          <small>Priorities set</small>
        </div>
        <div className="mock-stat" data-pillar="capability">
          <strong>2</strong>
          <small>Skills in progress</small>
        </div>
        <div className="mock-stat" data-pillar="consistency">
          <strong>58%</strong>
          <small>Work finished</small>
        </div>
      </div>
      <Expert>Your next step: confirm the loan documents.</Expert>
    </Frame>
  );
}
