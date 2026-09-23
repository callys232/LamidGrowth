import { useEffect, useState, type FormEvent } from 'react';
import { api } from '../../../api';
import type { Options } from '../../commercial/types';
import { useWorkspace } from '../../workspace/components/WorkspaceShell';

export type ScopingCase = {
  id: string;
  status: 'draft' | 'user_review' | 'scope_approved' | 'published';
  objective: string;
  problem_statement: string;
  desired_outcome: string;
  in_scope: string;
  out_of_scope: string;
  deliverables: string;
  acceptance_criteria: string;
  assumptions: string;
  category: string | null;
  budget_context: string;
  timeline_context: string;
  risk_band: 'green' | 'amber' | 'red';
  published_job_id: string | null;
};
export type ScopingSuggestions = {
  suggestions: Partial<
    Record<'desiredOutcome' | 'deliverables' | 'acceptanceCriteria' | 'budgetContext', string>
  >;
  riskBand: ScopingCase['risk_band'];
};
export type ReviewQueueEntry = {
  id: string;
  scoping_case_id: string;
  risk_band: 'green' | 'amber' | 'red';
  status: 'pending' | 'claimed' | 'completed';
  notes: string;
  created_at: string;
};
export type JurisdictionRule = {
  id: string;
  jurisdiction: string;
  category: string;
  requires_license: 0 | 1;
  notes: string;
  created_at: string;
};

export function useScopingPage() {
  const { notify } = useWorkspace();
  const [scopingCase, setScopingCase] = useState<ScopingCase | null>(null);
  const [options, setOptions] = useState<Options | null>(null);
  const [reviewEntry, setReviewEntry] = useState<ReviewQueueEntry | null>(null);
  const [jurisdictionRules, setJurisdictionRules] = useState<JurisdictionRule[]>([]);
  const [isJurisdictionAdmin, setIsJurisdictionAdmin] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function loadJurisdictionRules() {
    try {
      setJurisdictionRules(
        await api<JurisdictionRule[]>('/admin/jurisdiction-rules', undefined, 'GET'),
      );
      setIsJurisdictionAdmin(true);
    } catch {
      // Non-admins get a 403 here — leave the admin panel hidden rather than error-banner a
      // section most visitors aren't meant to see.
      setIsJurisdictionAdmin(false);
    }
  }
  useEffect(() => {
    void loadJurisdictionRules();
  }, []);

  async function addJurisdictionRule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setBusy(true);
    setError('');
    try {
      await api('/admin/jurisdiction-rules', {
        jurisdiction: data.get('jurisdiction'),
        category: data.get('category'),
        requiresLicense: data.get('requiresLicense') === 'on',
        notes: data.get('notes') || undefined,
      });
      form.reset();
      await loadJurisdictionRules();
      notify('Jurisdiction rule added.');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function removeJurisdictionRule(id: string) {
    setBusy(true);
    try {
      await api(`/admin/jurisdiction-rules/${id}`, {}, 'DELETE');
      await loadJurisdictionRules();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    api<Options>('/job-options', undefined, 'GET')
      .then(setOptions)
      .catch(() => {});
  }, []);

  async function start(objective: string, problemStatement: string) {
    setBusy(true);
    setError('');
    try {
      const created = await api<ScopingCase>('/scoping-cases', { objective, problemStatement });
      setScopingCase(created);
      return created;
    } catch (e) {
      setError((e as Error).message);
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function update(patch: Partial<Record<string, string | null>>) {
    if (!scopingCase) return;
    setBusy(true);
    setError('');
    try {
      const updated = await api<ScopingCase>(`/scoping-cases/${scopingCase.id}`, patch, 'PATCH');
      setScopingCase(updated);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function suggest() {
    if (!scopingCase) return null;
    setBusy(true);
    setError('');
    try {
      return await api<ScopingSuggestions>(`/scoping-cases/${scopingCase.id}/suggest`, {});
    } catch (e) {
      setError((e as Error).message);
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function publish(job: {
    title: string;
    projectType: string;
    budgetMin: number;
    budgetMax: number;
    currency: string;
    timeline: string;
    confirmed: boolean;
  }) {
    if (!scopingCase) return null;
    if (!scopingCase.category) {
      setError('Choose a category before publishing.');
      return null;
    }
    setBusy(true);
    setError('');
    try {
      const created = await api<{ id: string }>('/jobs', {
        title: job.title,
        category: scopingCase.category,
        projectType: job.projectType,
        description:
          [scopingCase.objective, scopingCase.problem_statement, scopingCase.desired_outcome]
            .filter(Boolean)
            .join('\n\n')
            .slice(0, 10000) || scopingCase.objective,
        deliverables: scopingCase.deliverables || scopingCase.objective,
        budgetMin: job.budgetMin,
        budgetMax: job.budgetMax,
        currency: job.currency,
        timeline: job.timeline,
      });
      const published = await api<ScopingCase>(
        `/scoping-cases/${scopingCase.id}/publish`,
        {
          publishedJobId: created.id,
          confirmed: job.confirmed,
        },
        'PATCH',
      );
      setScopingCase(published);
      notify('Project published from your scoping case.');
      return published;
    } catch (e) {
      setError((e as Error).message);
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function requestReview() {
    if (!scopingCase) return;
    setBusy(true);
    setError('');
    try {
      const entry = await api<ReviewQueueEntry>(
        `/scoping-cases/${scopingCase.id}/request-review`,
        {},
      );
      setReviewEntry(entry);
      notify('Sent for qualified expert review.');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return {
    scopingCase,
    options,
    reviewEntry,
    jurisdictionRules,
    isJurisdictionAdmin,
    busy,
    error,
    start,
    update,
    suggest,
    publish,
    requestReview,
    addJurisdictionRule,
    removeJurisdictionRule,
  };
}
