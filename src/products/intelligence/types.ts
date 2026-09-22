export interface Policy {
  rules: {
    pathways: boolean;
    reviews: boolean;
    specialists: boolean;
    documents: boolean;
    deliverableReviews: boolean;
    workflowCommands: boolean;
    humanHandoffs: boolean;
    allowedSources: string[];
    maxPointsPerRequest: number;
    instructions: string;
    changes: Record<
      'action.prepare' | 'progress.snapshot' | 'review.reminder',
      'block' | 'ask' | 'allow'
    >;
  };
  configured: boolean;
  enabled: boolean;
  dailyLimit: number;
  version: number;
  provider: string | null;
  model: string | null;
  reviewCost: number;
  accountEligible: boolean;
}
export interface Review {
  id: string;
  principalId: string;
  objectiveId: string;
  question: string;
  status: string;
  model: string;
  createdAt: string;
  review?: {
    summary: string;
    assumptions: string[];
    suggestions: { title: string; rationale: string }[];
    evidenceIds: string[];
  };
  sources: { id: string; version: number; kind: string }[];
}
