import { useEffect, useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { Brand } from '../../../shared/ui/Brand';
import { DemoDashboardOverview } from '../demo/DemoDashboardOverview';
import { DemoMatching } from '../demo/DemoMatching';
import { api } from '../../../api';
import type { Objective, Status, WorkspaceState } from '../../../types';
import { Modal } from '../../../shared/ui/Modal';
import { Button } from '../../../shared/ui/Button';
import { Field } from '../../../shared/ui/Field';
import { EngineForm } from '../../engines/pages/EnginesPage';
import { EngineResultView } from '../../engines/components/EngineResultView';
import { useEngineRun } from '../../engines/hooks/useEngineRun';
import { useEngineCatalog } from '../../engines/hooks/useEngineCatalog';
import {
  PROFILES,
  TIERS,
  createDemoScenario,
  refreshDemoSeed,
  scenarioKey,
  type DemoTier,
  type DemoPlan,
  type DemoWorkspace,
  type DemoProfile,
} from '../demo/scenarios';
import { DemoProjects } from '../demo/DemoProjects';
import { DemoEscrows } from '../demo/DemoEscrows';
import { DemoAccountServices } from '../demo/DemoAccountServices';
import { AnalyticsSummary } from '../../analytics/pages/AnalyticsPage';
import './marketing-demo.css';

const VIEWS = [
  'Overview',
  'Goals',
  'Projects',
  'Escrows',
  'Job Matcher',
  'Consultant Finder',
  'Actions',
  'Rhythm',
  'Tools',
  'Analytics',
  'Profile',
  'Payout Accounts',
  'Privacy & Security',
  'Disputes',
] as const;
const STORAGE = 'lamid-marketing-demo-v1';
type Samples = Record<string, DemoWorkspace>;
function loadSamples(): Samples {
  try {
    const stored = JSON.parse(sessionStorage.getItem(STORAGE) || '{}');
    if (!stored || typeof stored !== 'object' || Array.isArray(stored)) return {};
    return Object.fromEntries(
      Object.entries(stored)
        .filter(([, value]) => {
          const sample = value as WorkspaceState;
          return (
            sample?.user?.demo === true &&
            sample.workspace?.id?.startsWith('demo-') &&
            ['objectives', 'actions', 'reviews', 'audit'].every((field) =>
              Array.isArray(sample[field as keyof WorkspaceState]),
            )
          );
        })
        .map(([key, value]) => [key, refreshDemoSeed(value as WorkspaceState, key)]),
    ) as Samples;
  } catch {
    return {};
  }
}
export function MarketingDemoPage() {
  const [params, setParams] = useSearchParams();
  const initialProfile = params.get('profile') as DemoProfile;
  const initialTier = params.get('tier') as DemoTier;
  const [profile, setProfile] = useState<DemoProfile>(
    PROFILES.includes(initialProfile) ? initialProfile : 'Individual',
  );
  const [tier, setTier] = useState<DemoTier>(
    TIERS.includes(initialTier) ? initialTier : 'individual',
  );
  const [planId, setPlanId] = useState(
    ['free', 'personal', 'professional', 'team', 'enterprise'].includes(params.get('plan') ?? '')
      ? params.get('plan')!
      : 'free',
  );
  const [plans, setPlans] = useState<DemoPlan[]>([]);
  const [planError, setPlanError] = useState('');
  const [samples, setSamples] = useState<Samples>(loadSamples);
  const [view, setView] = useState<(typeof VIEWS)[number]>('Overview');
  const [editor, setEditor] = useState<Objective | 'new' | null>(null);
  const [deleting, setDeleting] = useState<Objective | null>(null);
  const [addingAction, setAddingAction] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [notice, setNotice] = useState('');
  const effectivePlan = tier === 'enterprise' ? 'enterprise' : planId;
  const key = scenarioKey(profile, tier, effectivePlan);
  const state = samples[key] ?? createDemoScenario(profile, tier, effectivePlan);
  const plan = plans.find((p) => p.id === effectivePlan);
  useEffect(() => {
    setParams({ profile, tier, plan: effectivePlan }, { replace: true });
  }, [profile, tier, effectivePlan, setParams]);
  useEffect(() => {
    api<{ plans: DemoPlan[] }>('/plans')
      .then((data) => setPlans(data.plans))
      .catch((e) => setPlanError((e as Error).message));
  }, []);
  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE, JSON.stringify(samples));
    } catch {
      setNotice('Browser storage is unavailable. Changes will last until this page closes.');
    }
  }, [samples]);
  useEffect(() => {
    setEditor(null);
    setDeleting(null);
    setAddingAction(false);
    setResetting(false);
    setNotice('');
  }, [key]);
  function change(update: (sample: DemoWorkspace) => DemoWorkspace, message: string) {
    setSamples((current) => {
      const next = update(current[key] ?? createDemoScenario(profile, tier, effectivePlan));
      return {
        ...current,
        [key]: {
          ...next,
          audit: [
            {
              id: crypto.randomUUID(),
              actor: 'Demo user',
              action: message,
              objectId: '',
              detail: 'Sample activity',
              createdAt: new Date().toISOString(),
            },
            ...next.audit,
          ],
        },
      };
    });
    setNotice(message);
  }
  function saveGoal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fields = Object.fromEntries(new FormData(event.currentTarget));
    const existing = editor && editor !== 'new' ? editor : null;
    const goal: Objective = {
      id: existing?.id ?? crypto.randomUUID(),
      title: String(fields.title).trim().toUpperCase(),
      description: String(fields.description),
      context: state.workspace.context,
      priority: fields.priority as Objective['priority'],
      status: existing?.status ?? 'Active',
      success: String(fields.success),
      constraints: String(fields.constraints),
      targetDate: String(fields.targetDate),
      version: (existing?.version ?? 0) + 1,
      createdAt: existing?.createdAt ?? new Date().toISOString(),
    };
    change(
      (sample) => ({
        ...sample,
        objectives: existing
          ? sample.objectives.map((o) => (o.id === existing.id ? goal : o))
          : [...sample.objectives, goal],
      }),
      existing ? 'Sample goal updated.' : 'Sample goal created.',
    );
    setEditor(null);
  }
  return (
    <div className="marketing-demo">
      <header className="marketing-demo-hero demo-dashboard-topbar">
        <span>MARKETER DEMO WORKSPACE</span>
        <h2>{profile} demo dashboard</h2>
        <p>
          Fictional sample data. Changes stay in this browser tab; diagnostic runs use the public
          demo endpoint with no saved results or points charged.
        </p>
      </header>
      <div className="marketing-demo-selectors">
        <Field label="Profile">
          <select value={profile} onChange={(e) => setProfile(e.target.value as DemoProfile)}>
            {PROFILES.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </Field>
        <Field label="Workspace tier">
          <select value={tier} onChange={(e) => setTier(e.target.value as DemoTier)}>
            {TIERS.map((t) => (
              <option key={t} value={t}>
                {t[0].toUpperCase() + t.slice(1)}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Subscription plan">
          <select
            value={effectivePlan}
            disabled={tier === 'enterprise' || !plans.length}
            onChange={(e) => setPlanId(e.target.value)}
          >
            {plans.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </Field>
        <Button variant="secondary" onClick={() => setResetting(true)}>
          Reset this demo
        </Button>
      </div>
      {planError && <p role="alert">Plan information could not load: {planError}</p>}
      {plan && (
        <div className="marketing-demo-plan">
          <strong>
            {profile} · {tier} tier · {plan.name} plan
          </strong>
          <p>{plan.summary}</p>
          <span>
            Included suites: {plan.seats.join(' · ')}. Member limit: {plan.members.max}. Monthly
            points: {plan.monthlyPoints ?? 'By agreement'}.
          </span>
          {tier === 'enterprise' && (
            <p>The Enterprise workspace tier grants the Enterprise plan.</p>
          )}
        </div>
      )}
      {notice && (
        <p className="marketing-demo-notice" role="status">
          {notice}
        </p>
      )}
      <div className="demo-dashboard-body">
        <nav className="marketing-demo-tabs sidebar" aria-label="Demo sections">
          <div className="sidebar-brand">
            <Brand compact light />
          </div>
          <div className="demo-sidebar-workspace">
            <strong>{profile} workspace</strong>
            <small>
              {plan?.name ?? 'Free'} plan · {tier} tier
            </small>
          </div>
          <div className="sidebar-label">YOUR OPERATING SPACE</div>
          {VIEWS.map((v) => (
            <button
              type="button"
              key={v}
              className={view === v ? 'sidebar-link active' : 'sidebar-link'}
              aria-current={view === v ? 'page' : undefined}
              onClick={() => setView(v)}
            >
              {v}
            </button>
          ))}
          <Link className="sidebar-link" to="/demo#profile-demos">
            Switch demo account
          </Link>
          <div className="demo-sidebar-profile">
            <span className="avatar">AM</span>
            <span>
              {state.user.name}
              <small>Marketing demonstration</small>
            </span>
          </div>
        </nav>
        <div className="demo-dashboard-content">
          {view === 'Overview' && (
            <DemoDashboardOverview
              state={state}
              createGoal={() => setEditor('new')}
              createAction={() => setAddingAction(true)}
              editGoal={(id) => setEditor(state.objectives.find((goal) => goal.id === id) ?? null)}
              open={setView}
            />
          )}
          {view === 'Goals' && (
            <section>
              <div className="marketing-demo-heading">
                <h2>{profile} goals</h2>
                <Button onClick={() => setEditor('new')}>Create goal</Button>
              </div>
              <div className="marketing-demo-grid">
                {state.objectives.map((goal) => {
                  const actions = state.actions.filter((a) => a.objectiveId === goal.id);
                  return (
                    <article className="marketing-demo-panel" key={goal.id}>
                      <span>
                        {goal.priority} priority · {goal.status}
                      </span>
                      <h3>{goal.title}</h3>
                      <p>{goal.description}</p>
                      <p>
                        <strong>Success:</strong> {goal.success}
                      </p>
                      <p>
                        {actions.filter((a) => a.status === 'Done').length} of {actions.length}{' '}
                        actions complete
                      </p>
                      <p>Target: {goal.targetDate || 'No date set'}</p>
                      <div className="marketing-demo-actions">
                        <Button variant="secondary" onClick={() => setEditor(goal)}>
                          Edit goal
                        </Button>
                        <Button variant="ghost" onClick={() => setDeleting(goal)}>
                          Delete goal
                        </Button>
                        <Button variant="ghost" onClick={() => setView('Actions')}>
                          View actions
                        </Button>
                      </div>
                    </article>
                  );
                })}
              </div>
              {!state.objectives.length && <p>Create a goal to start this demo.</p>}
            </section>
          )}
          {view === 'Projects' && <DemoProjects key={key} state={state} change={change} />}
          {view === 'Job Matcher' && (
            <DemoMatching key={`${key}:jobs`} state={state} kind="jobs" change={change} />
          )}
          {view === 'Consultant Finder' && (
            <DemoMatching
              key={`${key}:consultants`}
              state={state}
              kind="consultants"
              change={change}
            />
          )}
          {view === 'Escrows' && <DemoEscrows key={key} state={state} change={change} />}
          {view === 'Actions' && (
            <section>
              <div className="marketing-demo-heading">
                <h2>Next actions</h2>
                <Button
                  disabled={!state.objectives.some((o) => o.status === 'Active')}
                  onClick={() => setAddingAction(true)}
                >
                  Add action
                </Button>
              </div>
              <div className="marketing-demo-grid">
                {state.actions.map((action) => (
                  <article key={action.id} className="marketing-demo-panel">
                    <small>
                      {state.objectives.find((o) => o.id === action.objectiveId)?.title}
                    </small>
                    <h3>{action.title}</h3>
                    <p>
                      {action.owner} · Due {action.dueDate || 'not set'}
                    </p>
                    <p>{action.notes}</p>
                    <Field label={`Status for ${action.title}`}>
                      <select
                        value={action.status}
                        onChange={(e) =>
                          change(
                            (s) => ({
                              ...s,
                              actions: s.actions.map((a) =>
                                a.id === action.id
                                  ? {
                                      ...a,
                                      status: e.target.value as Status,
                                      version: a.version + 1,
                                    }
                                  : a,
                              ),
                            }),
                            'Sample action updated.',
                          )
                        }
                      >
                        <option>Planned</option>
                        <option>In progress</option>
                        <option>Needs review</option>
                        <option>Done</option>
                        <option>Paused</option>
                      </select>
                    </Field>
                  </article>
                ))}
              </div>
              {!state.actions.length && <p>Add an action to an active goal.</p>}
            </section>
          )}
          {view === 'Rhythm' && (
            <section className="marketing-demo-panel">
              <h2>Progress, learning, and the next cycle</h2>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const form = e.currentTarget;
                  const data = Object.fromEntries(new FormData(form));
                  change(
                    (s) => ({
                      ...s,
                      reviews: [
                        {
                          id: crypto.randomUUID(),
                          progressed: String(data.progressed),
                          learned: String(data.learned),
                          next: String(data.next),
                          createdAt: new Date().toISOString(),
                        },
                        ...s.reviews,
                      ],
                    }),
                    'Sample rhythm review recorded.',
                  );
                  form.reset();
                }}
              >
                <Field label="What moved forward?">
                  <textarea name="progressed" required maxLength={5000} />
                </Field>
                <Field label="What changed or what did you learn?">
                  <textarea name="learned" required maxLength={5000} />
                </Field>
                <Field label="What comes next?">
                  <textarea name="next" required maxLength={5000} />
                </Field>
                <Button type="submit">Save review</Button>
              </form>
              <h3>Review history</h3>
              {state.reviews.map((r) => (
                <article key={r.id}>
                  <p>
                    <strong>Progress:</strong> {r.progressed}
                  </p>
                  <p>
                    <strong>Learning:</strong> {r.learned}
                  </p>
                  <p>
                    <strong>Next:</strong> {r.next}
                  </p>
                </article>
              ))}
            </section>
          )}
          {view === 'Tools' && <DemoTools key={key} plan={plan} />}
          {view === 'Analytics' && <AnalyticsSummary state={state} />}
          {(['Profile', 'Payout Accounts', 'Privacy & Security', 'Disputes'] as const).includes(
            view as 'Profile',
          ) && (
            <DemoAccountServices
              key={`${key}-${view}`}
              kind={view as 'Profile' | 'Payout Accounts' | 'Privacy & Security' | 'Disputes'}
              state={state}
              change={change}
            />
          )}
          {editor && (
            <Modal
              title={editor === 'new' ? 'Create sample goal' : 'Edit sample goal'}
              onClose={() => setEditor(null)}
            >
              <form onSubmit={saveGoal}>
                <Field label="Goal">
                  <input
                    name="title"
                    required
                    maxLength={500}
                    defaultValue={editor === 'new' ? '' : editor.title}
                    autoCapitalize="characters"
                    onChange={(e) => {
                      const input = e.currentTarget;
                      const start = input.selectionStart;
                      const end = input.selectionEnd;
                      const value = input.value;
                      input.value = value.toUpperCase();
                      if (start !== null && end !== null)
                        input.setSelectionRange(
                          value.slice(0, start).toUpperCase().length,
                          value.slice(0, end).toUpperCase().length,
                        );
                    }}
                  />
                </Field>
                <Field label="Why it matters">
                  <textarea
                    name="description"
                    maxLength={5000}
                    defaultValue={editor === 'new' ? '' : editor.description}
                  />
                </Field>
                <Field label="Priority">
                  <select
                    name="priority"
                    defaultValue={editor === 'new' ? 'Medium' : editor.priority}
                  >
                    <option>High</option>
                    <option>Medium</option>
                    <option>Low</option>
                  </select>
                </Field>
                <Field label="What does success look like?">
                  <input
                    name="success"
                    maxLength={5000}
                    defaultValue={editor === 'new' ? '' : editor.success}
                  />
                </Field>
                <Field label="Constraints">
                  <input
                    name="constraints"
                    maxLength={5000}
                    defaultValue={editor === 'new' ? '' : editor.constraints}
                  />
                </Field>
                <Field label="Target date">
                  <input
                    type="date"
                    name="targetDate"
                    defaultValue={editor === 'new' ? '' : editor.targetDate}
                  />
                </Field>
                <div className="modal-actions">
                  <Button variant="secondary" onClick={() => setEditor(null)}>
                    Cancel
                  </Button>
                  <Button type="submit">Save goal</Button>
                </div>
              </form>
            </Modal>
          )}
          {deleting && (
            <Modal title="Delete sample goal?" onClose={() => setDeleting(null)}>
              <p>
                Delete “{deleting.title}” and its{' '}
                {state.actions.filter((a) => a.objectiveId === deleting.id).length} linked sample
                actions?
              </p>
              <div className="modal-actions">
                <Button variant="secondary" onClick={() => setDeleting(null)}>
                  Keep goal
                </Button>
                <Button
                  onClick={() => {
                    change(
                      (s) => ({
                        ...s,
                        objectives: s.objectives.filter((o) => o.id !== deleting.id),
                        actions: s.actions.filter((a) => a.objectiveId !== deleting.id),
                        projects: s.projects.map((project) =>
                          project.goalId === deleting.id ? { ...project, goalId: '' } : project,
                        ),
                      }),
                      'Sample goal and linked actions deleted.',
                    );
                    setDeleting(null);
                  }}
                >
                  Confirm delete
                </Button>
              </div>
            </Modal>
          )}
          {addingAction && (
            <Modal title="Add sample action" onClose={() => setAddingAction(false)}>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const data = Object.fromEntries(new FormData(e.currentTarget));
                  change(
                    (s) => ({
                      ...s,
                      actions: [
                        ...s.actions,
                        {
                          id: crypto.randomUUID(),
                          title: String(data.title),
                          objectiveId: String(data.objectiveId),
                          owner: String(data.owner),
                          dueDate: String(data.dueDate),
                          status: 'Planned',
                          notes: '',
                          requiresApproval: false,
                          version: 1,
                          createdAt: new Date().toISOString(),
                        },
                      ],
                    }),
                    'Sample action added.',
                  );
                  setAddingAction(false);
                }}
              >
                <Field label="Action">
                  <input name="title" required maxLength={500} />
                </Field>
                <Field label="Goal">
                  <select name="objectiveId" required>
                    {state.objectives
                      .filter((o) => o.status === 'Active')
                      .map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.title}
                        </option>
                      ))}
                  </select>
                </Field>
                <Field label="Owner">
                  <input
                    name="owner"
                    required
                    defaultValue="Alex Morgan (sample)"
                    maxLength={200}
                  />
                </Field>
                <Field label="Due date">
                  <input name="dueDate" type="date" />
                </Field>
                <div className="modal-actions">
                  <Button variant="secondary" onClick={() => setAddingAction(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">Add action</Button>
                </div>
              </form>
            </Modal>
          )}
          {resetting && (
            <Modal title="Reset this sample workspace?" onClose={() => setResetting(false)}>
              <p>
                Restore the sample goals, actions, and reviews for this profile, tier, and plan.
              </p>
              <div className="modal-actions">
                <Button variant="secondary" onClick={() => setResetting(false)}>
                  Keep changes
                </Button>
                <Button
                  onClick={() => {
                    setSamples((s) => ({
                      ...s,
                      [key]: createDemoScenario(profile, tier, effectivePlan),
                    }));
                    setResetting(false);
                    setNotice('Sample workspace reset.');
                  }}
                >
                  Confirm reset
                </Button>
              </div>
            </Modal>
          )}
        </div>
      </div>
    </div>
  );
}

