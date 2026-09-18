import { useEffect, useState } from 'react';
import { api } from '../../../api';

export type Assessment = { skill: string; score: number; method: string; createdAt: string };
export type Credential = {
  type: string;
  title: string;
  issuer: string;
  verificationStatus: string;
  issuedAt: string | null;
  expiresAt: string | null;
};
export type TalentSummary = {
  headline: string;
  skills: string[];
  experienceYears: number | null;
  availability: string | null;
  vettingStatus: string;
  domains: string[];
  functions: string[];
  industries: string[];
  assessments: Assessment[];
  credentials: Credential[];
};
export type Member = { userId: string; name: string; email: string; role: string; talent: TalentSummary | null };
export type Team = { id: string; name: string; description: string; leadName: string; members: { userId: string; name: string; role: string }[] };
export type CapabilityReview = { id: string; question: string; response: string; createdAt: string };
export type PeopleOverview = { roster: Member[]; teams: Team[]; recentCapabilityReviews: CapabilityReview[] };

export function usePeoplePage() {
  const [data, setData] = useState<PeopleOverview | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api<PeopleOverview>('/people/overview', undefined, 'GET')
      .then(setData)
      .catch((e) => setError((e as Error).message));
  }, []);

  return { data, error };
}
