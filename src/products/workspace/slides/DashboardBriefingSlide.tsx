import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { api } from '../../../api';
import { attentionItems, changedActions } from '../../../shared/lib/dashboardBriefing.mjs';
import { Button } from '../../../shared/ui/Button';
import { Modal } from '../../../shared/ui/Modal';
import { ActionDetail } from '../../consistency/components/ActionDetail';
import type { Policy } from '../../intelligence/types';
import { useWorkspace } from '../components/WorkspaceShell';
import './dashboardBriefing.css';

type Snapshot = { at: string; statuses: Record<string, string> };
type Briefing = {
  generatedAt: string;
  summary: string;
  recommendation: { title: string; rationale: string };
  assumptions: string[];
  sources: { id: string; version: number; kind: string; title: string }[];
};

function previousVisit(key: string): Snapshot | null {
  try {
    const value = JSON.parse(localStorage.getItem(key) || 'null');
    return value &&
      typeof value.at === 'string' &&
      !Number.isNaN(Date.parse(value.at)) &&
      value.statuses &&
      typeof value.statuses === 'object'
      ? value
      : null;
  } catch {
    return null;
  }
}

export function DashboardBriefingSlide() {
  const { state, newObjective, newAction } = useWorkspace();
  const key = `lamid-dashboard-visit:${state.user.id}:${state.workspace.id}`;
  const [previous] = useState(() => previousVisit(key));
  const [policy, setPolicy] = useState<Policy | null>(null);
  const [policyError, setPolicyError] = useState('');
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [briefing, setBriefing] = useState<Briefing | null>(null);
  const [openId, setOpenId] = useState('');
  const [expanded, setExpanded] = useState(false);
  const mounted = useRef(false);
  const inFlight = useRef(false);
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const attention = attentionItems(state.objectives, state.actions, today);
  const changes = changedActions(state.actions, previous?.statuses || null);
  const action = state.actions.find((item) => item.id === openId);
  const objective = state.objectives.find((item) => item.id === openId);
  const fingerprint = JSON.stringify([
    today,
    state.objectives.map((o) => [o.id, o.version]),
    state.actions.map((a) => [a.id, a.version]),
  ]);
  const [briefingFingerprint, setBriefingFingerprint] = useState('');
  const stale = briefing && fingerprint !== briefingFingerprint;

  useEffect(() => {
    mounted.current = true;
    const load = () =>
      void api<Policy>('/ai/settings')
        .then((value) => {
          if (mounted.current) {
            setPolicy(value);
            setPolicyError('');
          }
        })
        .catch(() => {
          if (mounted.current)
            setPolicyError('AI availability could not be checked. Reload to try again.');
        });
    load();
    window.addEventListener('focus', load);
    return () => {
      mounted.current = false;
      window.removeEventListener('focus', load);
    };
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem(
        key,
        JSON.stringify({
          at: new Date().toISOString(),
          statuses: Object.fromEntries(state.actions.map((a) => [a.id, a.status])),
        }),
      );
    } catch {
      /* The briefing still works when browser storage is unavailable. */
    }
  }, [key, state.actions]);

  const unavailable =
    policyError ||
    (!policy
      ? 'Checking AI availability…'
      : !policy.configured
        ? 'AI is not configured.'
        : !policy.enabled
          ? 'AI is disabled for this workspace.'
          : !policy.accountEligible
            ? 'AI requires a verified, non-demo account.'
            : !state.permissions.includes('work:write') ||
                !['owner', 'member'].includes(state.workspace.role)
              ? 'Your role cannot request an AI briefing.'
              : !policy.rules.reviews
                ? 'AI reviews are disabled in your workspace rules.'
                : !policy.rules.allowedSources.some((kind) =>
                      ['objective', 'action'].includes(kind),
                    )
                  ? 'Your AI rules exclude objectives and actions.'
                  : !state.objectives.length && !state.actions.length
                    ? 'Add an objective to get started.'
                    : '');
  async function prepare() {
    if (inFlight.current || !policy || !consent || unavailable) return;
    inFlight.current = true;
    setBusy(true);
    setError('');
    try {
      const result = await api<Briefing>('/dashboard/briefing', {
        consent,
        rulesVersion: policy.version,
        today,
      });
      if (mounted.current) {
        setBriefing(result);
        setBriefingFingerprint(fingerprint);
      }
    } catch (cause) {
      if (mounted.current) setError((cause as Error).message);
    } finally {
      inFlight.current = false;
      if (mounted.current) setBusy(false);
    }
  }

  return (
    <section className="panel dashboard-briefing" aria-labelledby="briefing-heading">
      <div className="panel-heading">
        <div>
          <h2 id="briefing-heading">Your daily briefing</h2>
          <span>A clear view of what needs you next.</span>
        </div>
        <Sparkles size={20} aria-hidden="true" />
      </div>
      <div className="briefing-columns">
        <div>
          <h3>What changed</h3>
          {previous ? (
            <>
              <p>
                Since your last visit on this browser ({new Date(previous.at).toLocaleString()}):{' '}
                {changes.completed.length} newly completed{' '}
                {changes.completed.length === 1 ? 'action' : 'actions'}; {changes.reviews.length}{' '}
                newly awaiting review.
              </p>
              {[...changes.reviews, ...changes.completed].slice(0, 4).map((item) => (
                <button
                  key={item.id}
                  className="briefing-record"
                  onClick={() => setOpenId(item.id)}
                >
                  {item.title}
                  <small>{item.status}</small>
                </button>
              ))}
            </>
          ) : (
            <p>Your next visit will show changes from this point on this browser.</p>
          )}
          <h3>
            Needs attention <span className="briefing-count">{attention.length}</span>
          </h3>
          <p className="briefing-note">
            Overdue work, reviews, dates in the next 7 days, and goals without an open action.
          </p>
          {attention.length ? (
            <ul className="briefing-list">
              {(expanded ? attention : attention.slice(0, 4)).map((item) => (
                <li key={item.id}>
                  <button className="briefing-record" onClick={() => setOpenId(item.id)}>
                    {item.title}
                    <small>{item.reasons.join(' · ')}</small>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p>
              {state.objectives.length
                ? 'No items match these attention checks.'
                : 'Start with a goal you want to move forward.'}
            </p>
          )}
          {attention.length > 4 && (
            <button
              className="text-button"
              aria-expanded={expanded}
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? 'Show fewer' : `Show all ${attention.length} items`}
            </button>
          )}
          {!state.objectives.length && (
            <Button variant="secondary" onClick={newObjective}>
              Create an objective
            </Button>
          )}
        </div>
        <div className="briefing-ai" aria-busy={busy}>
          <h3>One recommended next move</h3>
          <p>
            Ask AI to explain the priorities in a snapshot of up to 20 permitted objectives and
            actions. Uses your AI review settings and daily request limit.
          </p>
          {unavailable ? (
            <p className="briefing-note">
              {unavailable} <Link to="/os/settings/ai">AI Settings</Link>
            </p>
          ) : (
            <label className="checkbox-field">
              <input
                type="checkbox"
                checked={consent}
                onChange={(event) => setConsent(event.target.checked)}
              />
              <span>
                Share permitted objective and action titles, statuses, priorities, and dates with
                the configured AI provider for this briefing.
              </span>
            </label>
          )}
          <Button
            disabled={busy || !consent || Boolean(unavailable)}
            onClick={() => void prepare()}
          >
            <Sparkles size={15} />
            {busy
              ? 'Preparing your briefing…'
              : briefing
                ? 'Refresh my briefing'
                : 'Prepare my briefing'}
          </Button>
          {error && (
            <p className="form-error" role="alert">
              {error} Your attention list remains available.
            </p>
          )}
          {briefing && (
            <div className="briefing-result" aria-live="polite">
              <p className="briefing-note">
                AI suggestion · Prepared {new Date(briefing.generatedAt).toLocaleString()}
              </p>
              {stale && (
                <p role="status">
                  Workspace data or the date has changed. Refresh this briefing before relying on
                  it.
                </p>
              )}
              <p>{briefing.summary}</p>
              <h4>{briefing.recommendation.title}</h4>
              <p>{briefing.recommendation.rationale}</p>
              <strong>Supporting records</strong>
              {briefing.sources.map((source) => (
                <button
                  className="briefing-record"
                  key={source.id}
                  disabled={
                    ![...state.actions, ...state.objectives].some((item) => item.id === source.id)
                  }
                  onClick={() => setOpenId(source.id)}
                >
                  Open {source.title}
                </button>
              ))}
              {briefing.assumptions.length > 0 && (
                <details>
                  <summary>Assumptions to check</summary>
                  <ul>
                    {briefing.assumptions.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          )}
        </div>
      </div>
      {action && <ActionDetail action={action} onClose={() => setOpenId('')} />}
      {objective && (
        <Modal title="Objective context" onClose={() => setOpenId('')}>
          <h3>{objective.title}</h3>
          <p>{objective.description}</p>
          <p>Success: {objective.success || 'Not yet defined'}</p>
          <p>Target date: {objective.targetDate || 'Not set'}</p>
          <Button
            onClick={() => {
              setOpenId('');
              newAction(objective.id);
            }}
          >
            Add a next action
          </Button>
        </Modal>
      )}
    </section>
  );
}
