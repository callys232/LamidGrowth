export interface Policy {
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
