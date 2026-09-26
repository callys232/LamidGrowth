import { useEffect, useState } from 'react';
import { api } from '../../../api';

type Execution = {
  id: string;
  use_case: string;
  provider: string | null;
  model: string | null;
  executed_at: string;
};

/** F-AI-01: real provenance of what provider/model actually executed, not just what's approved —
 * shown only in the settings view, since this is governance/audit content. */
export function IntelligenceModelExecutionsSlide({ settings }: { settings?: boolean }) {
  const [executions, setExecutions] = useState<Execution[]>([]);
  useEffect(() => {
    if (!settings) return;
    api<Execution[]>('/models/executions', undefined, 'GET')
      .then(setExecutions)
      .catch(() => {});
  }, [settings]);
  if (!settings || executions.length === 0) return null;
  return (
    <section className="panel settings-card">
      <h3>Recent model executions</h3>
      <p>What actually ran under each use case's approval — real provenance, not just configuration.</p>
      <ol className="activity-feed-list">
        {executions.slice(0, 20).map((execution) => (
          <li key={execution.id} className="activity-feed-row">
            <span className="activity-feed-title">
              <strong>{execution.use_case}</strong> — {execution.provider ?? 'unknown'} / {execution.model ?? 'unknown'}
            </span>
            <small>{new Date(execution.executed_at).toLocaleString()}</small>
          </li>
        ))}
      </ol>
    </section>
  );
}
