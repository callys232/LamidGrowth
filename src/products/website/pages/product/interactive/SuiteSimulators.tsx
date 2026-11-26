import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import './interactive-suite.css';

interface SliderSpec {
  key: string;
  label: string;
  min: number;
  max: number;
  step: number;
  defaultValue: number;
  unit: string;
}

interface SimulatorConfig {
  badge: string;
  title: string;
  subtitle: string;
  sliders: [SliderSpec, SliderSpec];
  compute: (
    a: number,
    b: number,
  ) => {
    primaryLabel: string;
    primaryValue: string;
    primaryTone: 'good' | 'warn' | 'bad';
    secondaryLabel: string;
    secondaryValue: string;
    insight: string;
  };
}

const simulators: Record<string, SimulatorConfig> = {
  strategy: {
    badge: 'Strategy Alignment Simulator',
    title: 'Where is your budget drifting?',
    subtitle: 'Adjust quarterly spend and unaligned work to see what capital opens up.',
    sliders: [
      {
        key: 'budget',
        label: 'Quarterly Initiative Budget ($k)',
        min: 500,
        max: 5000,
        step: 100,
        defaultValue: 2400,
        unit: 'k',
      },
      {
        key: 'orphan',
        label: 'Unaligned / Orphan Spend (%)',
        min: 5,
        max: 45,
        step: 1,
        defaultValue: 22,
        unit: '%',
      },
    ],
    compute: (budget, orphanPct) => {
      const reclaimed = Math.round((budget * orphanPct) / 100);
      const alignedPct = 100 - orphanPct;
      const tone = alignedPct >= 85 ? 'good' : alignedPct >= 70 ? 'warn' : 'bad';
      return {
        primaryLabel: 'Reclaimable Capital',
        primaryValue: `$${reclaimed.toLocaleString()}k / qtr`,
        primaryTone: tone,
        secondaryLabel: 'Strategic Alignment',
        secondaryValue: `${alignedPct}%`,
        insight:
          orphanPct > 20
            ? `Cutting ${orphanPct}% orphan spend frees $${reclaimed}k for your top priorities.`
            : `Your alignment is strong (${alignedPct}%).`,
      };
    },
  },
  people: {
    badge: 'Bench & Skill-Gap Simulator',
    title: 'How deep is your leadership bench?',
    subtitle: 'Adjust critical roles and backup coverage to see your exposure.',
    sliders: [
      {
        key: 'roles',
        label: 'Critical Seats Tracked',
        min: 6,
        max: 30,
        step: 1,
        defaultValue: 14,
        unit: ' roles',
      },
      {
        key: 'coverage',
        label: 'Ready-Now / Deputy Coverage (%)',
        min: 20,
        max: 100,
        step: 5,
        defaultValue: 65,
        unit: '%',
      },
    ],
    compute: (roles, coverage) => {
      const covered = Math.round((roles * coverage) / 100);
      const exposed = Math.max(0, roles - covered);
      const tone = exposed <= 2 ? 'good' : exposed <= 5 ? 'warn' : 'bad';
      return {
        primaryLabel: 'Seats Without Backup',
        primaryValue: `${exposed} exposed`,
        primaryTone: tone,
        secondaryLabel: 'Bench Coverage',
        secondaryValue: `${covered} / ${roles} roles`,
        insight:
          exposed > 2
            ? `${exposed} critical seats still need a ready deputy.`
            : 'Your succession bench is resilient.',
      };
    },
  },
  operations: {
    badge: 'Delivery Flow Simulator',
    title: 'How much is waiting costing your teams?',
    subtitle: 'Adjust active work and weekly output to see how fast work flows.',
    sliders: [
      {
        key: 'wip',
        label: 'Active Work-In-Progress (items)',
        min: 10,
        max: 80,
        step: 2,
        defaultValue: 42,
        unit: ' items',
      },
      {
        key: 'throughput',
        label: 'Weekly Throughput (items / wk)',
        min: 3,
        max: 20,
        step: 1,
        defaultValue: 7,
        unit: '/wk',
      },
    ],
    compute: (wip, throughput) => {
      const leadWeeks = +(wip / Math.max(1, throughput)).toFixed(1);
      const tone = leadWeeks <= 3.5 ? 'good' : leadWeeks <= 5.5 ? 'warn' : 'bad';
      return {
        primaryLabel: 'Expected Lead Time',
        primaryValue: `${leadWeeks} weeks`,
        primaryTone: tone,
        secondaryLabel: 'Flow Ratio (WIP / Throughput)',
        secondaryValue: `${wip} : ${throughput}`,
        insight:
          leadWeeks > 4.5
            ? `Capping active work at ${Math.round(throughput * 3.5)} items cuts lead time to ~3.5 weeks.`
            : 'Your active workload matches weekly throughput.',
      };
    },
  },
  finance: {
    badge: '13-Week Cash & Margin Simulator',
    title: 'When does your cash runway dip?',
    subtitle: 'See how faster collections and margin gains protect your cash.',
    sliders: [
      {
        key: 'arDays',
        label: 'AR Collection Acceleration (days faster)',
        min: 0,
        max: 25,
        step: 1,
        defaultValue: 10,
        unit: 'd',
      },
      {
        key: 'marginLift',
        label: 'Operating Margin Lift (%)',
        min: 0,
        max: 8,
        step: 0.5,
        defaultValue: 2,
        unit: '%',
      },
    ],
    compute: (arDays, marginLift) => {
      const troughCash = Math.round(184 + arDays * 14);
      const roeLift = +(marginLift * 1.7).toFixed(1);
      const tone = troughCash >= 280 ? 'good' : troughCash >= 210 ? 'warn' : 'bad';
      return {
        primaryLabel: 'Projected Week-8 Cash Trough',
        primaryValue: `$${troughCash}k`,
        primaryTone: tone,
        secondaryLabel: 'Return on Equity Lift',
        secondaryValue: `+${roeLift}% ROE`,
        insight: `Collecting ${arDays} days faster adds ~$${arDays * 14}k to your cash floor.`,
      };
    },
  },
  'risk-governance': {
    badge: 'Early Warning Simulator',
    title: 'How many weeks before a limit breaks?',
    subtitle: 'Adjust your safety buffer and weekly drift to check breach timing.',
    sliders: [
      {
        key: 'margin',
        label: 'Headroom Above Red Threshold (%)',
        min: 4,
        max: 40,
        step: 2,
        defaultValue: 18,
        unit: '%',
      },
      {
        key: 'drift',
        label: 'Weekly Drift Velocity (% / wk)',
        min: 1,
        max: 10,
        step: 0.5,
        defaultValue: 4,
        unit: '%/wk',
      },
    ],
    compute: (margin, drift) => {
      const weeks = +(margin / Math.max(0.5, drift)).toFixed(1);
      const tone = weeks >= 6 ? 'good' : weeks >= 3.5 ? 'warn' : 'bad';
      return {
        primaryLabel: 'Weeks Before Breach',
        primaryValue: `${weeks} weeks`,
        primaryTone: tone,
        secondaryLabel: 'Status Band',
        secondaryValue: weeks >= 6 ? 'Within Appetite' : weeks >= 3.5 ? 'Amber Warning' : 'Immediate Action',
        insight:
          weeks < 6
            ? `At ${drift}%/wk drift, you cross threshold in ${weeks} weeks—act early.`
            : 'You have >=6 weeks of buffer before threshold breach.',
      };
    },
  },
  'growth-change': {
    badge: 'Growth & Readiness Simulator',
    title: 'Can your teams absorb your next bet?',
    subtitle: 'Test core investment against your team’s capacity to adopt change.',
    sliders: [
      {
        key: 'h1',
        label: 'Core Growth Allocation (%)',
        min: 30,
        max: 85,
        step: 5,
        defaultValue: 65,
        unit: '%',
      },
      {
        key: 'ability',
        label: 'Team Ability Score (%)',
        min: 25,
        max: 95,
        step: 5,
        defaultValue: 55,
        unit: '%',
      },
    ],
    compute: (h1, ability) => {
      const h2h3 = 100 - h1;
      const readiness = Math.round(h1 * 0.4 + ability * 0.6);
      const tone = readiness >= 70 && h1 >= 60 ? 'good' : readiness >= 55 ? 'warn' : 'bad';
      return {
        primaryLabel: 'Execution Readiness',
        primaryValue: `${readiness}%`,
        primaryTone: tone,
        secondaryLabel: 'Core / New Split',
        secondaryValue: `${h1}% / ${h2h3}%`,
        insight:
          ability < 60
            ? `Team ability (${ability}%) is your bottleneck—train before scaling new bets.`
            : `Balanced ${h1}/${h2h3} portfolio with strong team readiness.`,
      };
    },
  },
  advisory: {
    badge: 'Milestone Escrow Simulator',
    title: 'How does escrow protect your milestone spend?',
    subtitle: 'Adjust budget and milestones to see how sign-off gates protect funds.',
    sliders: [
      {
        key: 'scope',
        label: 'Total Mandate Budget ($k)',
        min: 15,
        max: 120,
        step: 5,
        defaultValue: 45,
        unit: 'k',
      },
      {
        key: 'milestones',
        label: 'Verified Escrow Milestones',
        min: 2,
        max: 6,
        step: 1,
        defaultValue: 3,
        unit: ' stages',
      },
    ],
    compute: (scope, milestones) => {
      const perTranche = +(scope / milestones).toFixed(1);
      return {
        primaryLabel: 'Released Per Verified Milestone',
        primaryValue: `$${perTranche}k`,
        primaryTone: 'good',
        secondaryLabel: 'Upfront Risk',
        secondaryValue: '$0 (100% Escrowed)',
        insight: `Each of your ${milestones} deliverables releases $${perTranche}k only after you sign off.`,
      };
    },
  },
};

