import { useEffect, useRef, useState, type FormEvent } from 'react';
import { api } from '../../../api';
import { useWorkspace } from '../../workspace/components/WorkspaceShell';
import type { Run } from '../types';

export function useWorkflowsPage() {
  const { state, refresh, notify } = useWorkspace();
  const [runs, setRuns] = useState<Run[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const requests = useRef(0);
  const mutating = useRef(false);
  const canManage = state.permissions.includes('workspace:manage');
  async function load() {
    const sequence = ++requests.current;
    const data = await api<Run[]>('/workflows');
    if (sequence === requests.current) setRuns(data);
  }
  useEffect(() => {
    let active = true;
    let pending = false;
    const poll = async () => {
      if (pending || mutating.current) return;
      pending = true;
      const sequence = ++requests.current;
      try {
        const data = await api<Run[]>('/workflows');
        if (active && sequence === requests.current) setRuns(data);
      } catch (error) {
        if (active) setError((error as Error).message);
      } finally {
        pending = false;
      }
    };
    void poll();
    const timer = setInterval(() => {
      if (!document.hidden) void poll();
    }, 4000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);
  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    const form = event.currentTarget;
    const data = new FormData(form);
    const nextAction = String(data.get('nextAction')).trim();
    const steps = [
      { id: 'context', toolId: 'context.snapshot', input: {}, dependsOn: [] },
      { id: 'capability', toolId: 'capability.review', input: {}, dependsOn: ['context'] },
      ...(nextAction
        ? [
            {
              id: 'action',
              toolId: 'action.prepare',
              input: { title: nextAction },
              dependsOn: ['capability'],
            },
          ]
        : []),
      {
        id: 'progress',
        toolId: 'progress.snapshot',
        input: {},
        dependsOn: [nextAction ? 'action' : 'capability'],
      },
      {
        id: 'reminder',
        toolId: 'review.reminder',
        input: { message: String(data.get('reminder')) },
        dependsOn: ['progress'],
      },
    ];
    try {
      await api('/workflows', {
        title: data.get('title'),
        objectiveId: data.get('objectiveId'),
        steps,
        ...(data.get('startAt')
          ? { startAt: new Date(String(data.get('startAt'))).toISOString() }
          : {}),
        expiresAt: new Date(Date.now() + Number(data.get('days')) * 86400000).toISOString(),
      });
      form.reset();
      await load();
      notify('Workflow saved. Review its steps before starting.');
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function command(run: Run, command: string) {
    setBusy(true);
    mutating.current = true;
    ++requests.current;
    setError('');
    try {
      await api(
        `/workflows/${run.id}`,
        {
          version: run.version,
          command,
          ...(command === 'approve'
            ? { objectiveVersion: state.objectives.find((o) => o.id === run.objective_id)?.version }
            : {}),
        },
        'PATCH',
      );
      await load();
      await refresh();
    } catch (error) {
      setError((error as Error).message);
      await load().catch(() => {});
      await refresh().catch(() => {});
    } finally {
      setBusy(false);
      mutating.current = false;
    }
  }
  async function resolveEvent(run: Run, correlationKey: string, payloadJson: string) {
    setBusy(true);
    mutating.current = true;
    ++requests.current;
    setError('');
    try {
      let payload = {};
      if (payloadJson.trim()) {
        try {
          payload = JSON.parse(payloadJson);
        } catch {
          throw new Error('Payload must be valid JSON (or left blank).');
        }
      }
      await api(`/workflows/${run.id}/events`, { correlationKey, payload });
      await load();
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusy(false);
      mutating.current = false;
    }
  }
  async function remove(run: Run) {
    setBusy(true);
    mutating.current = true;
    ++requests.current;
    setError('');
    try {
      await api(`/workflows/${run.id}`, {}, 'DELETE');
      await load();
      notify('Workflow deleted.');
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusy(false);
      mutating.current = false;
    }
  }
  return { error, canManage, state, create, busy, runs, command, remove, resolveEvent };
}
