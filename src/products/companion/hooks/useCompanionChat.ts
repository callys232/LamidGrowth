import { useState } from 'react';
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

export type ChatTurn = {
  role: 'user' | 'agent';
  text: string;
  agentId?: string;
  runId?: string;
  humanGate?: AgentManifest['humanGate'];
  pointsCharged?: number;
  balance?: number;
  evidence?: unknown;
  signedBy?: string[];
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
};

export function useCompanionChat(agents: AgentManifest[]) {
  const { notify } = useWorkspace();
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function send() {
    const message = draft.trim();
    if (!message || busy) return;
    setDraft('');
    setError('');
    setTurns((prev) => [...prev, { role: 'user', text: message }]);
    setBusy(true);
    try {
      const result = await api<CompanionResponse>('/companion/messages', { message });
      const manifest = agents.find((agent) => agent.id === result.agentId);
      setTurns((prev) => [
        ...prev,
        {
          role: 'agent',
          text: result.response,
          agentId: result.agentId,
          runId: result.runId,
          humanGate: manifest?.humanGate,
          pointsCharged: result.pointsCharged,
          balance: result.balance,
          evidence: result.evidence,
          signedBy: [],
        },
      ]);
      if (manifest?.humanGate && manifest.humanGate !== 'none')
        notify('This agent may propose changes that still require your approval.');
    } catch (e) {
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

  return { turns, draft, setDraft, busy, error, send, sign };
}