function DemoTools({ plan }: { plan?: DemoPlan }) {
  const { catalog, error } = useEngineCatalog('/engines/catalog');
  const [code, setCode] = useState('');
  const [query, setQuery] = useState('');
  const [all, setAll] = useState(false);
  const engines = (catalog?.engines ?? []).filter(
    (e) =>
      (all || plan?.seats.includes(e.homeEngine)) &&
      `${e.engineName} ${e.area}`.toLowerCase().includes(query.toLowerCase()),
  );
  useEffect(() => {
    if (code && !engines.some((engine) => engine.code === code)) setCode('');
  }, [code, engines]);
  return (
    <section className="marketing-demo-panel">
      <h2>Tool demonstrations</h2>
      <p>
        The included suites follow the selected plan. Use “Show every tool” to demonstrate other
        plans. Runs are uncharged and do not change workspace entitlements.
      </p>
      <div className="marketing-demo-selectors">
        <Field label="Find a tool">
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} />
        </Field>
        <label>
          <input type="checkbox" checked={all} onChange={(e) => setAll(e.target.checked)} /> Show
          every tool
        </label>
      </div>
      {error && <p role="alert">{error}</p>}
      <Field label="Select a tool">
        <select value={code} onChange={(e) => setCode(e.target.value)}>
          <option value="">Choose a diagnostic</option>
          {engines.map((e) => (
            <option key={e.code} value={e.code}>
              {e.engineName} · {e.homeEngine}
            </option>
          ))}
        </select>
      </Field>
      {code && <SandboxDiagnostic key={code} code={code} />}
    </section>
  );
}
function SandboxDiagnostic({ code }: { code: string }) {
  const { manifest, running, result, error, run } = useEngineRun(code, true);
  const [replay, setReplay] = useState(0);
  return (
    <div className="marketing-demo-diagnostic">
      <video
        src={`/videos/engines/${code}.webm`}
        autoPlay
        muted
        loop
        playsInline
        aria-label="Selected tool walkthrough"
      />
      <p>Video: instructional overview. Form: actual tool analysis with illustrative inputs.</p>
      {error && <p role="alert">{error}</p>}
      {manifest && (
        <>
          <h3>{manifest.engineName}</h3>
          <p>{manifest.purpose}</p>
          {manifest.example && (
            <Button disabled={running} onClick={() => void run(manifest.example!).catch(() => {})}>
              {running ? 'Running…' : 'Run sample inputs'}
            </Button>
          )}
          <EngineForm
            key={replay}
            manifest={manifest}
            submitting={running}
            onSubmit={(input) => void run(input).catch(() => {})}
          />
          {result && (
            <>
              <EngineResultView result={result.result} />
              <Button variant="secondary" onClick={() => setReplay((r) => r + 1)}>
                Clear form
              </Button>
            </>
          )}
        </>
      )}
    </div>
  );
}
