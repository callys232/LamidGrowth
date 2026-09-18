import { useCallback, useEffect, useState } from 'react';
import { api } from '../../../api';

export type AcceptanceCriterion = {
  id: string;
  criterion: string;
  status: 'pending' | 'satisfied' | 'not_satisfied' | 'insufficient_evidence';
};
export type Deliverable = {
  id: string;
  title: string;
  description: string;
  status: string;
  criteria: AcceptanceCriterion[];
};
export type Submission = {
  id: string;
  milestone_id: string;
  submitted_by: string;
  notes: string;
  created_at: string;
};
export type Milestone = {
  id: string;
  project_id: string;
  title: string;
  description: string;
  amount: number;
  currency: string;
  status: string;
  deliverables: Deliverable[];
  submissions: Submission[];
  // A verified-but-undecided case for this milestone's latest submission, if one exists — lets
  // Approve/Request revision/Dispute render from server state on a fresh page load, not only
  // right after this browser's own verify() call.
  pendingVerification: VerificationCase | null;
};
export type AssignedTeamMember = {
  id: string;
  team_id: string;
  user_id: string;
  role: string;
  access_scope: string;
};
export type AssignedTeam = {
  id: string;
  name: string;
  lead_user_id: string;
  description: string;
  members: AssignedTeamMember[];
};
export type Project = {
  id: string;
  workspace_id: string;
  job_id: string;
  title: string;
  status: string;
  freelancer_user_id: string;
  assigned_team_id: string | null;
  assignedTeam: AssignedTeam | null;
  milestones: Milestone[];
};
export type CriterionResult = {
  criterionId: string;
  result: 'satisfied' | 'not_satisfied' | 'insufficient_evidence';
  rationale: string;
};
export type MilestoneFunding = {
  id: string;
  status: 'pending' | 'held' | 'released' | 'refunded';
  amount_minor: number;
  currency: string;
  held_at: string | null;
  released_at: string | null;
};
export type ProjectMessage = {
  id: string;
  sender_id: string;
  body: string;
  created_at: string;
};
export type VerificationCase = {
  id: string;
  submission_id: string;
  method: string;
  confidence: number | null;
  results: CriterionResult[];
};

export type Handoff = {
  id: string;
  source: string;
  context_summary: string;
  target_user_id: string | null;
  status: 'pending' | 'accepted' | 'declined' | 'completed';
  created_at: string;
  resolved_at: string | null;
};

export function useHandoffsList() {
  const [handoffs, setHandoffs] = useState<Handoff[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    api<Handoff[]>('/handoffs/mine', undefined, 'GET')
      .then(setHandoffs)
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, []);
  return { handoffs, loading, error };
}

export function useProjectsList() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    api<Project[]>('/projects', undefined, 'GET')
      .then(setProjects)
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, []);
  return { projects, loading, error };
}

export function useProjectDetail(projectId: string) {
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api<Project>(`/projects/${projectId}`, undefined, 'GET');
      setProject(data);
      setError('');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function addMilestone(input: {
    title: string;
    description: string;
    amount: number;
    currency: string;
  }) {
    setBusy(true);
    try {
      await api(`/projects/${projectId}/milestones`, input);
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function addDeliverable(
    milestoneId: string,
    input: { title: string; description: string; criteria: string[] },
  ) {
    setBusy(true);
    try {
      await api(`/milestones/${milestoneId}/deliverables`, input);
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function submitMilestone(milestoneId: string, notes: string) {
    setBusy(true);
    try {
      await api(`/milestones/${milestoneId}/submissions`, { notes, assets: [] });
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function verifySubmission(submissionId: string, consent = false) {
    setBusy(true);
    try {
      const result = await api<VerificationCase>(`/submissions/${submissionId}/verify`, {
        consent,
      });
      await refresh();
      return result;
    } catch (e) {
      setError((e as Error).message);
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function decide(
    verificationCaseId: string,
    decision: 'approve' | 'request_revision' | 'dispute',
    reason: string,
  ) {
    setBusy(true);
    try {
      await api(`/verification-cases/${verificationCaseId}/decisions`, { decision, reason });
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function fundMilestone(milestoneId: string) {
    setBusy(true);
    try {
      const result = await api<{ authorizationUrl: string }>(`/milestones/${milestoneId}/fund`, {});
      window.open(result.authorizationUrl, '_blank', 'noopener');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function loadFunding(milestoneId: string) {
    try {
      return await api<MilestoneFunding | null>(
        `/milestones/${milestoneId}/funding`,
        undefined,
        'GET',
      );
    } catch (e) {
      setError((e as Error).message);
      return null;
    }
  }

  async function releaseMilestone(milestoneId: string) {
    setBusy(true);
    try {
      await api(`/milestones/${milestoneId}/release`, { provider: 'paystack' });
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function refundMilestone(milestoneId: string) {
    setBusy(true);
    try {
      await api(`/milestones/${milestoneId}/refund`, {});
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function loadMessages() {
    try {
      return await api<ProjectMessage[]>(`/projects/${projectId}/messages`, undefined, 'GET');
    } catch (e) {
      setError((e as Error).message);
      return [];
    }
  }

  async function sendMessage(body: string) {
    setBusy(true);
    try {
      await api(`/projects/${projectId}/messages`, { body });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function assignTeam(teamId: string | null) {
    setBusy(true);
    try {
      await api(`/projects/${projectId}/team`, { teamId }, 'PATCH');
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function submitReview(milestoneId: string, rating: number, comment: string) {
    setBusy(true);
    try {
      await api(`/milestones/${milestoneId}/review`, { rating, comment });
      await refresh();
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    } finally {
      setBusy(false);
    }
  }

  return {
    project,
    loading,
    error,
    busy,
    addMilestone,
    addDeliverable,
    submitMilestone,
    verifySubmission,
    decide,
    fundMilestone,
    loadFunding,
    releaseMilestone,
    refundMilestone,
    loadMessages,
    sendMessage,
    submitReview,
    assignTeam,
  };
}
