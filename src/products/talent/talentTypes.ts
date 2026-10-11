/** Shapes of talent endpoints surfaced in Phase 4 (src/app/app.mjs, expertWatches.mjs,
 * reputation.mjs, talent.mjs). */
export type Bid = {
  id: string;
  job_id: string;
  freelancer_user_id: string;
  cover_letter: string;
  proposed_amount: number;
  currency: string;
  timeline: string;
  status: string;
  created_at: number;
  /** Joined from job_posts by GET /bids/mine. */
  job_title: string;
  job_status: string;
};
export type JobWatch = { id: string; categories: string[]; keywords: string; createdAt: string };
export type WatchMatch = {
  id: string;
  jobId: string;
  title: string;
  category: string;
  budgetMin: number;
  budgetMax: number;
  currency: string;
  matchedAt: string;
  seen: boolean;
};
export type Reputation = {
  userId: string;
  reviewCount: number;
  averageRating: number | null;
  completedMilestones: number;
};
export type ScreeningResult = {
  bidId: string;
  freelancerUserId: string;
  bidScore: {
    total: number;
    breakdown: { budgetFit: number; currencyMatch: number; relevance: number; timeline: number };
  };
  assessmentAvg: number;
  vettingStatus: string;
  completedMilestones: number;
  blendedTotal: number;
};
