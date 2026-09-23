import { useEffect, useState, type FormEvent } from 'react';
import { api } from '../../../api';
import { useWorkspace } from '../../workspace/components/WorkspaceShell';

export type TalentProfile = {
  id: string;
  headline: string;
  skills: string[];
  experience_years: number | null;
  availability: string | null;
  hourly_rate: number | null;
  currency: string | null;
  location: string | null;
  languages: string[];
  portfolio_url: string | null;
  vetting_status: 'unverified' | 'pending' | 'verified' | 'rejected';
  domains: string[];
  functions: string[];
  industries: string[];
};
export type QuizQuestion = { question: string; options: string[] };
export type AssessmentResult = { skill: string; score: number; passed: boolean; threshold: number };
export type ExpertResult = {
  userId: string;
  headline: string;
  skills: string[];
  domains: string[];
  functions: string[];
  industries: string[];
  hourlyRate: number | null;
  currency: string | null;
  jurisdiction: string | null;
  vettingStatus: string;
  score: number;
  breakdown: Record<string, number>;
};
export type Credential = {
  id: string;
  type: string;
  title: string;
  issuer: string;
  issued_at: string | null;
  expires_at: string | null;
  evidence_url: string | null;
  verification_status: 'unverified' | 'pending' | 'verified' | 'rejected';
  created_at: string;
};
export type Invitation = {
  id: string;
  job_id: string;
  jobTitle?: string;
  message: string;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
};
export type JobMatch = {
  jobId: string;
  title: string;
  category: string;
  budgetMin: number;
  budgetMax: number;
  currency: string;
  score: number;
  breakdown: Record<string, number>;
};
export type AvailabilitySlot = {
  id: string;
  profile_id: string;
  start_at: string;
  end_at: string;
  format: string;
  status: 'open' | 'booked';
  created_at: string;
};
export type Booking = {
  id: string;
  slot_id: string;
  client_user_id: string;
  expert_user_id: string;
  project_id: string | null;
  status: 'confirmed' | 'cancelled';
  notes: string;
  start_at: string;
  end_at: string;
  format: string;
  created_at: string;
};
export type ExpertTeamMember = {
  id: string;
  team_id: string;
  user_id: string;
  role: string;
  access_scope: string;
  created_at: string;
};
export type ExpertTeam = {
  id: string;
  name: string;
  lead_user_id: string;
  description: string;
  created_at: string;
  members: ExpertTeamMember[];
};
export type ReviewQueueEntry = {
  id: string;
  scoping_case_id: string;
  risk_band: 'green' | 'amber' | 'red';
  status: 'pending' | 'claimed' | 'completed';
  objective: string;
  category: string | null;
  jurisdiction: string | null;
  claimed_by: string | null;
  notes: string;
  created_at: string;
};
export type HandoffItem = {
  id: string;
  source: string;
  context_summary: string;
  context_snapshot: string;
  target_user_id: string | null;
  status: 'pending' | 'accepted' | 'declined' | 'completed';
  created_at: string;
};

