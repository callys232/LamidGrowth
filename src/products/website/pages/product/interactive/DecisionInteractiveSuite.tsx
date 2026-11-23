import { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Network,
  ShieldCheck,
  SlidersHorizontal,
} from 'lucide-react';
import './interactive-suite.css';

interface ChainLink {
  id: string;
  name: string;
  question: string;
  score: number;
}

const initialChainLinks: ChainLink[] = [
  {
    id: 'framing',
    name: 'Clear Framing',
    question: 'Are you solving the right problem?',
    score: 85,
  },
  {
    id: 'alternatives',
    name: 'Real Options',
    question: 'Have you compared at least 3 distinct choices?',
    score: 60,
  },
  {
    id: 'information',
    name: 'Verified Facts',
    question: 'Are facts separated from guesses?',
    score: 55,
  },
  {
    id: 'values',
    name: 'Clear Trade-offs',
    question: 'Do you know what risks you will accept?',
    score: 80,
  },
  {
    id: 'logic',
    name: 'Sound Math',
    question: 'Do the numbers support your pick?',
    score: 70,
  },
  {
    id: 'commitment',
    name: 'Single Owner',
    question: 'Does one person own the next step?',
    score: 65,
  },
];

type PreviewMode = 'audit' | 'margin' | 'expected-value';

