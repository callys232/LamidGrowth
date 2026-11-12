import { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Cpu,
  Network,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import './interactive-suite.css';

interface ChainLink {
  id: string;
  name: string;
  question: string;
  score: number; // 0 - 100
  benchmark: string;
}

const initialChainLinks: ChainLink[] = [
  {
    id: 'framing',
    name: 'Appropriate Frame',
    question: 'Is the right problem defined with explicit boundaries?',
    score: 85,
    benchmark: 'Strategic Scope Definition',
  },
  {
    id: 'alternatives',
    name: 'Creative Alternatives',
    question: 'Are at least 3 distinct, viable options being evaluated?',
    score: 60,
    benchmark: 'Non-Binary Option Generation',
  },
  {
    id: 'information',
    name: 'Reliable Information',
    question: 'Are probabilities unbiased and facts separated from assumptions?',
    score: 75,
    benchmark: 'Empirical Evidence & Telemetry',
  },
  {
    id: 'values',
    name: 'Clear Values & Trade-offs',
    question: 'Are decision criteria and risk tolerances explicitly ranked?',
    score: 80,
    benchmark: 'Multi-Criteria Utility Weighting',
  },
  {
    id: 'logic',
    name: 'Sound Reasoning',
    question: 'Does the analysis mathematically calculate expected value?',
    score: 70,
    benchmark: 'Bayesian / Decision Tree Logic',
  },
  {
    id: 'commitment',
    name: 'Commitment to Action',
    question: 'Are resources, owners, and escalation paths committed?',
    score: 65,
    benchmark: 'DACI Ownership & Escrow Readiness',
  },
];

export function DecisionInteractiveSuite() {
  const [links, setLinks] = useState<ChainLink[]>(initialChainLinks);
  const [operatingModel, setOperatingModel] = useState<'centralized' | 'decentralized'>(
    'decentralized',
  );
  const [activeTab, setActiveTab] = useState<'dq-chain' | 'authority-matrix'>('dq-chain');
  const [simulatedEngine, setSimulatedEngine] = useState<'Q44' | 'Q21' | 'Q03'>('Q44');
  const [simulationRunning, setSimulationRunning] = useState(false);
  const [simulationOutput, setSimulationOutput] = useState<string | null>(null);

  // Matheson & Howard 6-Chain rule: Quality = min(all links)
  const lowestScore = Math.min(...links.map((l) => l.score));
  const weakestLink = links.find((l) => l.score === lowestScore) || links[0];
  const averageScore = Math.round(links.reduce((acc, l) => acc + l.score, 0) / links.length);

  const handleScoreChange = (id: string, newScore: number) => {
    setLinks((prev) => prev.map((l) => (l.id === id ? { ...l, score: newScore } : l)));
  };

  const handlePreset = (type: 'fragile' | 'typical' | 'rigorous') => {
    if (type === 'fragile') {
      setLinks([
        { ...links[0], score: 80 },
        { ...links[1], score: 35 }, // Weakest link
        { ...links[2], score: 50 },
        { ...links[3], score: 40 },
        { ...links[4], score: 60 },
        { ...links[5], score: 45 },
      ]);
    } else if (type === 'typical') {
      setLinks(initialChainLinks);
    } else {
      setLinks(links.map((l) => ({ ...l, score: 90 })));
    }
  };

  const runEngineSimulation = (code: 'Q44' | 'Q21' | 'Q03') => {
    setSimulatedEngine(code);
    setSimulationRunning(true);
    setSimulationOutput(null);
    setTimeout(() => {
      setSimulationRunning(false);
      if (code === 'Q44') {
        setSimulationOutput(
          `Weakest Link Identified: ${weakestLink.name} (${lowestScore}%). Governed recommendation: Withhold capital commitment until alternative breadth reaches $\\ge 75\\%$.`,
        );
      } else if (code === 'Q21') {
        setSimulationOutput(
          `Option A Margin of Victory: +14.2 pts over Option B. Parameter sensitivity threshold: A 4.8% drop in adoption flips the optimal choice to Option C.`,
        );
      } else {
        setSimulationOutput(
          `Bayesian EV calculated: Expected Value = $1.42M across 3 macro futures. Expected Value of Perfect Information (EVPI) on market timing = $180,000.`,
        );
      }
    }, 600);
  };

  return (
    <div className="dec-interactive-container">
      {/* Console Header */}
      <div className="dec-interactive-header">
        <div className="dec-header-left">
          <span className="dec-status-pill">
            <span className="dec-status-dot" />
            Interactive Governance Simulator
          </span>
          <h2 className="dec-header-title">Live Decision Quality & Authority Console</h2>
          <p className="dec-header-desc">
            Decentralize choices with verified rigor. Test how computational governance eliminates
            approval bottlenecks and scores decision certainty in real time.
          </p>
        </div>

        {/* Console Nav Tabs */}
        <div className="dec-tab-toggles" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'dq-chain'}
            className={`dec-tab-btn ${activeTab === 'dq-chain' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('dq-chain')}
          >
            <ShieldCheck size={16} aria-hidden="true" />
            <span>6-Chain Decision Quality</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'authority-matrix'}
            className={`dec-tab-btn ${activeTab === 'authority-matrix' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('authority-matrix')}
          >
            <Network size={16} aria-hidden="true" />
            <span>Authority & Friction (DACI)</span>
          </button>
        </div>
      </div>

      {/* Main Interactive Stage */}
      {activeTab === 'dq-chain' ? (
        <div className="dec-dq-stage">
          {/* Top Score Telemetry */}
          <div className="dec-dq-telemetry-bar">
            <div className="dec-dq-score-card">
              <span className="dec-telemetry-label">Effective Decision Quality</span>
              <div className="dec-score-display">
                <span className={`dec-score-number ${lowestScore < 70 ? 'is-warn' : 'is-good'}`}>
                  {lowestScore}%
                </span>
                <span className="dec-score-sub">
                  Weakest-Link Governed ($DQ = \\min(C_1..C_6)$)
                </span>
              </div>
            </div>

            <div className="dec-dq-status-callout">
              <div className="dec-status-header">
                {lowestScore >= 80 ? (
                  <CheckCircle2 size={18} className="dec-icon-good" />
                ) : (
                  <AlertTriangle size={18} className="dec-icon-warn" />
                )}
                <strong>
                  {lowestScore >= 80
                    ? 'High-Conviction Authorization Threshold'
                    : `Bottleneck: ${weakestLink.name}`}
                </strong>
              </div>
              <p className="dec-status-text">
                {lowestScore >= 80
                  ? 'All 6 critical links exceed the 80% institutional threshold. Cleared for irrevocable capital allocation.'
                  : `Even though average chain score is ${averageScore}%, total decision quality is capped at ${lowestScore}% by '${weakestLink.name}'. Capital is at risk.`}
              </p>
            </div>

            <div className="dec-preset-actions">
              <span className="dec-preset-label">Test Presets:</span>
              <div className="dec-preset-btns">
                <button
                  type="button"
                  className="dec-preset-btn"
                  onClick={() => handlePreset('fragile')}
                >
                  Bottlenecked (35%)
                </button>
                <button
                  type="button"
                  className="dec-preset-btn"
                  onClick={() => handlePreset('typical')}
                >
                  Standard (60%)
                </button>
                <button
                  type="button"
                  className="dec-preset-btn"
                  onClick={() => handlePreset('rigorous')}
                >
                  Institutional (90%)
                </button>
              </div>
            </div>
          </div>

          {/* Interactive 6-Chain Grid */}
          <div className="dec-chain-grid">
            {links.map((link, idx) => {
              const isWeakest = link.id === weakestLink.id;
              return (
                <div key={link.id} className={`dec-chain-card ${isWeakest ? 'is-weakest' : ''}`}>
                  <div className="dec-chain-card-header">
                    <span className="dec-chain-num">0{idx + 1}</span>
                    <h3 className="dec-chain-title">{link.name}</h3>
                    <span className="dec-chain-score-pill">{link.score}%</span>
                  </div>

                  <p className="dec-chain-question">{link.question}</p>
                  <span className="dec-chain-benchmark">{link.benchmark}</span>

                  <div className="dec-chain-slider-wrap">
                    <input
                      type="range"
                      min={10}
                      max={100}
                      step={5}
                      value={link.score}
                      onChange={(e) => handleScoreChange(link.id, Number(e.target.value))}
                      className="dec-chain-slider"
                      aria-label={`${link.name} score slider`}
                    />
                    <div className="dec-slider-ticks">
                      <span>Low (10)</span>
                      <span>Target (80)</span>
                      <span>High (100)</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Decision Telemetry Simulation Trigger */}
          <div className="dec-sim-footer">
            <div className="dec-sim-label">
              <Cpu size={16} aria-hidden="true" />
              <span>Simulate Decision Engines with Current Quality Vector:</span>
            </div>
            <div className="dec-sim-triggers">
              <button
                type="button"
                className={`dec-sim-btn ${simulatedEngine === 'Q44' ? 'is-active' : ''}`}
                onClick={() => runEngineSimulation('Q44')}
              >
                Q44: Decision Quality Audit
              </button>
              <button
                type="button"
                className={`dec-sim-btn ${simulatedEngine === 'Q21' ? 'is-active' : ''}`}
                onClick={() => runEngineSimulation('Q21')}
              >
                Q21: Option Sensitivity
              </button>
              <button
                type="button"
                className={`dec-sim-btn ${simulatedEngine === 'Q03' ? 'is-active' : ''}`}
                onClick={() => runEngineSimulation('Q03')}
              >
                Q03: Bayesian Expected Value
              </button>
            </div>
          </div>

          {/* Simulation Output Banner */}
          {simulationRunning ? (
            <div className="dec-output-loading" role="status">
              <RefreshCw size={16} className="dec-spin" aria-hidden="true" />
              <span>Computing engine decision telemetry...</span>
            </div>
          ) : simulationOutput ? (
            <div className="dec-output-banner" role="region" aria-label="Engine Simulation Result">
              <div className="dec-output-badge">Telemetry Output [{simulatedEngine}]</div>
              <p className="dec-output-text">{simulationOutput}</p>
            </div>
          ) : null}
        </div>
      ) : (
        /* Authority & Decentralization Matrix (DACI) Tab */
        <div className="dec-authority-stage">
          <div className="dec-auth-toggle-bar">
            <span className="dec-auth-toggle-label">Operating Governance Model:</span>
            <div className="dec-toggle-switch">
              <button
                type="button"
                className={`dec-switch-option ${operatingModel === 'centralized' ? 'is-active' : ''}`}
                onClick={() => setOperatingModel('centralized')}
              >
                Hierarchical Bottleneck
              </button>
              <button
                type="button"
                className={`dec-switch-option ${operatingModel === 'decentralized' ? 'is-active' : ''}`}
                onClick={() => setOperatingModel('decentralized')}
              >
                LAMID ONE Decentralized Decisions
              </button>
            </div>
          </div>

          <div className="dec-auth-comparison-grid">
            <div className="dec-auth-card">
              <span className="dec-auth-card-eyebrow">Cycle Time to Commitment</span>
              <div className="dec-metric-display">
                <span
                  className={`dec-big-metric ${operatingModel === 'decentralized' ? 'is-good' : 'is-bad'}`}
                >
                  {operatingModel === 'decentralized' ? '4.2 Hours' : '18.6 Days'}
                </span>
                <span className="dec-metric-change">
                  {operatingModel === 'decentralized'
                    ? '91% reduction in decision drag'
                    : 'Work stalled waiting for approvals'}
                </span>
              </div>
              <p className="dec-metric-explainer">
                {operatingModel === 'decentralized'
                  ? 'Decisions are executed at frontline level within governed criteria. Context travels with the choice.'
                  : 'Tasks escalate through multiple committees, creating decision latency and loss of operating context.'}
              </p>
            </div>

            <div className="dec-auth-card">
              <span className="dec-auth-card-eyebrow">Decision Backlog & Congestion</span>
              <div className="dec-metric-display">
                <span
                  className={`dec-big-metric ${operatingModel === 'decentralized' ? 'is-good' : 'is-bad'}`}
                >
                  {operatingModel === 'decentralized' ? '2 Pending' : '34 Overdue'}
                </span>
                <span className="dec-metric-change">
                  {operatingModel === 'decentralized'
                    ? 'Clear DACI single-owner accountability'
                    : 'Ambiguous approvals & orphaned choices'}
                </span>
              </div>
              <p className="dec-metric-explainer">
                {operatingModel === 'decentralized'
                  ? 'Every decision has exactly one Driver and one Approver. Early warnings flag drift before delays happen.'
                  : 'Multiple stakeholders possess veto authority without explicit criteria, paralyzing execution.'}
              </p>
            </div>

            <div className="dec-auth-card">
              <span className="dec-auth-card-eyebrow">Frontline Autonomy & Speed</span>
              <div className="dec-metric-display">
                <span
                  className={`dec-big-metric ${operatingModel === 'decentralized' ? 'is-good' : 'is-bad'}`}
                >
                  {operatingModel === 'decentralized' ? '88%' : '14%'}
                </span>
                <span className="dec-metric-change">
                  {operatingModel === 'decentralized'
                    ? 'Teams decide with structure & certainty'
                    : 'Passing work up without the capability to decide'}
                </span>
              </div>
              <p className="dec-metric-explainer">
                {operatingModel === 'decentralized'
                  ? 'Continuous intelligence gives teams the context to decide faster and the structure to deliver with certainty.'
                  : 'Teams pass work upward. Automation alone creates more work without the capability to decide.'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
