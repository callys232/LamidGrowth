import { useEffect, useRef, useState } from 'react';
import { api } from '../../../api';
import { useWorkspace } from '../../workspace/components/WorkspaceShell';

export type AgentManifest = {
  id: string;
  name: string;
  engine: string;
  authorityBand: 'A1' | 'A2' | 'A3';
  humanGate: 'none' | 'confirm' | 'approve';
  pointsCost: number;
};

function timestamp() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export type ChatTurn = {
  role: 'user' | 'agent';
  text: string;
  at: string;
  agentId?: string;
  runId?: string;
  humanGate?: AgentManifest['humanGate'];
  pointsCharged?: number;
  balance?: number;
  evidence?: unknown;
  signedBy?: string[];
  humanHandoffRequested?: boolean;
};

export const documentAgentIds = new Set([
  'proposal-drafter',
  'scope-builder',
  'sow-builder',
  'brief-builder',
  'deliverable-builder',
  'acceptance-builder',
  'change-order',
  'quote-generator',
  'estimate-generator',
  'invoice-generator',
]);

type CompanionResponse = {
  runId: string;
  agentId: string;
  response: string;
  pointsCharged: number;
  balance: number;
  toolCalls: Array<{ toolId: string; input: unknown }>;
  evidence: unknown;
  humanHandoffRequested?: boolean;
  handoffId?: string;
};

export function useCompanionChat(agents: AgentManifest[]) {
  const workspace = useWorkspace();
  const notify = workspace?.notify ?? (() => {});
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [consent, setConsent] = useState(false);
  const [agentId, setAgentId] = useState('auto');
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    setLoading(true);
    api<
      Array<{
        runId: string;
        agentId: string;
        input: { message: string };
        output: { response?: string; error?: string };
        status: string;
      }>
    >('/companion/history')
      .then((rows) => {
        if (active)
          setTurns(
            rows.flatMap((row) => [
              { role: 'user' as const, text: row.input.message, at: timestamp() },
              {
                role: 'agent' as const,
                text: row.output?.response || row.output?.error || `Request ${row.status}`,
                at: timestamp(),
                agentId: row.agentId,
                runId: row.status === 'completed' ? row.runId : undefined,
              },
            ]),
          );
      })
      .catch((e) => {
        if (active) setError((e as Error).message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [workspace?.state.workspace.id]);
  const pending = useRef<{
    message: string;
    consent: boolean;
    agentId: string;
    key: string;
  } | null>(null);

  async function send() {
    const message = draft.trim();
    if (!message || busy || loading) return;
    setDraft('');
    setError('');
    setTurns((prev) => [...prev, { role: 'user', text: message, at: timestamp() }]);
    setBusy(true);
    try {
      if (
        !pending.current ||
        pending.current.message !== message ||
        pending.current.consent !== consent ||
        pending.current.agentId !== agentId
      )
        pending.current = { message, consent, agentId, key: crypto.randomUUID() };
      const result = await api<CompanionResponse>(
        '/companion/messages',
        { message, consent, agentId, page: window.location.pathname },
        'POST',
        pending.current.key,
      );
      pending.current = null;
      const manifest = agents.find((agent) => agent.id === result.agentId);
      setTurns((prev) => [
        ...prev,
        {
          role: 'agent',
          text: result.response,
          at: timestamp(),
          agentId: result.agentId,
          runId: result.runId,
          humanGate: manifest?.humanGate,
          pointsCharged: result.pointsCharged,
          balance: result.balance,
          evidence: result.evidence,
          signedBy: [],
          humanHandoffRequested: result.humanHandoffRequested,
        },
      ]);
      if (manifest?.humanGate && manifest.humanGate !== 'none')
        notify('This agent may propose changes that still require your approval.');
      if (result.humanHandoffRequested)
        notify('This also went to a qualified human expert for review.');
    } catch (e) {
      setDraft(message);
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function sign(runId: string, signerName: string) {
    await api(`/agent-runs/${runId}/signatures`, { signerName });
    setTurns((prev) =>
      prev.map((turn) =>
        turn.runId === runId ? { ...turn, signedBy: [...(turn.signedBy ?? []), signerName] } : turn,
      ),
    );
  }

  return {
    turns,
    draft,
    setDraft,
    busy: busy || loading,
    error,
    send,
    sign,
    consent,
    setConsent,
    agentId,
    setAgentId,
  };
}
