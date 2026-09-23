import { useState } from 'react';
import { Button } from '../../../shared/ui/Button';
import type { DecisionQualityQuestion, DecisionQualityRequirement } from '../hooks/useEngineRun';
import './engine-forms.css';

/** Q44 — the fixed, anchored question bank behind decision quality. Every question is answered
 * against a concrete, observable state (not a self-rated abstraction) — see the requirement
 * groupings from src/app/engineIntelligence/decisionQuality.mjs. */
export function DecisionQualityForm({
  requirements,
  questions,
  onSubmit,
  submitting,
}: {
  requirements: DecisionQualityRequirement[];
  questions: DecisionQualityQuestion[];
  onSubmit: (input: {
    answers: Record<string, number>;
    consequence: string;
    reversibility: string;
  }) => void;
  submitting: boolean;
}) {
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [consequence, setConsequence] = useState('moderate');
  const [reversibility, setReversibility] = useState('costly');

  const answeredCount = Object.keys(answers).length;

  return (
    <form
      className="engine-form"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({ answers, consequence, reversibility });
      }}
    >
      <div className="engine-form-row engine-form-row-inline">
        <label>
          Consequence if this goes wrong
          <select value={consequence} onChange={(e) => setConsequence(e.target.value)}>
            <option value="low">Low</option>
            <option value="moderate">Moderate</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        </label>
        <label>
          Reversibility
          <select value={reversibility} onChange={(e) => setReversibility(e.target.value)}>
            <option value="easy">Easy to reverse</option>
            <option value="costly">Costly to reverse</option>
            <option value="irreversible">Irreversible</option>
          </select>
        </label>
      </div>

      {requirements.map((req) => (
        <fieldset key={req.id} className="engine-form-row">
          <legend>{req.label}</legend>
          <p className="engine-form-hint">{req.what}</p>
          {questions
            .filter((q) => q.requirement === req.id)
            .map((q) => (
              <label key={q.id}>
                {q.prompt}
                <select
                  value={answers[q.id] ?? ''}
                  onChange={(e) =>
                    setAnswers((prev) => ({ ...prev, [q.id]: Number(e.target.value) }))
                  }
                >
                  <option value="" disabled>
                    Select the closest state…
                  </option>
                  {q.options.map((o) => (
                    <option key={o.label} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
            ))}
        </fieldset>
      ))}

      <Button type="submit" disabled={submitting || answeredCount === 0}>
        {submitting ? 'Running…' : 'Run diagnostic'}
      </Button>
      {answeredCount === 0 && (
        <p className="engine-form-hint">Answer at least one question above.</p>
      )}
      {answeredCount > 0 && answeredCount < questions.length && (
        <p className="engine-form-hint">
          {answeredCount} of {questions.length} answered — unanswered questions count as zero (see
          the header note on why).
        </p>
      )}
    </form>
  );
}