export function DecisionInteractiveSuite() {
  const [activeTab, setActiveTab] = useState<'dq-chain' | 'authority-matrix'>('dq-chain');
  const [links, setLinks] = useState<ChainLink[]>(initialChainLinks);
  const [previewMode, setPreviewMode] = useState<PreviewMode>('audit');
  const [operatingModel, setOperatingModel] = useState<'centralized' | 'decentralized'>('decentralized');

  const weakestLink = links.reduce((min, link) => (link.score < min.score ? link : min), links[0]);
  const lowestScore = weakestLink.score;
  const averageScore = Math.round(links.reduce((sum, link) => sum + link.score, 0) / links.length);

  const handleScoreChange = (id: string, newScore: number) => {
    setLinks((prev) => prev.map((link) => (link.id === id ? { ...link, score: newScore } : link)));
  };

  const handlePreset = (preset: 'fragile' | 'typical' | 'rigorous') => {
    if (preset === 'fragile') {
      setLinks(initialChainLinks.map((l, idx) => ({ ...l, score: idx === 2 ? 35 : 70 })));
    } else if (preset === 'typical') {
      setLinks(initialChainLinks);
    } else {
      setLinks(initialChainLinks.map((l) => ({ ...l, score: 90 })));
    }
  };

  const previewCopy =
    previewMode === 'audit'
      ? lowestScore >= 75
        ? `All 6 checks sit at ${lowestScore}% or higher. You have clear evidence to commit.`
        : `Your weakest check is "${weakestLink.name}" (${lowestScore}%). Strengthen it above 75% before you commit.`
      : previewMode === 'margin'
        ? `Your top choice leads by +14 pts. It holds unless adoption drops more than ${Math.max(3, Math.round(lowestScore / 12))}% below forecast.`
        : `Expected value is $1.42M across 3 scenarios. Resolving "${weakestLink.name}" first protects up to $180k in upside.`;

  return (
    <div className="dec-interactive-container">
      <div className="dec-interactive-header">
        <div className="dec-header-left">
          <span className="dec-status-pill">
            <span className="dec-status-dot" />
            Interactive Decision Check
          </span>
          <h2 className="dec-header-title">Test a call before you commit</h2>
          <p className="dec-header-desc">
            Drag any slider to see how one weak link holds back an entire decision—or compare
            bottlenecked approvals with clear team ownership.
          </p>
        </div>

        <div className="dec-tab-toggles" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'dq-chain'}
            className={`dec-tab-btn ${activeTab === 'dq-chain' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('dq-chain')}
          >
            <ShieldCheck size={16} aria-hidden="true" />
            <span>6-Check Readiness</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'authority-matrix'}
            className={`dec-tab-btn ${activeTab === 'authority-matrix' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('authority-matrix')}
          >
            <Network size={16} aria-hidden="true" />
            <span>Who Owns the Call</span>
          </button>
        </div>
      </div>

      {activeTab === 'dq-chain' ? (
        <div className="dec-ux-split">
          <div className="dec-ux-sliders">
            {links.map((link, idx) => {
              const isWeakest = link.id === weakestLink.id && lowestScore < 80;
              return (
                <div key={link.id} className={`dec-ux-row ${isWeakest ? 'is-weakest' : ''}`}>
                  <div className="dec-ux-row-top">
                    <div className="dec-ux-row-title">
                      <span className="dec-chain-num">0{idx + 1}</span>
                      <div>
                        <h3>{link.name}</h3>
                        <p>{link.question}</p>
                      </div>
                    </div>
                    <span className={`dec-chain-score-pill ${isWeakest ? 'is-warn' : ''}`}>
                      {link.score}%
                    </span>
                  </div>
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
                </div>
              );
            })}
          </div>

          <aside className="dec-ux-summary" aria-label="Readiness Summary">
            <div className="dec-ux-score-box">
              <span className="dec-telemetry-label">Overall Readiness</span>
              <div className="dec-ux-score-row">
                <strong className={`dec-score-number ${lowestScore < 75 ? 'is-warn' : 'is-good'}`}>
                  {lowestScore}%
                </strong>
                <span className="dec-score-sub">Capped by your lowest check (avg {averageScore}%)</span>
              </div>
              <div className="dec-ux-verdict">
                {lowestScore >= 80 ? (
                  <CheckCircle2 size={17} className="dec-icon-good" aria-hidden="true" />
                ) : (
                  <AlertTriangle size={17} className="dec-icon-warn" aria-hidden="true" />
                )}
                <span>
                  {lowestScore >= 80
                    ? 'Ready to commit with confidence'
                    : `Fix "${weakestLink.name}" first`}
                </span>
              </div>
            </div>

            <div className="dec-ux-presets">
              <span className="dec-preset-label">Try a scenario:</span>
              <div className="dec-preset-btns">
                <button type="button" className="dec-preset-btn" onClick={() => handlePreset('fragile')}>
                  Stalled (35%)
                </button>
                <button type="button" className="dec-preset-btn" onClick={() => handlePreset('typical')}>
                  Typical (55%)
                </button>
                <button type="button" className="dec-preset-btn" onClick={() => handlePreset('rigorous')}>
                  Ready (90%)
                </button>
              </div>
            </div>

            <div className="dec-ux-preview-box">
              <div className="dec-ux-preview-tabs" role="tablist" aria-label="Decision check views">
                <button
                  type="button"
                  role="tab"
                  aria-selected={previewMode === 'audit'}
                  className={`dec-sim-btn ${previewMode === 'audit' ? 'is-active' : ''}`}
                  onClick={() => setPreviewMode('audit')}
                >
                  <SlidersHorizontal size={13} aria-hidden="true" /> Weakest Link
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={previewMode === 'margin'}
                  className={`dec-sim-btn ${previewMode === 'margin' ? 'is-active' : ''}`}
                  onClick={() => setPreviewMode('margin')}
                >
                  Option Margin
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={previewMode === 'expected-value'}
                  className={`dec-sim-btn ${previewMode === 'expected-value' ? 'is-active' : ''}`}
                  onClick={() => setPreviewMode('expected-value')}
                >
                  Expected Value
                </button>
              </div>
              <p className="dec-ux-preview-text">{previewCopy}</p>
            </div>
          </aside>
        </div>
      ) : (
        <div className="dec-authority-stage">
          <div className="dec-auth-toggle-bar">
            <span className="dec-auth-toggle-label">How calls are routed:</span>
            <div className="dec-toggle-switch">
              <button
                type="button"
                className={`dec-switch-option ${operatingModel === 'centralized' ? 'is-active' : ''}`}
                onClick={() => setOperatingModel('centralized')}
              >
                Centralized Bottleneck
              </button>
              <button
                type="button"
                className={`dec-switch-option ${operatingModel === 'decentralized' ? 'is-active' : ''}`}
                onClick={() => setOperatingModel('decentralized')}
              >
                Clear Team Ownership
              </button>
            </div>
          </div>

          <div className="dec-auth-comparison-grid">
            <div className="dec-auth-card">
              <span className="dec-auth-card-eyebrow">Time to Decision</span>
              <div className="dec-metric-display">
                <span className={`dec-big-metric ${operatingModel === 'decentralized' ? 'is-good' : 'is-bad'}`}>
                  {operatingModel === 'decentralized' ? '4.2 Hours' : '18.6 Days'}
                </span>
                <span className="dec-metric-change">
                  {operatingModel === 'decentralized'
                    ? '91% less waiting for sign-off'
                    : 'Work stuck in approval queues'}
                </span>
              </div>
              <p className="dec-metric-explainer">
                {operatingModel === 'decentralized'
                  ? 'Your team makes the call inside clear limits instead of waiting weeks for a review.'
                  : 'Every choice escalates through multiple committees and loses context along the way.'}
              </p>
            </div>

            <div className="dec-auth-card">
              <span className="dec-auth-card-eyebrow">Pending Backlog</span>
              <div className="dec-metric-display">
                <span className={`dec-big-metric ${operatingModel === 'decentralized' ? 'is-good' : 'is-bad'}`}>
                  {operatingModel === 'decentralized' ? '2 Pending' : '34 Overdue'}
                </span>
                <span className="dec-metric-change">
                  {operatingModel === 'decentralized'
                    ? 'Every call has one clear owner'
                    : 'Unclear approvals and stalled work'}
                </span>
              </div>
              <p className="dec-metric-explainer">
                {operatingModel === 'decentralized'
                  ? 'One person owns the outcome and one approves—so nothing sits orphaned.'
                  : 'Too many people hold informal veto power without clear criteria.'}
              </p>
            </div>

            <div className="dec-auth-card">
              <span className="dec-auth-card-eyebrow">Team Adaptability</span>
              <div className="dec-metric-display">
                <span className={`dec-big-metric ${operatingModel === 'decentralized' ? 'is-good' : 'is-bad'}`}>
                  {operatingModel === 'decentralized' ? 'High' : 'Low'}
                </span>
                <span className="dec-metric-change">
                  {operatingModel === 'decentralized'
                    ? 'Teams respond as conditions change'
                    : 'Slow to react when markets shift'}
                </span>
              </div>
              <p className="dec-metric-explainer">
                {operatingModel === 'decentralized'
                  ? 'Expertise reaches the decision maker immediately without extra meetings.'
                  : 'People spend more time preparing status decks than acting on new facts.'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
