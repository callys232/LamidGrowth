import { useState } from 'react';
import { Button } from '../../../shared/ui/Button';
import type { AnchoredSection } from '../hooks/useEngineRun';
import './engine-forms.css';
import './schema-form.css';

type Answer = { level: string; evidence: string };

/** A standards questionnaire: every question shows what the bottom and the top of the scale look
 * like, so a rating means the same to everyone. Unanswered questions are left out of the score,
 * and answers without evidence count for less (see toolCatalog/anchored.mjs). */
export function AnchoredForm({
  toolKey,
  sections,
  levels,
  evidence,
  example,
  onSubmit,
  submitting,
}: {
  toolKey: string;
  sections: AnchoredSection[];
  levels: { value: number; label: string }[];
  evidence: { value: number; label: string }[];
  example?: Record<string, unknown> | null;
  onSubmit: (input: Record<string, unknown>) => void;
  submitting: boolean;
}) {
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [usingExample, setUsingExample] = useState(false);
  const set = (id: string, patch: Partial<Answer>) =>
    setAnswers((a) => ({ ...a, [id]: { ...(a[id] ?? { level: '', evidence: '0' }), ...patch } }));
  const answered = Object.values(answers).filter((a) => a.level !== '').length;
  const total = sections.reduce((n, s) => n + s.questions.length, 0);

  function loadExample() {
    if (usingExample) {
      setAnswers({});
    } else {
      const src = (example?.answers ?? {}) as Record<string, { level: number; evidence: number }>;
      setAnswers(
        Object.fromEntries(
          Object.entries(src).map(([k, v]) => [
            k,
            { level: String(v.level), evidence: String(v.evidence ?? 0) },
          ]),
        ),
      );
    }
    setUsingExample(!usingExample);
  }

  return (
    <form
      className="engine-form schema-form"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({
          answers: Object.fromEntries(
            Object.entries(answers)
              .filter(([, a]) => a.level !== '')
              .map(([id, a]) => [id, { level: Number(a.level), evidence: Number(a.evidence) }]),
          ),
        });
      }}
    >
      {example && (
        <div className="schema-form-example">
          <span>
            {usingExample
              ? 'Example answers loaded. Replace them with your own before relying on the result.'
              : 'Load example answers to see how the assessment works.'}
          </span>
          <Button variant="secondary" onClick={loadExample}>
            {usingExample ? 'Clear example' : 'Load an example'}
          </Button>
        </div>
      )}

      {sections.map((s) => (
        <fieldset key={s.id} className="engine-form-row anchored-section">
          <legend>{s.label}</legend>
          {s.questions.map((q) => {
            const a = answers[q.id] ?? { level: '', evidence: '0' };
            return (
              <div key={q.id} className="anchored-question">
                <p className="anchored-text">{q.text}</p>
                <div className="anchored-anchors">
                  <span>
                    <b>Low:</b> {q.low}
                  </span>
                  <span>
                    <b>High:</b> {q.high}
                  </span>
                </div>
                <div className="anchored-controls">
                  <label htmlFor={`${toolKey}-${q.id}-level`}>
                    Where you are today
                    <select
                      id={`${toolKey}-${q.id}-level`}
                      value={a.level}
                      onChange={(e) => set(q.id, { level: e.target.value })}
                    >
                      <option value="">Not answered</option>
                      {levels.map((l) => (
                        <option key={l.value} value={l.value}>
                          {l.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label htmlFor={`${toolKey}-${q.id}-evidence`}>
                    Evidence
                    <select
                      id={`${toolKey}-${q.id}-evidence`}
                      value={a.evidence}
                      disabled={a.level === ''}
                      onChange={(e) => set(q.id, { evidence: e.target.value })}
                    >
                      {evidence.map((l) => (
                        <option key={l.value} value={l.value}>
                          {l.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>
            );
          })}
        </fieldset>
      ))}

      <Button type="submit" disabled={submitting || answered === 0}>
        {submitting ? 'Running…' : `Score ${answered} of ${total} answers`}
      </Button>
      <p className="engine-form-hint">
        Unanswered questions are left out of the score, not counted as zero. Answers without
        evidence count for less.
      </p>
    </form>
  );
}
