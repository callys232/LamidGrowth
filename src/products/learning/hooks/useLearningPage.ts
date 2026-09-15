import { useEffect, useState, type FormEvent } from 'react';
import { api } from '../../../api';
import { useWorkspace } from '../../workspace/components/WorkspaceShell';

export type LearningModule = {
  id: string;
  path_id: string;
  title: string;
  description: string;
  format: 'reading' | 'video' | 'exercise' | 'assessment';
  order_index: number;
  estimated_minutes: number | null;
  content_url: string | null;
  quiz_skill: string | null;
};
export type LearningPath = {
  id: string;
  title: string;
  description: string;
  domain: string | null;
  function: string | null;
  industry: string | null;
  estimated_hours: number | null;
  points_cost: number | null;
  language: string;
  coach_user_id: string | null;
  created_by: string | null;
  modules: LearningModule[];
  prerequisites: { id: string; title: string }[];
  feedback: { count: number; average: number | null };
};
export type LearningEnrollment = {
  id: string;
  path_id: string;
  path_title: string;
  user_id: string;
  status: 'in_progress' | 'completed';
  progress: number;
  assigned_by: string | null;
  due_at: string | null;
  completed_at: string | null;
};
export type ComplianceRow = {
  id: string;
  path_id: string;
  path_title: string;
  mandatory: 0 | 1;
  due_days: number | null;
  enrollment_status: string | null;
  due_at: string | null;
};
export type AttentionResponse = { needsYou: LearningEnrollment[]; stalled: LearningEnrollment[] };

export function useLearningPage() {
  const { notify } = useWorkspace();
  const [catalog, setCatalog] = useState<LearningPath[]>([]);
  const [enrollments, setEnrollments] = useState<LearningEnrollment[]>([]);
  const [compliance, setCompliance] = useState<ComplianceRow[]>([]);
  const [attention, setAttention] = useState<AttentionResponse>({ needsYou: [], stalled: [] });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function loadCatalog(filters?: { domain?: string; function?: string; industry?: string }) {
    try {
      const query = new URLSearchParams();
      if (filters?.domain) query.set('domain', filters.domain);
      if (filters?.function) query.set('function', filters.function);
      if (filters?.industry) query.set('industry', filters.industry);
      const suffix = query.toString() ? `?${query}` : '';
      setCatalog(await api<LearningPath[]>(`/learning/paths${suffix}`, undefined, 'GET'));
    } catch (e) {
      setError((e as Error).message);
    }
  }
  useEffect(() => {
    void loadCatalog();
  }, []);

  async function loadEnrollments() {
    try {
      setEnrollments(await api<LearningEnrollment[]>('/learning/enrollments/mine', undefined, 'GET'));
    } catch (e) {
      setError((e as Error).message);
    }
  }
  useEffect(() => {
    void loadEnrollments();
  }, []);

  async function loadCompliance() {
    try {
      setCompliance(await api<ComplianceRow[]>('/learning/compliance/mine', undefined, 'GET'));
    } catch (e) {
      setError((e as Error).message);
    }
  }
  useEffect(() => {
    void loadCompliance();
  }, []);

  async function loadAttention() {
    try {
      setAttention(await api<AttentionResponse>('/learning/enrollments/attention', undefined, 'GET'));
    } catch (e) {
      setError((e as Error).message);
    }
  }
  useEffect(() => {
    void loadAttention();
  }, []);

  async function createPath(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setBusy(true);
    setError('');
    try {
      await api('/learning/paths', {
        title: data.get('title'),
        description: data.get('description') || undefined,
        domain: data.get('domain') || undefined,
        estimatedHours: data.get('estimatedHours') ? Number(data.get('estimatedHours')) : undefined,
        pointsCost: data.get('pointsCost') ? Number(data.get('pointsCost')) : undefined,
      });
      form.reset();
      await loadCatalog();
      notify('Learning path created.');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function enroll(pathId: string) {
    setBusy(true);
    setError('');
    try {
      await api(`/learning/paths/${pathId}/enroll`, {});
      await Promise.all([loadEnrollments(), loadCatalog()]);
      notify('Enrolled.');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function completeModule(moduleId: string, score?: number) {
    setBusy(true);
    setError('');
    try {
      await api(`/learning/modules/${moduleId}/complete`, { score });
      await Promise.all([loadEnrollments(), loadAttention()]);
      notify('Module completed.');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function issueCertificate(enrollmentId: string) {
    setBusy(true);
    try {
      await api(`/learning/enrollments/${enrollmentId}/certificate`, {});
      notify('Certificate issued.');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function submitFeedback(pathId: string, rating: number, comment: string) {
    setBusy(true);
    try {
      await api(`/learning/paths/${pathId}/feedback`, { rating, comment });
      await loadCatalog();
      notify('Feedback recorded.');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return {
    catalog,
    enrollments,
    compliance,
    attention,
    busy,
    error,
    loadCatalog,
    createPath,
    enroll,
    completeModule,
    issueCertificate,
    submitFeedback,
  };
}
