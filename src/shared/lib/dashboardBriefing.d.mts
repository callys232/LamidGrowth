import type { Action, Objective } from '../../types';
export type AttentionItem = {
  id: string;
  kind: 'action' | 'objective';
  title: string;
  reasons: string[];
  date: string;
  rank: number;
};
export function attentionItems(
  objectives: Objective[],
  actions: Action[],
  today: string,
): AttentionItem[];
export function changedActions(
  actions: Action[],
  previous: Record<string, string> | null,
): { completed: Action[]; reviews: Action[] };
