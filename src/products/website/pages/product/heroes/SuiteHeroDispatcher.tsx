import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, Shield } from 'lucide-react';
import type { ProductSuiteConfig } from '../ProductSuitePage';
import './heroes.css';

interface SuiteHeroProps {
  config: ProductSuiteConfig;
}

export function SuiteHeroDispatcher({ config }: SuiteHeroProps) {
  switch (config.id) {
    case 'strategy':
      return <StrategyHero config={config} />;
    case 'decisions':
      return <DecisionsHero config={config} />;
    case 'people':
      return <PeopleHero config={config} />;
    case 'operations':
      return <OperationsHero config={config} />;
    case 'finance':
      return <FinanceHero config={config} />;
    case 'risk-governance':
      return <RiskGovernanceHero config={config} />;
    case 'growth-change':
      return <GrowthChangeHero config={config} />;
    case 'advisory':
      return <AdvisoryHero config={config} />;
    default:
      return <DefaultSuiteHero config={config} />;
  }
}

/* ==========================================================================
   PATTERN 1: STRATEGY — Architectural Alignment Compass & North Star
   ========================================================================== */
function StrategyHero({ config }: SuiteHeroProps) {
  const [dragSim, setDragSim] = useState<number>(0);

  const alignmentScore = Math.max(76, 94.2 - dragSim * 1.2).toFixed(1);
  const orphanSpend = (dragSim * 24000).toLocaleString();

  return (
    <div className="hero-pattern-wrap" data-pillar={config.pillar}>
      <div className="hero-strategy-pattern">
        <div className="hero-content-col">
          <nav className="hero-base-crumbs" aria-label="Breadcrumb">
            <Link to="/">Home</Link> <span aria-hidden="true">›</span>{' '}
            <Link to="/product">Product</Link> <span aria-hidden="true">›</span>{' '}
            <span>{config.name}</span>
          </nav>
          <div className="suite-pillar-badge" data-pillar={config.pillar}>
            <span className="suite-pillar-dot" />
            <span>{config.pillar.toUpperCase()} PILLAR</span>
          </div>
          <h1 className="suite-title">{config.title}</h1>
          <p className="prod-lede suite-lede">{config.lede}</p>

          <div className="suite-statement-box">
            <p className="suite-statement-text">{config.statement}</p>
          </div>

          <div className="suite-tags-wrap" aria-label="Strategy Methodology Frameworks">
            {config.tags.map((tag) => (
              <span key={tag} className="suite-tag-pill">
                {tag}
              </span>
            ))}
          </div>

          <div className="prod-actions suite-actions">
            <Link className="prod-btn prod-btn-solid" to="/demo">
              Test Your Strategy in Demo
            </Link>
            <Link className="prod-btn prod-btn-outline" to="/contact">
              Talk with an Adviser
            </Link>
          </div>
        </div>

        <div className="strategy-visual-card" aria-label="Strategic Alignment Compass">
          <div className="strategy-visual-header">
            <div>
              <span className="strategy-kicker">North Star Alignment Compass</span>
              <h3 className="strategy-visual-title">Vector: 042° True Heading</h3>
            </div>
            <span className="strategy-live-indicator">
              <span className="strategy-pulse-dot" /> Active Telemetry
            </span>
          </div>

          <div className="strategy-compass-container">
            <svg
              className="strategy-compass-svg"
              viewBox="0 0 280 280"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              role="img"
              aria-label="Compass Vector Alignment Visual"
            >
              <circle
                cx="140"
                cy="140"
                r="120"
                stroke="currentColor"
                strokeWidth="2"
                strokeDasharray="4 4"
                className="strategy-compass-ring"
              />
              <circle
                cx="140"
                cy="140"
                r="80"
                stroke="currentColor"
                strokeWidth="1.5"
                opacity="0.5"
              />
              <circle
                cx="140"
                cy="140"
                r="40"
                stroke="currentColor"
                strokeWidth="1"
                opacity="0.3"
              />
              {/* Compass lines */}
              <line x1="140" y1="10" x2="140" y2="270" stroke="currentColor" opacity="0.3" />
              <line x1="10" y1="140" x2="270" y2="140" stroke="currentColor" opacity="0.3" />

              {/* Cardinal Labels */}
              <text x="140" y="32" textAnchor="middle" fill="#0284c7" fontSize="13" fontWeight="800">
                N · STRATEGY
              </text>
              <text x="250" y="145" textAnchor="middle" fill="#64748b" fontSize="11" fontWeight="700">
                E
              </text>
              <text x="140" y="260" textAnchor="middle" fill="#64748b" fontSize="11" fontWeight="700">
                S
              </text>
              <text x="30" y="145" textAnchor="middle" fill="#64748b" fontSize="11" fontWeight="700">
                W
              </text>

              {/* Dynamic needle rotated based on dragSim */}
              <g transform={`rotate(${42 + dragSim * 3}, 140, 140)`}>
                <polygon points="140,38 148,140 132,140" fill="#0284c7" />
                <polygon points="140,242 148,140 132,140" fill="#94a3b8" opacity="0.6" />
                <circle cx="140" cy="140" r="8" fill="#0d1a2b" stroke="#0284c7" strokeWidth="3" />
              </g>

              {/* Target North Star indicator */}
              <circle cx="205" cy="68" r="6" fill="#f59e0b" />
              <circle cx="205" cy="68" r="12" stroke="#f59e0b" strokeWidth="1" opacity="0.5" />
            </svg>
          </div>

          <div className="strategy-telemetry-strip">
            <div className="strategy-stat-cell">
              <span className="strategy-stat-lbl">Alignment Index</span>
              <span className="strategy-stat-val">{alignmentScore}%</span>
            </div>
            <div className="strategy-stat-cell">
              <span className="strategy-stat-lbl">Orphan Spend</span>
              <span className="strategy-stat-val">${orphanSpend}</span>
            </div>
            <div className="strategy-stat-cell">
              <span className="strategy-stat-lbl">Strategic Drag</span>
              <span className="strategy-stat-val">{(dragSim * 1.5).toFixed(1)}%</span>
            </div>
          </div>

          <div className="strategy-interactive-sim">
            <label htmlFor="strategy-drag-input" className="strategy-sim-lbl">
              <span>Simulate Initiative Drift:</span>
              <strong>{dragSim}% Drift Level</strong>
            </label>
            <input
              id="strategy-drag-input"
              type="range"
              min="0"
              max="10"
              value={dragSim}
              onChange={(e) => setDragSim(Number(e.target.value))}
              className="strategy-sim-slider"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ==========================================================================
   PATTERN 2: DECISIONS — 6-Chain Decision Quality Command Center
   ========================================================================== */
function DecisionsHero({ config }: SuiteHeroProps) {
  const [selectedChain, setSelectedChain] = useState<number>(2); // Reliable Info

  const chainNodes = [
    { num: '01', name: 'Helpful Frame', standard: 'Scope & Boundary Lock', score: '96%' },
    { num: '02', name: 'Creative Alternatives', standard: 'Multi-Option Divergence', score: '91%' },
    {
      num: '03',
      name: 'Reliable Information',
      standard: 'Epistemic Evidence Base',
      score: '64%',
      isAlert: true,
    },
    { num: '04', name: 'Clear Values', standard: 'Explicit Trade-Offs', score: '88%' },
    { num: '05', name: 'Sound Reasoning', standard: 'Expected Value & Bias Discount', score: '92%' },
    { num: '06', name: 'Commitment to Action', standard: 'Irrevocable Resource Lock', score: '85%' },
  ];

  const activeNode = chainNodes[selectedChain];

  return (
    <div className="hero-pattern-wrap" data-pillar={config.pillar}>
      <div className="hero-decisions-pattern">
        <nav className="hero-base-crumbs" aria-label="Breadcrumb">
          <Link to="/">Home</Link> <span aria-hidden="true">›</span>{' '}
          <Link to="/product">Product</Link> <span aria-hidden="true">›</span>{' '}
          <span>{config.name}</span>
        </nav>

        <div className="suite-pillar-badge" data-pillar={config.pillar}>
          <span className="suite-pillar-dot" />
          <span>{config.pillar.toUpperCase()} PILLAR</span>
        </div>

        <div className="decisions-banner-pill">
          <span className="suite-pillar-dot" />
          <span>Matheson &amp; Howard 6-Chain Decision Quality · DACI Authority</span>
        </div>

        <h1 className="suite-title decisions-hero-title">{config.title}</h1>
        <p className="prod-lede suite-lede decisions-hero-lede">{config.lede}</p>

        <div className="suite-statement-box decisions-hero-statement">
          <p className="suite-statement-text">{config.statement}</p>
        </div>

        <div className="suite-tags-wrap" aria-label="Decision Quality Standards">
          {config.tags.map((tag) => (
            <span key={tag} className="suite-tag-pill">
              {tag}
            </span>
          ))}
        </div>

        {/* 6-Chain Interactive Ribbon */}
        <div
          className="decisions-chain-preview"
          role="region"
          aria-label="6-Chain Decision Quality Chain"
        >
          <div className="decisions-chain-header">
            <span className="decisions-chain-title">
              Matheson &amp; Howard 6-Chain Model — Interactive Chain Status
            </span>
            <span className="decisions-chain-rule">
              The quality of any decision equals its weakest link.
            </span>
          </div>

          <div className="decisions-chain-track">
            {chainNodes.map((node, idx) => (
              <div key={node.num} className="decisions-chain-item-group">
                <button
                  type="button"
                  className={`decisions-chain-node ${idx === selectedChain ? 'is-selected' : ''} ${node.isAlert ? 'is-alert' : ''}`}
                  onClick={() => setSelectedChain(idx)}
                >
                  <span className="decisions-chain-num">{node.num}</span>
                  <span className="decisions-chain-name">{node.name}</span>
                  <span className="decisions-chain-val">{node.score}</span>
                </button>
                {idx < chainNodes.length - 1 && <span className="decisions-chain-sep">&rarr;</span>}
              </div>
            ))}
          </div>

          {activeNode && (
            <div className="decisions-chain-detail">
              <div className="decisions-detail-left">
                <strong>
                  Link {activeNode.num}: {activeNode.name}
                </strong>
                <span>Standard: {activeNode.standard}</span>
              </div>
              <div className="decisions-detail-right">
                {activeNode.isAlert ? (
                  <span className="decisions-alert-tag">
                    <AlertTriangle size={14} /> Weakest Link Detected (Below 70% Threshold)
                  </span>
                ) : (
                  <span className="decisions-ok-tag">
                    <CheckCircle2 size={14} /> Link Verified Solid
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="prod-actions suite-actions decisions-hero-actions">
          <Link className="prod-btn prod-btn-solid" to="/demo">
            Test Your Decision Quality
          </Link>
          <Link className="prod-btn prod-btn-outline" to="/contact">
            Request an Executive Briefing
          </Link>
        </div>
      </div>
    </div>
  );
}

/* ==========================================================================
   PATTERN 3: PEOPLE & SKILLS — 9-Box Talent Topology & Constellation
   ========================================================================== */
function PeopleHero({ config }: SuiteHeroProps) {
  const [activeCell, setActiveCell] = useState<{ row: number; col: number; label: string }>({
    row: 0,
    col: 2,
    label: 'High Potential / Top Talent',
  });

  const nineBoxData = [
    [
      { label: 'High Potential', count: '14', type: 'high-high' },
      { label: 'Growth Potential', count: '22', type: 'high-high' },
      { label: 'Top Performer Star', count: '18', type: 'high-high' },
    ],
    [
      { label: 'Developing Pro', count: '28', type: 'develop' },
      { label: 'Core Performer', count: '64', type: 'core' },
      { label: 'High Performer', count: '36', type: 'core' },
    ],
    [
      { label: 'Talent Risk', count: '6', type: 'develop' },
      { label: 'Solid Specialist', count: '31', type: 'core' },
      { label: 'Master Specialist', count: '19', type: 'core' },
    ],
  ];

  return (
    <div className="hero-pattern-wrap" data-pillar={config.pillar}>
      <div className="hero-people-pattern">
        <div className="hero-content-col">
          <nav className="hero-base-crumbs" aria-label="Breadcrumb">
            <Link to="/">Home</Link> <span aria-hidden="true">›</span>{' '}
            <Link to="/product">Product</Link> <span aria-hidden="true">›</span>{' '}
            <span>{config.name}</span>
          </nav>
          <div className="suite-pillar-badge" data-pillar={config.pillar}>
            <span className="suite-pillar-dot" />
            <span>{config.pillar.toUpperCase()} PILLAR</span>
          </div>
          <h1 className="suite-title">{config.title}</h1>
          <p className="prod-lede suite-lede">{config.lede}</p>

          <div className="suite-statement-box">
            <p className="suite-statement-text">{config.statement}</p>
          </div>

          <div className="suite-tags-wrap" aria-label="Human Capital Standards">
            {config.tags.map((tag) => (
              <span key={tag} className="suite-tag-pill">
                {tag}
              </span>
            ))}
          </div>

          <div className="prod-actions suite-actions">
            <Link className="prod-btn prod-btn-solid" to="/demo">
              Audit Your Talent Bench
            </Link>
            <Link className="prod-btn prod-btn-outline" to="/contact">
              Talk with a Workforce Adviser
            </Link>
          </div>
        </div>

        <div className="people-nine-box-card" aria-label="Talent Topology 9-Box Grid">
          <div className="strategy-visual-header">
            <div>
              <span className="strategy-kicker">ISO 30414 Human Capital Calibration</span>
              <h3 className="strategy-visual-title">9-Box Succession Topology</h3>
            </div>
            <span className="strategy-live-indicator">
              <span className="strategy-pulse-dot" /> Calibrated
            </span>
          </div>

          <div className="nine-box-grid">
            {nineBoxData.map((row, rIdx) =>
              row.map((cell, cIdx) => (
                <button
                  key={`${rIdx}-${cIdx}`}
                  type="button"
                  className={`nine-box-cell ${cell.type} ${
                    activeCell.row === rIdx && activeCell.col === cIdx ? 'is-selected' : ''
                  }`}
                  onClick={() =>
                    setActiveCell({
                      row: rIdx,
                      col: cIdx,
                      label: cell.label,
                    })
                  }
                >
                  <span className="nine-box-num">{cell.count}</span>
                  <span className="nine-box-cell-title">{cell.label}</span>
                </button>
              ))
            )}
          </div>

          <div className="nine-box-footer">
            <div>
              <strong>Active Segment:</strong> {activeCell.label}
            </div>
            <div>
              <strong>Bench Cover:</strong> 92% Ready
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ==========================================================================
   PATTERN 4: OPERATIONS — Flow Telemetry & Conveyor Stream
   ========================================================================== */
function OperationsHero({ config }: SuiteHeroProps) {
  const [activeStep, setActiveStep] = useState<number>(2);

  const steps = [
    { title: '1. Demand Intake', status: 'Continuous Smoothing', wip: '6 Orders' },
    { title: '2. Value Stream Triage', status: 'Takt Alignment', wip: '4 Batches' },
    { title: '3. WIP-Capped Execution', status: 'Conwip Enforced', wip: '12 Active' },
    { title: '4. Verified Delivery', status: 'Zero-Defect Gate', wip: '98.6% On-Time' },
  ];

  return (
    <div className="hero-pattern-wrap" data-pillar={config.pillar}>
      <div className="hero-operations-pattern">
        <nav className="hero-base-crumbs" aria-label="Breadcrumb">
          <Link to="/">Home</Link> <span aria-hidden="true">›</span>{' '}
          <Link to="/product">Product</Link> <span aria-hidden="true">›</span>{' '}
          <span>{config.name}</span>
        </nav>
        <div className="suite-pillar-badge" data-pillar={config.pillar}>
          <span className="suite-pillar-dot" />
          <span>{config.pillar.toUpperCase()} PILLAR</span>
        </div>
        <h1 className="suite-title">{config.title}</h1>
        <p className="prod-lede suite-lede">{config.lede}</p>

        <div className="suite-statement-box">
          <p className="suite-statement-text">{config.statement}</p>
        </div>

        <div className="suite-tags-wrap" aria-label="Operations Methodology Standards">
          {config.tags.map((tag) => (
            <span key={tag} className="suite-tag-pill">
              {tag}
            </span>
          ))}
        </div>

        {/* Industrial Telemetry Banner */}
        <div
          className="operations-telemetry-banner"
          role="region"
          aria-label="Little's Law Live Telemetry"
        >
          <div className="operations-metric-item">
            <span className="operations-metric-lbl">WIP In-Flight</span>
            <span className="operations-metric-val">14 Units</span>
            <span className="operations-metric-sub">Capped by Conwip</span>
          </div>
          <div className="operations-metric-item">
            <span className="operations-metric-lbl">Mean Cycle Time</span>
            <span className="operations-metric-val">4.2 Days</span>
            <span className="operations-metric-sub">Reduced from 18.6d</span>
          </div>
          <div className="operations-metric-item">
            <span className="operations-metric-lbl">Flow Efficiency</span>
            <span className="operations-metric-val">88.4%</span>
            <span className="operations-metric-sub">Value-Add Ratio</span>
          </div>
          <div className="operations-metric-item">
            <span className="operations-metric-lbl">Active Bottlenecks</span>
            <span className="operations-metric-val">0 Active</span>
            <span className="operations-metric-sub">Goldratt TOC Balanced</span>
          </div>
        </div>

        {/* Interactive Conveyor Flow Stream */}
        <div
          className="operations-flow-stream"
          role="region"
          aria-label="Value Stream Conveyor Steps"
        >
          {steps.map((step, idx) => (
            <div
              key={step.title}
              className={`operations-flow-step ${idx === activeStep ? 'is-active' : ''}`}
              onClick={() => setActiveStep(idx)}
              style={{ cursor: 'pointer' }}
            >
              <div>
                <div style={{ fontWeight: 700 }}>{step.title}</div>
                <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                  {step.status} · {step.wip}
                </div>
              </div>
              {idx < steps.length - 1 && <span className="operations-flow-arrow">&rarr;</span>}
            </div>
          ))}
        </div>

        <div className="prod-actions suite-actions" style={{ marginTop: '2rem' }}>
          <Link className="prod-btn prod-btn-solid" to="/demo">
            Inspect Your Delivery Flow
          </Link>
          <Link className="prod-btn prod-btn-outline" to="/contact">
            Schedule an Operations Audit
          </Link>
        </div>
      </div>
    </div>
  );
}

/* ==========================================================================
   PATTERN 5: FINANCE — DuPont Capital Tree & Cash Runway Horizon
   ========================================================================== */
function FinanceHero({ config }: SuiteHeroProps) {
  const [margin, setMargin] = useState<number>(18.2);
  const [turnover, setTurnover] = useState<number>(1.14);
  const [leverage, setLeverage] = useState<number>(1.2);

  const roe = (margin * turnover * leverage).toFixed(1);

  return (
    <div className="hero-pattern-wrap" data-pillar={config.pillar}>
      <div className="hero-finance-pattern">
        <div className="hero-content-col">
          <nav className="hero-base-crumbs" aria-label="Breadcrumb">
            <Link to="/">Home</Link> <span aria-hidden="true">›</span>{' '}
            <Link to="/product">Product</Link> <span aria-hidden="true">›</span>{' '}
            <span>{config.name}</span>
          </nav>
          <div className="suite-pillar-badge" data-pillar={config.pillar}>
            <span className="suite-pillar-dot" />
            <span>{config.pillar.toUpperCase()} PILLAR</span>
          </div>
          <h1 className="suite-title">{config.title}</h1>
          <p className="prod-lede suite-lede">{config.lede}</p>

          <div className="suite-statement-box">
            <p className="suite-statement-text">{config.statement}</p>
          </div>

          <div className="suite-tags-wrap" aria-label="Financial Standards">
            {config.tags.map((tag) => (
              <span key={tag} className="suite-tag-pill">
                {tag}
              </span>
            ))}
          </div>

          <div className="prod-actions suite-actions">
            <Link className="prod-btn prod-btn-solid" to="/demo">
              Model Your Cash &amp; Valuation
            </Link>
            <Link className="prod-btn prod-btn-outline" to="/contact">
              Talk with a Financial Adviser
            </Link>
          </div>
        </div>

        <div className="finance-dupont-card" aria-label="DuPont ROE Capital Tree">
          <div className="strategy-visual-header">
            <div>
              <span className="strategy-kicker">DuPont Return on Equity Framework</span>
              <h3 className="strategy-visual-title">Capital Efficiency Decomposition</h3>
            </div>
            <span className="strategy-live-indicator">
              <span className="strategy-pulse-dot" /> IFRS Calibrated
            </span>
          </div>

          <div className="dupont-tree">
            <div className="dupont-root-node">
              <div>
                <span
                  style={{
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    color: '#d97706',
                  }}
                >
                  Return on Equity (ROE)
                </span>
                <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                  Margin × Turnover × Leverage
                </div>
              </div>
              <span className="dupont-root-val">{roe}%</span>
            </div>

            <div className="dupont-branches">
              <div className="dupont-leaf">
                <span className="dupont-leaf-lbl">Net Profit Margin</span>
                <span className="dupont-leaf-val">{margin}%</span>
                <input
                  type="range"
                  min="8"
                  max="28"
                  value={margin}
                  onChange={(e) => setMargin(Number(e.target.value))}
                  style={{ width: '100%', marginTop: '0.4rem' }}
                />
              </div>

              <div className="dupont-leaf">
                <span className="dupont-leaf-lbl">Asset Turnover</span>
                <span className="dupont-leaf-val">{turnover}x</span>
                <input
                  type="range"
                  min="0.5"
                  max="2.5"
                  step="0.05"
                  value={turnover}
                  onChange={(e) => setTurnover(Number(e.target.value))}
                  style={{ width: '100%', marginTop: '0.4rem' }}
                />
              </div>

              <div className="dupont-leaf">
                <span className="dupont-leaf-lbl">Equity Multiplier</span>
                <span className="dupont-leaf-val">{leverage}x</span>
                <input
                  type="range"
                  min="1.0"
                  max="2.0"
                  step="0.05"
                  value={leverage}
                  onChange={(e) => setLeverage(Number(e.target.value))}
                  style={{ width: '100%', marginTop: '0.4rem' }}
                />
              </div>
            </div>

            <div
              style={{
                marginTop: '0.5rem',
                padding: '0.75rem',
                borderRadius: '8px',
                background: 'light-dark(#f8fafc, #16202c)',
                border: '1px solid light-dark(#e2e8f0, #273648)',
                fontSize: '0.8rem',
                display: 'flex',
                justifyContent: 'space-between',
              }}
            >
              <span>
                <strong>13-Week Dynamic Cash Runway:</strong>
              </span>
              <strong style={{ color: '#059669' }}>18.4 Months (Distress-Free)</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ==========================================================================
   PATTERN 6: RISK & GOVERNANCE — Institutional Fortress & ISO 31000 Matrix
   ========================================================================== */
function RiskGovernanceHero({ config }: SuiteHeroProps) {
  const [selectedKri, setSelectedKri] = useState<string>('Capital Solvency & Liquidity Buffer');

  // 5x5 ISO 31000 risk grid
  const matrixCells = [
    // Likelihood 5
    ['yellow', 'yellow', 'red', 'red', 'red'],
    // Likelihood 4
    ['yellow', 'yellow', 'yellow', 'red', 'red'],
    // Likelihood 3
    ['green', 'yellow', 'yellow', 'yellow', 'red'],
    // Likelihood 2
    ['green', 'green', 'yellow', 'yellow', 'yellow'],
    // Likelihood 1
    ['green', 'green', 'green', 'yellow', 'yellow'],
  ];

  return (
    <div className="hero-pattern-wrap" data-pillar={config.pillar}>
      <div className="hero-risk-pattern">
        <div className="hero-content-col">
          <nav className="hero-base-crumbs" aria-label="Breadcrumb">
            <Link to="/">Home</Link> <span aria-hidden="true">›</span>{' '}
            <Link to="/product">Product</Link> <span aria-hidden="true">›</span>{' '}
            <span>{config.name}</span>
          </nav>
          <div className="suite-pillar-badge" data-pillar={config.pillar}>
            <span className="suite-pillar-dot" />
            <span>{config.pillar.toUpperCase()} PILLAR</span>
          </div>
          <h1 className="suite-title">{config.title}</h1>
          <p className="prod-lede suite-lede">{config.lede}</p>

          <div className="suite-statement-box">
            <p className="suite-statement-text">{config.statement}</p>
          </div>

          <div className="suite-tags-wrap" aria-label="Governance & Risk Standards">
            {config.tags.map((tag) => (
              <span key={tag} className="suite-tag-pill">
                {tag}
              </span>
            ))}
          </div>

          <div className="prod-actions suite-actions">
            <Link className="prod-btn prod-btn-solid" to="/demo">
              Review Your Risk Exposure
            </Link>
            <Link className="prod-btn prod-btn-outline" to="/contact">
              Consult a Governance Lead
            </Link>
          </div>
        </div>

        <div className="risk-matrix-card" aria-label="ISO 31000 5x5 Heatmap">
          <div className="strategy-visual-header">
            <div>
              <span className="strategy-kicker">ISO 31000 Risk Management Standard</span>
              <h3 className="strategy-visual-title">5×5 Consequence Matrix</h3>
            </div>
            <span className="strategy-live-indicator">
              <span className="strategy-pulse-dot" /> Monitored
            </span>
          </div>

          <div className="risk-matrix-grid">
            {matrixCells.map((row, rIdx) =>
              row.map((cellType, cIdx) => {
                const isFlagged = rIdx === 2 && cIdx === 1; // Controlled safe zone
                return (
                  <button
                    key={`${rIdx}-${cIdx}`}
                    type="button"
                    className={`risk-cell ${cellType} ${isFlagged ? 'active-flag' : ''}`}
                    aria-label={`Matrix coordinate ${rIdx},${cIdx}`}
                    onClick={() => {
                      if (cellType === 'red')
                        setSelectedKri('Critical Exposure: Unmitigated Supply Chain Single Point');
                      else if (cellType === 'yellow')
                        setSelectedKri('Moderate Exposure: Regulatory Compliance Gap');
                      else setSelectedKri('Controlled Baseline: Capital Solvency & Liquidity');
                    }}
                  />
                );
              })
            )}
          </div>

          <div className="risk-legend-row">
            <span>Low Risk (Green)</span>
            <span>Moderate (Yellow)</span>
            <span>Critical (Red)</span>
          </div>

          <div
            style={{
              marginTop: '1rem',
              padding: '0.75rem',
              background: 'light-dark(#f8fafc, #16202c)',
              borderRadius: '8px',
              border: '1px solid light-dark(#e2e8f0, #273648)',
              fontSize: '0.8rem',
            }}
          >
            <strong>Active KRI Telemetry:</strong>
            <p style={{ margin: '0.2rem 0 0', color: '#7c3aed', fontWeight: 600 }}>{selectedKri}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ==========================================================================
   PATTERN 7: GROWTH & CHANGE — 3-Horizon Portfolio Trajectory
   ========================================================================== */
function GrowthChangeHero({ config }: SuiteHeroProps) {
  const [selectedHorizon, setSelectedHorizon] = useState<number>(1);

  const horizons = [
    {
      num: 'HORIZON 1',
      title: 'Core Cash Engine',
      alloc: '70% Allocation',
      desc: 'Defend and optimize mature revenue streams, tighten margin leakage, and extract operational cash flow.',
    },
    {
      num: 'HORIZON 2',
      title: 'Emerging Adjacencies',
      alloc: '20% Allocation',
      desc: 'Scale proven market expansions, commercialize graduated pilots, and capture fast-moving regional demand.',
    },
    {
      num: 'HORIZON 3',
      title: 'Transformational Bets',
      alloc: '10% Allocation',
      desc: 'Seed frontier options, test disruptive delivery models, and build resilience against industry shifts.',
    },
  ];

  return (
    <div className="hero-pattern-wrap" data-pillar={config.pillar}>
      <div className="hero-growth-pattern">
        <nav className="hero-base-crumbs" aria-label="Breadcrumb">
          <Link to="/">Home</Link> <span aria-hidden="true">›</span>{' '}
          <Link to="/product">Product</Link> <span aria-hidden="true">›</span>{' '}
          <span>{config.name}</span>
        </nav>
        <div className="suite-pillar-badge" data-pillar={config.pillar}>
          <span className="suite-pillar-dot" />
          <span>{config.pillar.toUpperCase()} PILLAR</span>
        </div>
        <h1 className="suite-title">{config.title}</h1>
        <p className="prod-lede suite-lede">{config.lede}</p>

        <div className="suite-statement-box">
          <p className="suite-statement-text">{config.statement}</p>
        </div>

        <div className="suite-tags-wrap" aria-label="Growth Methodology Standards">
          {config.tags.map((tag) => (
            <span key={tag} className="suite-tag-pill">
              {tag}
            </span>
          ))}
        </div>

        {/* 3-Horizon Portfolio Strip */}
        <div
          className="growth-horizon-strip"
          role="region"
          aria-label="3-Horizon Growth Portfolio Allocation"
        >
          {horizons.map((h, idx) => (
            <div
              key={h.num}
              className={`growth-horizon-card ${idx === selectedHorizon ? 'is-selected' : ''}`}
              onClick={() => setSelectedHorizon(idx)}
              style={{
                cursor: 'pointer',
                borderColor: idx === selectedHorizon ? '#d97706' : undefined,
              }}
            >
              <div className="growth-h-num">{h.num}</div>
              <h3 className="growth-h-title">{h.title}</h3>
              <div className="growth-h-alloc">{h.alloc}</div>
              <p className="growth-h-desc">{h.desc}</p>
            </div>
          ))}
        </div>

        <div className="prod-actions suite-actions">
          <Link className="prod-btn prod-btn-solid" to="/demo">
            Map Your Growth Portfolio
          </Link>
          <Link className="prod-btn prod-btn-outline" to="/contact">
            Speak with a Growth Strategist
          </Link>
        </div>
      </div>
    </div>
  );
}

/* ==========================================================================
   PATTERN 8: EXPERT ADVISORY — Executive Guild & Milestone Escrow Protocol
   ========================================================================== */
function AdvisoryHero({ config }: SuiteHeroProps) {
  const steps = [
    {
      num: 'STEP 01',
      title: 'Context Ingestion & Gap Diagnosis',
      desc: 'Computational assessment identifies root bottlenecks before human advisory hours begin.',
    },
    {
      num: 'STEP 02',
      title: 'Scope Lock & Milestone Escrow',
      desc: 'Fixed deliverable contracts with escrowed capital released solely upon verified metric attainment.',
    },
    {
      num: 'STEP 03',
      title: 'Executive Practitioner Embedded',
      desc: 'Senior subject-matter partners execute side-by-side with your leadership team.',
    },
    {
      num: 'STEP 04',
      title: 'Capability Transfer & Client Independence',
      desc: 'Internal operators certified to run models indefinitely without reliance on external advisers.',
    },
  ];

  return (
    <div className="hero-pattern-wrap" data-pillar={config.pillar}>
      <div className="hero-advisory-pattern">
        <div className="hero-content-col">
          <nav className="hero-base-crumbs" aria-label="Breadcrumb">
            <Link to="/">Home</Link> <span aria-hidden="true">›</span>{' '}
            <Link to="/product">Product</Link> <span aria-hidden="true">›</span>{' '}
            <span>{config.name}</span>
          </nav>
          <div className="suite-pillar-badge" data-pillar={config.pillar}>
            <span className="suite-pillar-dot" />
            <span>{config.pillar.toUpperCase()} PILLAR</span>
          </div>
          <h1 className="suite-title">{config.title}</h1>
          <p className="prod-lede suite-lede">{config.lede}</p>

          <div className="suite-statement-box">
            <p className="suite-statement-text">{config.statement}</p>
          </div>

          <div className="suite-tags-wrap" aria-label="Advisory Governance Standards">
            {config.tags.map((tag) => (
              <span key={tag} className="suite-tag-pill">
                {tag}
              </span>
            ))}
          </div>

          <div className="prod-actions suite-actions">
            <Link className="prod-btn prod-btn-solid" to="/contact">
              Find Your Fractional Leader
            </Link>
            <Link className="prod-btn prod-btn-outline" to="/demo">
              Explore 17+ Practice Corridors
            </Link>
          </div>
        </div>

        <div className="advisory-protocol-card" aria-label="Milestone Escrow Governance Protocol">
          <div className="strategy-visual-header">
            <div>
              <span className="strategy-kicker">Institutional Advisory Governance</span>
              <h3 className="strategy-visual-title">Milestone Escrow Architecture</h3>
            </div>
            <span className="strategy-live-indicator">
              <span className="strategy-pulse-dot" /> Verified Trust
            </span>
          </div>

          <div className="advisory-protocol-steps">
            {steps.map((st) => (
              <div key={st.num} className="advisory-step-row">
                <span className="advisory-step-badge">{st.num}</span>
                <div className="advisory-step-info">
                  <h4>{st.title}</h4>
                  <p>{st.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div
            style={{
              paddingTop: '0.75rem',
              borderTop: '1px solid light-dark(#e2e8f0, #273648)',
              fontSize: '0.76rem',
              color: '#7c3aed',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <Shield size={16} /> 17+ Verified Practice Corridors · Zero Billable-Hour Misalignment
          </div>
        </div>
      </div>
    </div>
  );
}

/* Fallback Default Hero */
function DefaultSuiteHero({ config }: SuiteHeroProps) {
  return (
    <div className="hero-pattern-wrap" data-pillar={config.pillar}>
      <nav className="hero-base-crumbs" aria-label="Breadcrumb">
        <Link to="/">Home</Link> <span aria-hidden="true">›</span>{' '}
        <Link to="/product">Product</Link> <span aria-hidden="true">›</span>{' '}
        <span>{config.name}</span>
      </nav>
      <div className="suite-pillar-badge" data-pillar={config.pillar}>
        <span className="suite-pillar-dot" />
        <span>{config.pillar.toUpperCase()} PILLAR</span>
      </div>
      <h1 className="suite-title">{config.title}</h1>
      <p className="prod-lede suite-lede">{config.lede}</p>

      <div className="suite-statement-box">
        <p className="suite-statement-text">{config.statement}</p>
      </div>

      <div className="suite-tags-wrap" aria-label="Domain Capabilities">
        {config.tags.map((tag) => (
          <span key={tag} className="suite-tag-pill">
            {tag}
          </span>
        ))}
      </div>

      <div className="prod-actions suite-actions">
        <Link className="prod-btn prod-btn-solid" to="/demo">
          Explore in Demo
        </Link>
        <Link className="prod-btn prod-btn-outline" to="/contact">
          Talk with an Adviser
        </Link>
      </div>
    </div>
  );
}
