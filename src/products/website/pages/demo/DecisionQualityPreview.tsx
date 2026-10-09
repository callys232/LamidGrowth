import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, m, useInView, useReducedMotion } from 'motion/react';
import sample from './decisionQualitySample.json';

/** The /demo hero "video": a looping, code-driven walkthrough of Decision Quality — answer, run,
 * result. The result is a real engine output for the saved sample input (pinned by
 * tests/demoDecisionQualitySample.test.mjs), so nothing on screen is a mock-up. Pauses while
 * off-screen; with reduced motion it simply shows the finished dashboard. */
type Phase = 'answering' | 'running' | 'result';

const QUESTION_COUNT = Object.keys(sample.input.answers).length;
const PER_REQUIREMENT: Record<string, number> = {};
for (const id of Object.keys(sample.input.answers)) {
  const req = id.startsWith('alt_')
    ? 'alternatives'
    : id.startsWith('info_')
      ? 'information'
      : id.startsWith('reason_')
        ? 'reasoning'
        : id.startsWith('commit_')
          ? 'commitment'
          : id.split('_')[0];
  PER_REQUIREMENT[req] = (PER_REQUIREMENT[req] ?? 0) + 1;
}

const TICK_MS = 170;
const RUNNING_MS = 1100;
const RESULT_MS = 6500;

const { result } = sample;
const weakest = result.requirements.reduce((a, b) => (b.scorePct < a.scorePct ? b : a));

export function DecisionQualityPreview() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.3 });
  const reduced = useReducedMotion();
  const [phase, setPhase] = useState<Phase>(reduced ? 'result' : 'answering');
  const [answered, setAnswered] = useState(0);

  useEffect(() => {
    if (reduced) {
      setPhase('result');
      return;
    }
    if (!inView) return;
    let timer: ReturnType<typeof setTimeout>;
    if (phase === 'answering') {
      timer =
        answered < QUESTION_COUNT
          ? setTimeout(() => setAnswered((n) => n + 1), TICK_MS)
          : setTimeout(() => setPhase('running'), 500);
    } else if (phase === 'running') {
      timer = setTimeout(() => setPhase('result'), RUNNING_MS);
    } else {
      timer = setTimeout(() => {
        setAnswered(0);
        setPhase('answering');
      }, RESULT_MS);
    }
    return () => clearTimeout(timer);
  }, [phase, answered, inView, reduced]);

  return (
    <div
      ref={ref}
      className="dq-preview"
      role="img"
      aria-label={`Decision Quality example: "${sample.decision}" scores ${result.overallPct}% against a required ${result.requiredPct}%. Weakest link: ${weakest.label}.`}
    >
      <div className="dq-preview-chrome" aria-hidden="true">
        <span />
        <span />
        <span />
        <strong>Decision Quality</strong>
        <em>{phase === 'result' ? 'Result' : `${Math.min(answered, QUESTION_COUNT)}/19`}</em>
      </div>

      <div className="dq-preview-body" aria-hidden="true">
        <p className="dq-preview-decision">
          <small>Decision</small>
          {sample.decision}
        </p>

        <AnimatePresence mode="wait" initial={false}>
          {phase === 'answering' && (
            <m.ul
              key="answering"
              className="dq-preview-reqs"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {result.requirements.map((req) => {
                const before = answeredBefore(req.id);
                const total = PER_REQUIREMENT[req.id] ?? 0;
                const done = Math.max(0, Math.min(total, answered - before));
                return (
                  <li key={req.id} className={done === total ? 'is-done' : ''}>
                    <span>{req.label}</span>
                    <span className="dq-preview-dots">
                      {Array.from({ length: total }, (_, i) => (
                        <i key={i} className={i < done ? 'is-on' : ''} />
                      ))}
                    </span>
                  </li>
                );
              })}
            </m.ul>
          )}

          {phase === 'running' && (
            <m.div
              key="running"
              className="dq-preview-running"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <span className="dq-preview-spinner" />
              Scoring 19 answers against 6 requirements…
            </m.div>
          )}

          {phase === 'result' && (
            <m.div
              key="result"
              className="dq-preview-result"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <div className="dq-preview-score">
                <ScoreRing value={result.overallPct} required={result.requiredPct} />
                <div>
                  <span className="dq-preview-verdict">
                    {result.verdict === 'blocked' ? 'Not ready yet' : 'Verdict'}
                  </span>
                  <p>{result.headline}</p>
                </div>
              </div>

              <ul className="dq-preview-bars">
                {result.requirements.map((req, i) => (
                  <li key={req.id} className={req.id === weakest.id ? 'is-weakest' : ''}>
                    <span>{req.label}</span>
                    <span className="dq-preview-track">
                      <m.i
                        initial={{ width: reduced ? `${req.scorePct}%` : 0 }}
                        animate={{ width: `${req.scorePct}%` }}
                        transition={{ duration: 0.6, delay: 0.25 + i * 0.08 }}
                      />
                      <b style={{ left: `${result.requiredPct}%` }} />
                    </span>
                    <span className="dq-preview-pct">{Math.round(req.scorePct)}%</span>
                  </li>
                ))}
              </ul>

              <div className="dq-preview-fix">
                <small>Weakest link · {weakest.label}</small>
                <p>
                  <strong>First fix:</strong> {result.nextAction.remedy}
                </p>
              </div>
            </m.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function answeredBefore(id: string) {
  let n = 0;
  for (const req of result.requirements) {
    if (req.id === id) return n;
    n += PER_REQUIREMENT[req.id] ?? 0;
  }
  return n;
}

function ScoreRing({ value, required }: { value: number; required: number }) {
  const reduced = useReducedMotion();
  const r = 34;
  const c = 2 * Math.PI * r;
  const angle = (required / 100) * 2 * Math.PI - Math.PI / 2;
  return (
    <svg className="dq-preview-ring" viewBox="0 0 84 84" width="84" height="84">
      <circle cx="42" cy="42" r={r} className="dq-ring-track" />
      <m.circle
        cx="42"
        cy="42"
        r={r}
        className="dq-ring-value"
        strokeDasharray={c}
        initial={{ strokeDashoffset: reduced ? c * (1 - value / 100) : c }}
        animate={{ strokeDashoffset: c * (1 - value / 100) }}
        transition={{ duration: 0.9, delay: 0.1 }}
        transform="rotate(-90 42 42)"
      />
      <line
        className="dq-ring-required"
        x1={42 + (r - 7) * Math.cos(angle)}
        y1={42 + (r - 7) * Math.sin(angle)}
        x2={42 + (r + 7) * Math.cos(angle)}
        y2={42 + (r + 7) * Math.sin(angle)}
      />
      <text x="42" y="40" textAnchor="middle" className="dq-ring-num">
        {value}%
      </text>
      <text x="42" y="54" textAnchor="middle" className="dq-ring-req">
        needs {required}%
      </text>
    </svg>
  );
}