export function useTalentPage() {
  const { notify } = useWorkspace();
  const [profile, setProfile] = useState<TalentProfile | null>(null);
  const [expertResults, setExpertResults] = useState<ExpertResult[]>([]);
  const [jobMatches, setJobMatches] = useState<JobMatch[]>([]);
  const [quiz, setQuiz] = useState<QuizQuestion[] | null>(null);
  const [quizSkill, setQuizSkill] = useState('');
  const [lastAssessment, setLastAssessment] = useState<AssessmentResult | null>(null);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [availability, setAvailability] = useState<AvailabilitySlot[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [viewingAvailability, setViewingAvailability] = useState<{
    userId: string;
    slots: AvailabilitySlot[];
  } | null>(null);
  const [teams, setTeams] = useState<ExpertTeam[]>([]);
  const [reviewQueue, setReviewQueue] = useState<ReviewQueueEntry[]>([]);
  const [handoffInbox, setHandoffInbox] = useState<HandoffItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api<TalentProfile | null>('/talent/profile/mine', undefined, 'GET')
      .then(setProfile)
      .catch(() => {});
  }, []);

  async function loadCredentials() {
    try {
      setCredentials(await api<Credential[]>('/talent/credentials/mine', undefined, 'GET'));
    } catch (error) {
      setError((error as Error).message);
    }
  }
  useEffect(() => {
    void loadCredentials();
  }, []);

  async function addCredential(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setBusy(true);
    setError('');
    try {
      setCredentials(
        await api<Credential[]>('/talent/credentials', {
          type: data.get('type'),
          title: data.get('title'),
          issuer: data.get('issuer'),
          issuedAt: data.get('issuedAt') || undefined,
          expiresAt: data.get('expiresAt') || undefined,
          evidenceUrl: data.get('evidenceUrl') || undefined,
        }),
      );
      form.reset();
      notify('Credential submitted for verification.');
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function loadInvitations() {
    try {
      setInvitations(await api<Invitation[]>('/talent/invitations/mine', undefined, 'GET'));
    } catch (error) {
      setError((error as Error).message);
    }
  }
  useEffect(() => {
    void loadInvitations();
  }, []);

  async function respondToInvitation(id: string, decision: 'accept' | 'reject') {
    setBusy(true);
    try {
      await api(`/invitations/${id}/respond`, { decision });
      await loadInvitations();
      notify(decision === 'accept' ? 'Invitation accepted.' : 'Invitation declined.');
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function inviteToJob(jobId: string, freelancerUserId: string, message: string) {
    setBusy(true);
    try {
      await api(`/jobs/${jobId}/invitations`, { freelancerUserId, message });
      notify('Invitation sent.');
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setBusy(true);
    setError('');
    try {
      const saved = await api<TalentProfile>('/talent/profile', {
        headline: data.get('headline'),
        skills: String(data.get('skills') || '')
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        experienceYears: data.get('experienceYears')
          ? Number(data.get('experienceYears'))
          : undefined,
        availability: data.get('availability') || undefined,
        hourlyRate: data.get('hourlyRate')
          ? Math.round(Number(data.get('hourlyRate')) * 100)
          : undefined,
        currency: data.get('currency') || undefined,
        location: data.get('location') || undefined,
        languages: String(data.get('languages') || '')
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        portfolioUrl: data.get('portfolioUrl') || undefined,
        domains: String(data.get('domains') || '')
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        functions: String(data.get('functions') || '')
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        industries: String(data.get('industries') || '')
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
      });
      setProfile(saved);
      notify('Talent profile saved.');
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function requestVetting() {
    setBusy(true);
    try {
      const updated = await api<TalentProfile>('/talent/profile/vetting', {});
      setProfile(updated);
      notify('Vetting requested — an ecosystem administrator will review it.');
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function searchExperts(
    skill: string,
    maxRate?: number,
    filters?: { domain?: string; function?: string; industry?: string },
  ) {
    setBusy(true);
    setError('');
    try {
      const query = new URLSearchParams({ skill });
      if (maxRate) query.set('maxRate', String(maxRate));
      if (filters?.domain) query.set('domain', filters.domain);
      if (filters?.function) query.set('function', filters.function);
      if (filters?.industry) query.set('industry', filters.industry);
      setExpertResults(await api<ExpertResult[]>(`/talent/experts?${query}`, undefined, 'GET'));
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function loadJobMatches() {
    setBusy(true);
    setError('');
    try {
      setJobMatches(await api<JobMatch[]>('/talent/job-matches', undefined, 'GET'));
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function loadQuiz(skill: string) {
    setError('');
    setLastAssessment(null);
    try {
      setQuiz(
        await api<QuizQuestion[]>(`/talent/quiz/${encodeURIComponent(skill)}`, undefined, 'GET'),
      );
      setQuizSkill(skill);
    } catch (error) {
      setError((error as Error).message);
      setQuiz(null);
    }
  }

  async function submitQuiz(answers: number[]) {
    setBusy(true);
    try {
      const result = await api<AssessmentResult>('/talent/assessments', {
        skill: quizSkill,
        answers,
      });
      setLastAssessment(result);
      notify(
        result.passed
          ? `Passed with ${result.score}%!`
          : `Scored ${result.score}% — below the ${result.threshold}% pass threshold.`,
      );
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function loadAvailability() {
    try {
      setAvailability(
        await api<AvailabilitySlot[]>('/booking/availability/mine', undefined, 'GET'),
      );
    } catch {
      // No expert profile yet — availability naturally starts empty until one is created.
    }
  }
  useEffect(() => {
    void loadAvailability();
  }, []);

  async function addAvailability(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setBusy(true);
    setError('');
    try {
      await api<AvailabilitySlot>('/booking/availability', {
        startAt: new Date(String(data.get('startAt'))).toISOString(),
        endAt: new Date(String(data.get('endAt'))).toISOString(),
        format: data.get('format'),
      });
      form.reset();
      await loadAvailability();
      notify('Availability published.');
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function removeAvailability(id: string) {
    setBusy(true);
    try {
      await api(`/booking/availability/${id}`, {}, 'DELETE');
      await loadAvailability();
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusy(false);
    }
  }

  // Reuses /api/booking/availability/:expertUserId and /api/booking/slots/:slotId/book —
  // both already existed and were fully tested, just never had a UI caller: matching (Expert
  // Finder above) already worked, this closes the other half of "matching + booking".
  async function viewExpertAvailability(userId: string) {
    if (viewingAvailability?.userId === userId) {
      setViewingAvailability(null);
      return;
    }
    setError('');
    try {
      const slots = await api<AvailabilitySlot[]>(
        `/booking/availability/${userId}`,
        undefined,
        'GET',
      );
      setViewingAvailability({ userId, slots });
    } catch (error) {
      setError((error as Error).message);
    }
  }

  async function bookSlot(slotId: string, notes: string) {
    setBusy(true);
    setError('');
    try {
      await api(`/booking/slots/${slotId}/book`, { notes });
      if (viewingAvailability) await viewExpertAvailability(viewingAvailability.userId);
      await loadBookings();
      notify('Session booked.');
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function loadBookings() {
    try {
      setBookings(await api<Booking[]>('/booking/mine', undefined, 'GET'));
    } catch (error) {
      setError((error as Error).message);
    }
  }
  useEffect(() => {
    void loadBookings();
  }, []);

  async function cancelBooking(id: string) {
    setBusy(true);
    try {
      await api(`/booking/${id}/cancel`, {}, 'PATCH');
      await loadBookings();
      notify('Booking cancelled.');
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function loadTeams() {
    try {
      setTeams(await api<ExpertTeam[]>('/expert-teams/mine', undefined, 'GET'));
    } catch (error) {
      setError((error as Error).message);
    }
  }
  useEffect(() => {
    void loadTeams();
  }, []);

  async function createTeam(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setBusy(true);
    setError('');
    try {
      await api('/expert-teams', {
        name: data.get('name'),
        description: data.get('description') || undefined,
      });
      form.reset();
      await loadTeams();
      notify('Expert team created.');
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function loadReviewQueue() {
    try {
      setReviewQueue(await api<ReviewQueueEntry[]>('/review-queue', undefined, 'GET'));
    } catch {
      // Not a registered expert yet, or no profile — queue naturally starts empty/inaccessible.
    }
  }
  useEffect(() => {
    void loadReviewQueue();
  }, []);

  async function claimReview(id: string) {
    setBusy(true);
    try {
      await api(`/review-queue/${id}/claim`, {});
      await loadReviewQueue();
      notify('Review claimed.');
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function completeReview(id: string, notes: string) {
    setBusy(true);
    try {
      await api(`/review-queue/${id}/complete`, { notes });
      await loadReviewQueue();
      notify('Review completed.');
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function loadHandoffInbox() {
    try {
      setHandoffInbox(await api<HandoffItem[]>('/handoffs/inbox', undefined, 'GET'));
    } catch (error) {
      setError((error as Error).message);
    }
  }
  useEffect(() => {
    void loadHandoffInbox();
  }, []);

  async function acceptHandoff(id: string) {
    setBusy(true);
    try {
      await api(`/handoffs/${id}/accept`, {});
      await loadHandoffInbox();
      notify('Handoff accepted.');
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function declineHandoff(id: string) {
    setBusy(true);
    try {
      await api(`/handoffs/${id}/decline`, {});
      await loadHandoffInbox();
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function completeHandoff(id: string) {
    setBusy(true);
    try {
      await api(`/handoffs/${id}/complete`, {});
      await loadHandoffInbox();
      notify('Handoff completed.');
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return {
    profile,
    expertResults,
    jobMatches,
    quiz,
    quizSkill,
    lastAssessment,
    invitations,
    credentials,
    availability,
    bookings,
    viewingAvailability,
    viewExpertAvailability,
    bookSlot,
    teams,
    reviewQueue,
    handoffInbox,
    busy,
    error,
    saveProfile,
    requestVetting,
    searchExperts,
    loadJobMatches,
    loadQuiz,
    submitQuiz,
    respondToInvitation,
    inviteToJob,
    addCredential,
    addAvailability,
    removeAvailability,
    cancelBooking,
    createTeam,
    claimReview,
    completeReview,
    acceptHandoff,
    declineHandoff,
    completeHandoff,
  };
}
