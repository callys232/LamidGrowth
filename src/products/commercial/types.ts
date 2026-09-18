export interface Job {
  id: string;
  title: string;
  category: string;
  project_type: string;
  description: string;
  deliverables: string;
  budget_min: number;
  budget_max: number;
  currency: string;
  timeline: string;
  client_user_id: string;
}
export interface Bid {
  id: string;
  cover_letter: string;
  proposed_amount: number;
  currency: string;
  timeline: string;
  freelancer_user_id: string;
}
export interface Proposal {
  id: string;
  title: string;
  scope: string;
  deliverables: string;
  amount: number;
  currency: string;
  status: string;
  author_user_id: string;
}
export interface Options {
  categories: string[];
  projectTypes: string[];
  jobPostCost: number;
  bidCost: number;
}
