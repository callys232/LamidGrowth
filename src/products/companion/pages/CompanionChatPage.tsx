import { useEffect, useState } from 'react';
import { Bot } from 'lucide-react';
import { api } from '../../../api';
import { Button } from '../../../shared/ui/Button';
import { Field } from '../../../shared/ui/Field';
import { documentAgentIds, useCompanionChat, type AgentManifest } from '../hooks/useCompanionChat';
import { CompanionTasks } from '../components/CompanionTasks';

const gateLabel: Record<AgentManifest['humanGate'], string> = {
  none: 'Observes only',
  confirm: 'Needs confirmation',
  approve: 'Needs your approval',
};

// A small curated shortlist for one-tap access, not the full 20-agent roster — the same reasoning
// as LamidOne's AssistantWidget agent-switcher pills. The full set stays reachable through the
// "Specialist" dropdown below for anyone who wants a specific, less-common agent.
const QUICK_PICK_IDS = [
  'context-curator',
  'diagnostic-intelligence',
  'capability-mapper',
  'proposal-drafter',
  'workflow-orchestration',
];

/** /os/companion/chat — the multi-agent Companion chat surface. */
export function CompanionChatPage() {
  const [agents, setAgents] = useState<AgentManifest[]>([]);
  useEffect(() => {
    api<AgentManifest[]>('/companion/agents', undefined, 'GET')
      .then(setAgents)
      .catch(() => {});
  }, []);
  const chat = useCompanionChat(agents);

  return (
    <section className="companion-chat">
      <header>
        <h1>What are you working through?</h1>
        <p>
          Tell me what's on your mind — I'll bring in the right specialist, or you can pick one
          yourself.
        </p>
      </header>

      {agents.length > 0 && (
        <details className="companion-chat-roster">
          <summary>Who can help ({agents.length} specialists)</summary>
          <ul>
            {agents.map((agent) => (
              <li key={agent.id}>
                <strong>{agent.name}</strong> — {gateLabel[agent.humanGate]} · {agent.pointsCost}{' '}
                point{agent.pointsCost === 1 ? '' : 's'}
              </li>
            ))}
          </ul>
        </details>
      )}

      <CompanionTasks />
      <ol className="companion-chat-turns" aria-live="polite">
        {chat.turns.map((turn, index) => {
          const manifest = agents.find((agent) => agent.id === turn.agentId);
          return (
            <li key={index} className={`companion-chat-turn companion-chat-turn-${turn.role}`}>
              {turn.role === 'agent' && (
                <span className="companion-chat-avatar" aria-hidden="true">
                  <Bot size={13} strokeWidth={2.25} />
                </span>
              )}
              <div className="companion-chat-bubble">
                {turn.role === 'agent' && manifest && (
                  <div className="companion-chat-attribution">
                    <strong>{manifest.name}</strong>
                    <span className={`companion-chat-gate companion-chat-gate-${turn.humanGate}`}>
                      {gateLabel[turn.humanGate ?? 'none']}
                    </span>
                    {typeof turn.pointsCharged === 'number' && (
                      <span className="companion-chat-cost">
                        {turn.pointsCharged} point{turn.pointsCharged === 1 ? '' : 's'} · balance{' '}
                        {turn.balance}
                      </span>
                    )}
                  </div>
                )}
                <p>{turn.text}</p>
                {turn.role === 'agent' && turn.humanHandoffRequested && (
                  <p className="companion-chat-handoff-note">
                    This also went to a qualified human expert for review — you'll see it move in
                    your project's handoff list.
                  </p>
                )}
                {turn.role === 'agent' &&
                  turn.runId &&
                  turn.agentId &&
                  documentAgentIds.has(turn.agentId) && (
                    <div className="companion-chat-document-actions">
                      <a
                        className="companion-chat-download"
                        href={`/api/agent-runs/${turn.runId}/pdf`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Download PDF
                      </a>
                      {(turn.signedBy?.length ?? 0) === 0 ? (
                        <Button
                          type="button"
                          onClick={() => {
                            const signerName = window.prompt(
                              'Type your full legal name to sign (in-app attestation, not a qualified e-signature):',
                            );
                            if (signerName?.trim()) void chat.sign(turn.runId!, signerName.trim());
                          }}
                        >
                          Sign this document
                        </Button>
                      ) : (
                        <span className="companion-chat-signed">
                          Signed by {turn.signedBy!.join(', ')}
                        </span>
                      )}
                    </div>
                  )}
                <span className="companion-chat-time">{turn.at}</span>
              </div>
            </li>
          );
        })}
        {chat.busy && (
          <li className="companion-chat-turn companion-chat-turn-agent companion-chat-pending">
            <span className="companion-chat-avatar" aria-hidden="true">
              <Bot size={13} strokeWidth={2.25} />
            </span>
            <div className="companion-chat-bubble">
              <span className="companion-chat-dots" aria-hidden="true">
                <span />
                <span />
                <span />
              </span>
              <span className="sr-only">Thinking…</span>
            </div>
          </li>
        )}
      </ol>

      {chat.error && <p className="companion-chat-error">{chat.error}</p>}

      <form
        className="companion-chat-composer"
        onSubmit={(event) => {
          event.preventDefault();
          void chat.send();
        }}
      >
        {agents.length > 0 && (
          <div
            className="companion-chat-quick-pick"
            role="group"
            aria-label="Quick pick a specialist"
          >
            <button
              type="button"
              className={chat.agentId === 'auto' ? 'is-active' : ''}
              disabled={chat.busy}
              onClick={() => chat.setAgentId('auto')}
            >
              Auto
            </button>
            {QUICK_PICK_IDS.filter((id) => agents.some((agent) => agent.id === id)).map((id) => (
              <button
                key={id}
                type="button"
                className={chat.agentId === id ? 'is-active' : ''}
                disabled={chat.busy}
                onClick={() => chat.setAgentId(id)}
              >
                {agents.find((agent) => agent.id === id)!.name}
              </button>
            ))}
          </div>
        )}
        <Field label="Specialist">
          <select
            value={chat.agentId}
            onChange={(event) => chat.setAgentId(event.target.value)}
            disabled={chat.busy}
          >
            <option value="auto">Auto — choose from my message and context</option>
            {agents.map((agent) => (
              <option key={agent.id} value={agent.id}>
                {agent.name} · {agent.pointsCost} points
              </option>
            ))}
          </select>
        </Field>
        <Field
          label="Your message"
          hint="Try a question, a diagnostic request, or a workflow command."
        >
          <textarea
            value={chat.draft}
            onChange={(event) => chat.setDraft(event.target.value)}
            placeholder="What are you trying to move forward?"
            rows={3}
            disabled={chat.busy}
          />
        </Field>
        <label className="checkbox-field">
          <input
            type="checkbox"
            checked={chat.consent}
            onChange={(event) => chat.setConsent(event.target.checked)}
            disabled={chat.busy}
          />
          Allow this request to share relevant workspace context with external AI, if enabled in
          workspace settings.
        </label>
        <Button type="submit" disabled={chat.busy || !chat.draft.trim()}>
          Send
        </Button>
      </form>
    </section>
  );
}
