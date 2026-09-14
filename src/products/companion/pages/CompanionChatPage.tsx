import { useEffect, useState } from 'react';
import { api } from '../../../api';
import { Button } from '../../../shared/ui/Button';
import { Field } from '../../../shared/ui/Field';
import { documentAgentIds, useCompanionChat, type AgentManifest } from '../hooks/useCompanionChat';

const gateLabel: Record<AgentManifest['humanGate'], string> = {
  none: 'Observes only',
  confirm: 'Needs confirmation',
  approve: 'Needs your approval',
};

/** /os/companion/chat — the multi-agent Companion chat surface. */
export function CompanionChatPage() {
  const [agents, setAgents] = useState<AgentManifest[]>([]);
  useEffect(() => {
    api<AgentManifest[]>('/companion/agents', undefined, 'GET').then(setAgents).catch(() => {});
  }, []);
  const chat = useCompanionChat(agents);

  return (
    <section className="companion-chat">
      <header>
        <h1>What are you working through?</h1>
        <p>
          Describe a decision, challenge, or opportunity. Each answer shows which agent responded
          and whether it may only observe or must wait for your approval before it changes
          anything.
        </p>
      </header>

      {agents.length > 0 && (
        <ul className="companion-chat-roster">
          {agents.map((agent) => (
            <li key={agent.id}>
              <strong>{agent.name}</strong> — {gateLabel[agent.humanGate]} ·{' '}
              {agent.pointsCost} point{agent.pointsCost === 1 ? '' : 's'}
            </li>
          ))}
        </ul>
      )}

      <ol className="companion-chat-turns">
        {chat.turns.map((turn, index) => {
          const manifest = agents.find((agent) => agent.id === turn.agentId);
          return (
            <li key={index} className={`companion-chat-turn companion-chat-turn-${turn.role}`}>
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
              {turn.role === 'agent' && turn.runId && turn.agentId && documentAgentIds.has(turn.agentId) && (
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
                        const signerName = window.prompt('Type your full legal name to sign (in-app attestation, not a qualified e-signature):');
                        if (signerName?.trim()) void chat.sign(turn.runId!, signerName.trim());
                      }}
                    >
                      Sign this document
                    </Button>
                  ) : (
                    <span className="companion-chat-signed">Signed by {turn.signedBy!.join(', ')}</span>
                  )}
                </div>
              )}
            </li>
          );
        })}
        {chat.busy && (
          <li className="companion-chat-turn companion-chat-turn-agent companion-chat-pending">
            <p>Thinking…</p>
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
        <Field label="Your message" hint="Try a question, a diagnostic request, or a workflow command.">
          <textarea
            value={chat.draft}
            onChange={(event) => chat.setDraft(event.target.value)}
            placeholder="What are you trying to move forward?"
            rows={3}
            disabled={chat.busy}
          />
        </Field>
        <Button type="submit" disabled={chat.busy || !chat.draft.trim()}>
          Send
        </Button>
      </form>
    </section>
  );
}