export function SuiteSimulator({ suiteId }: { suiteId: string }) {
  const cfg = simulators[suiteId];
  const [valA, setValA] = useState<number>(cfg?.sliders[0].defaultValue ?? 0);
  const [valB, setValB] = useState<number>(cfg?.sliders[1].defaultValue ?? 0);

  if (!cfg) return null;
  const result = cfg.compute(valA, valB);

  return (
    <section className="suite-sim-wrap" aria-label={cfg.title}>
      <div className="dec-interactive-container suite-sim-container">
        <div className="suite-sim-head">
          <div>
            <h3>{cfg.title}</h3>
            <p>{cfg.subtitle}</p>
          </div>
          <Link to="/demo" className="suite-inspector-btn">
            Open Full Sandbox <ChevronRight size={14} aria-hidden="true" />
          </Link>
        </div>

        <div className="suite-sim-grid">
          <div className="suite-sim-controls">
            {[
              { spec: cfg.sliders[0], val: valA, set: setValA },
              { spec: cfg.sliders[1], val: valB, set: setValB },
            ].map(({ spec, val, set }) => (
              <label key={spec.key} className="suite-sim-slider-row">
                <div className="suite-sim-slider-meta">
                  <span>{spec.label}</span>
                  <strong>
                    {spec.unit === 'k' ? `$${val}k` : `${val}${spec.unit}`}
                  </strong>
                </div>
                <input
                  type="range"
                  min={spec.min}
                  max={spec.max}
                  step={spec.step}
                  value={val}
                  onChange={(e) => set(Number(e.target.value))}
                />
              </label>
            ))}
          </div>

          <div className="suite-sim-output">
            <div className="suite-sim-metrics">
              <div className="suite-sim-metric">
                <span>{result.primaryLabel}</span>
                <strong className={`tone-${result.primaryTone}`}>{result.primaryValue}</strong>
              </div>
              <div className="suite-sim-metric">
                <span>{result.secondaryLabel}</span>
                <strong>{result.secondaryValue}</strong>
              </div>
            </div>
            <p className="suite-sim-insight">{result.insight}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
