import type { Snapshot } from './types';

export type TrendPoint = { id: string; at: string; completed: number; total: number; pct: number };
export type Trend = {
  objectiveId: string;
  points: TrendPoint[];
  /** Latest recorded completion, 0–100. */
  current: number;
  /** Percentage points gained since the first recorded snapshot. */
  change: number;
};

const pct = (completed: number, total: number) =>
  total > 0 ? Math.round((completed / total) * 100) : 0;

/** Recorded progress per objective, oldest snapshot first, in first-seen objective order. */
export function progressTrends(snapshots: Snapshot[]): Trend[] {
  const byObjective = new Map<string, TrendPoint[]>();
  for (const s of snapshots) {
    const list = byObjective.get(s.objectiveId) ?? [];
    list.push({
      id: s.id,
      at: s.createdAt,
      completed: s.completed,
      total: s.total,
      pct: pct(s.completed, s.total),
    });
    byObjective.set(s.objectiveId, list);
  }
  return [...byObjective.entries()].map(([objectiveId, points]) => {
    const ordered = [...points].sort((a, b) => a.at.localeCompare(b.at));
    const current = ordered.at(-1)?.pct ?? 0;
    return { objectiveId, points: ordered, current, change: current - (ordered[0]?.pct ?? 0) };
  });
}
