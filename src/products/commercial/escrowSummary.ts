import type { Milestone, MilestoneFunding } from './hooks/useProjectsPage';

/** Shapes of GET /api/workspace/escrow-summary (src/app/payments.mjs). */
export type SummaryTransfer = {
  id: string;
  status: string;
  amount_minor: number;
  currency: string;
  failure_reason: string | null;
  created_at: string;
};
export type SummaryMilestone = Pick<
  Milestone,
  'id' | 'project_id' | 'title' | 'description' | 'amount' | 'currency' | 'status'
> & {
  created_at?: string;
  /** Latest funding; null when unfunded or when the viewer is only a team member. */
  funding: MilestoneFunding | null;
  transfers: SummaryTransfer[];
};
export type SummaryProject = {
  id: string;
  title: string;
  status: string;
  created_at?: string;
  isClient: boolean;
  isFreelancer: boolean;
  isTeamMember: boolean;
  milestones: SummaryMilestone[];
};
export type EscrowSummary = { projects: SummaryProject[] };
