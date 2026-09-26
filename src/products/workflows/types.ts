export interface Step {
  id: string;
  toolId: string;
  state: string;
  attempts: number;
  input: { title?: string; notes?: string; message?: string; correlationKey?: string };
  output: {
    observedAt: string;
    result: { completed?: number; total?: number; action?: { title: string } };
  } | null;
}
export interface Run {
  id: string;
  title: string;
  state: string;
  version: number;
  objective_id: string;
  steps: Step[];
  reason: string;
  start_at: number;
  expires_at: number;
}
export const labels: Record<string, string> = {
  'context.snapshot': 'Review objective context',
  'capability.review': 'Review capability requirements',
  'action.prepare': 'Prepare a next action',
  'progress.snapshot': 'Record progress evidence',
  'review.reminder': 'Create a review reminder',
  'event.wait': 'Wait for an external event',
};
