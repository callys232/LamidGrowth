export type Context =
  | 'Individual'
  | 'Professional'
  | 'Creator'
  | 'Founder'
  | 'Team'
  | 'SME'
  | 'Enterprise'
  | 'Institution';
export type Status = 'Planned' | 'In progress' | 'Needs review' | 'Done' | 'Paused';
export interface Objective {
  id: string;
  title: string;
  description: string;
  context: Context;
  priority: 'High' | 'Medium' | 'Low';
  status: 'Active' | 'Paused' | 'Complete';
  targetDate: string;
  constraints: string;
  success: string;
  version: number;
  createdAt: string;
}
export interface Action {
  pathwayOrder?: number;
  id: string;
  title: string;
  objectiveId: string;
  status: Status;
  dueDate: string;
  owner: string;
  requiresApproval: boolean;
  notes: string;
  version: number;
  createdAt: string;
}
export interface Review {
  id: string;
  progressed: string;
  learned: string;
  next: string;
  createdAt: string;
}
export interface AuditEvent {
  id: string;
  actor: string;
  action: string;
  objectId: string;
  detail: string;
  createdAt: string;
}
export interface WorkspaceState {
  user: { id: string; name: string; email: string | null; demo: boolean };
  workspace: {
    id: string;
    name: string;
    context: Context;
    tier: string;
    member_limit: number;
    role: 'owner' | 'member' | 'concierge';
  };
  permissions: string[];
  workspaces: Array<{
    id: string;
    name: string;
    context: Context;
    tier: string;
    member_limit: number;
    role: string;
    status: string;
  }>;
  objectives: Objective[];
  actions: Action[];
  reviews: Review[];
  audit: AuditEvent[];
}
