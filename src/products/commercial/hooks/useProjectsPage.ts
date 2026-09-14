import { useCallback, useEffect, useState } from 'react';
import { api } from '../../../api';

export type AcceptanceCriterion = {
  id: string;
  criterion: string;
  status: 'pending' | 'satisfied' | 'not_satisfied';
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
};
export type Project = {
  id: string;
  workspace_id: string;
  job_id: string;
  title: string;
  status: string;
  freelancer_user_id: string;
  milestones: Milestone[];
};
export type CriterionResult = {
  criterionId: string;
  result: 'satisfied' | 'not_satisfied';
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
  confidence: number;
  results: CriterionResult[];
};

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

  async function addMilestone(input: { title: string; description: string; amount: number; currency: string }) {
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

  async function addDeliverable(milestoneId: string, input: { title: string; description: string; criteria: string[] }) {
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

  async function verifySubmission(submissionId: string) {
    setBusy(true);
    try {
      const result = await api<VerificationCase>(`/submissions/${submissionId}/verify`, {});
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
      return await api<MilestoneFunding | null>(`/milestones/${milestoneId}/funding`, undefined, 'GET');
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
  };
}
