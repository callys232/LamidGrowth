import type { ZodType } from 'zod';
import type { Context, WorkspaceState } from '../types';

export declare const workspaceContextSchema: ZodType<Context>;
export declare const objectiveSchema: ZodType<{
  title: string;
  description: string;
  context: Context;
  priority: 'High' | 'Medium' | 'Low';
  status: 'Active' | 'Paused' | 'Complete';
  targetDate: string;
  constraints: string;
  success: string;
}>;
export declare const actionSchema: ZodType<{
  title: string;
  objectiveId: string;
  status: 'Planned' | 'In progress' | 'Needs review' | 'Done' | 'Paused';
  dueDate: string;
  owner: string;
  requiresApproval: boolean;
  notes: string;
}>;
export declare const reviewSchema: ZodType<{
  progressed: string;
  learned: string;
  next: string;
}>;
export declare const workspaceStateSchema: ZodType<WorkspaceState>;
