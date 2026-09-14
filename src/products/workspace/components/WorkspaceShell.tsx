import {
  ArrowUpRight,
  Bell,
  CalendarDays,
  Check,
  ChevronDown,
  Command,
  Compass,
  GitBranch,
  Layers3,
  LayoutDashboard,
  ListTodo,
  LogOut,
  Menu,
  Plus,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  Sun,
  TrendingUp,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import type { FormEvent } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Link,
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
  useOutletContext,
} from 'react-router-dom';
import { api, ApiError, setWorkspaceScope } from '../../../api';
import { pageTheme } from '../../../pageThemes';
import { CanonicalCopy } from '../../../shared/content/CanonicalCopy';
import { contexts } from '../../../shared/lib/contexts';
import { Brand } from '../../../shared/ui/Brand';
import { Button } from '../../../shared/ui/Button';
import { Empty } from '../../../shared/ui/Empty';
import { Field } from '../../../shared/ui/Field';
import { Loading } from '../../../shared/ui/Loading';
import { Modal } from '../../../shared/ui/Modal';
import type { Action, Context, Status, WorkspaceState } from '../../../types';

export interface WorkspaceContext {
  state: WorkspaceState;
  refresh: () => Promise<void>;
  notify: (message: string) => void;
  newObjective: () => void;
  newAction: (objectiveId?: string) => void;
  updateAction: (action: Action, status: Status, decision?: 'approve' | 'return') => Promise<void>;
}
export function useWorkspace() {
  return useOutletContext<WorkspaceContext>();
}
const navigation = [
  ['Overview', '/os', LayoutDashboard],
  ['Today', '/os/today', Sun],
  ['Clarity', '/os/clarity', Compass],
  ['Capability', '/os/capability', Layers3],
  ['Consistency', '/os/consistency', ListTodo],
  ['Progress', '/os/progress', TrendingUp],
  ['Rhythm', '/os/rhythm', CalendarDays],
  ['Commercial', '/os/commercial', GitBranch],
  ['Knowledge', '/os/knowledge', Layers3],
  ['Concierge', '/os/concierge', ShieldCheck],
  ['Talent', '/os/talent', Users],
  ['Pricing', '/os/pricing', Wallet],
] as const;
export function WorkspaceShell() {
  const [state, setState] = useState<WorkspaceState | null>(null);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [modal, setModal] = useState<'objective' | 'action' | 'search' | null>(null);
  const [objectiveId, setObjectiveId] = useState('');
  const [mobile, setMobile] = useState(false);
  const [query, setQuery] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const refreshSequence = useRef(0);
  const displayedWorkspace = useRef<string | null>(null);
  const refresh = useCallback(async () => {
    const sequence = ++refreshSequence.current;
    try {
      const next = await api<WorkspaceState>('/state');
      if (sequence !== refreshSequence.current)
        throw new Error('A newer workspace request replaced this one.');
      if (displayedWorkspace.current && displayedWorkspace.current !== next.workspace.id) {
        setModal(null);
        setQuery('');
      }
      displayedWorkspace.current = next.workspace.id;
      setWorkspaceScope(next.workspace.id);
      setState(next);
      setError('');
    } catch (e) {
      if (sequence !== refreshSequence.current) throw e;
      if (e instanceof ApiError && e.status === 401) navigate('/login', { replace: true });
      else setError((e as Error).message);
      throw e;
    }
  }, [navigate]);
  useEffect(() => {
    void refresh().catch(() => {});
    const poll = () => {
      if (!document.hidden) void refresh().catch(() => {});
    };
    const timer = setInterval(poll, 15000);
    window.addEventListener('focus', poll);
    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', poll);
    };
  }, [refresh]);
  useEffect(() => {
    setMobile(false);
  }, [location.pathname]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(''), 4500);
    return () => clearTimeout(timer);
  }, [toast]);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setModal('search');
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);
  async function updateAction(action: Action, status: Status, decision?: 'approve' | 'return') {
    try {
      await api(
        `/actions/${action.id}`,
        { version: action.version, status, ...(decision ? { decision } : {}) },
        'PATCH',
      );
      await refresh();
      setToast(
        decision === 'approve' ? 'Action approved. Your decision is recorded.' : 'Action updated.',
      );
    } catch (e) {
      await refresh().catch(() => {});
      throw e;
    }
  }
  if (!state)
    return error ? (
      <div className="error-page">
        <h1>We couldn’t load your workspace.</h1>
        <p role="alert">{error}</p>
        <Button onClick={() => void refresh().catch(() => {})}>Try again</Button>
      </div>
    ) : (
      <Loading />
    );
  const pending = state.actions.filter((a) => a.status === 'Needs review').length;
  const current =
    [
      ...navigation,
      ['Companion', '/os/companion', Sparkles],
      ['Workflows', '/os/workflows', GitBranch],
      ['Governance', '/os/governance', ShieldCheck],
      ['Settings', '/os/settings', Settings2],
    ].find(([, path]) => path === location.pathname)?.[0] || 'Workspace';
  const ctx: WorkspaceContext = {
    state,
    refresh,
    notify: setToast,
    newObjective: () => setModal('objective'),
    newAction: (id) => {
      setObjectiveId(id || state.objectives[0]?.id || '');
      setModal('action');
    },
    updateAction,
  };
  const results = [
    ...state.objectives.map((o) => ({
      id: o.id,
      title: o.title,
      type: 'Objective',
      path: '/os/clarity',
    })),
    ...state.actions.map((a) => ({
      id: a.id,
      title: a.title,
      type: 'Action',
      path: '/os/consistency',
    })),
    ...navigation.map(([title, path]) => ({ id: path, title, type: 'Page', path })),
  ].filter((x) => x.title.toLowerCase().includes(query.toLowerCase()));
  return (
    <div className="workspace-layout">
      <a className="skip-link" href="#workspace-main">
        Skip to workspace
      </a>
      {mobile && (
        <button
          className="sidebar-backdrop"
          aria-label="Close navigation"
          onClick={() => setMobile(false)}
        />
      )}
      <aside className={`sidebar ${mobile ? 'sidebar-open' : ''}`}>
        <div className="sidebar-brand">
          <Brand compact light />
          <button
            className="icon-button mobile-menu"
            aria-label="Close navigation"
            onClick={() => setMobile(false)}
          >
            <X size={20} />
          </button>
        </div>
        <label className="workspace-switch">
          <span className="workspace-icon">{state.workspace.name[0]}</span>
          <span>
            <strong>{state.workspace.name}</strong>
            <small>{state.workspace.context} workspace</small>
          </span>
          <select
            aria-label="Switch workspace"
            value={state.workspace.id}
            onChange={async (event) => {
              const workspaceId = event.target.value;
              ++refreshSequence.current;
              setModal(null);
              setQuery('');
              setState(null);
              try {
                await api('/workspace/switch', { workspaceId });
                await refresh();
              } catch (error) {
                setToast((error as Error).message);
                await refresh().catch(() => {});
              }
            }}
          >
            {state.workspaces.map((workspace) => (
              <option value={workspace.id} key={workspace.id}>
                {workspace.name}
              </option>
            ))}
          </select>
          <ChevronDown size={14} />
        </label>
        <div className="sidebar-label">YOUR OPERATING SPACE</div>
        <nav aria-label="Workspace navigation">
          {navigation.map(([title, to, Icon]) => (
            <NavLink
              key={to}
              to={to}
              end
              className={({ isActive }) => (isActive ? 'sidebar-link active' : 'sidebar-link')}
            >
              <Icon size={18} strokeWidth={1.6} />
              {title}
              {title === 'Today' && pending > 0 && <span className="nav-count">{pending}</span>}
            </NavLink>
          ))}
          <div className="sidebar-divider" />
          <NavLink to="/os/companion" className="sidebar-link companion-link">
            <Sparkles size={18} />
            Companion<span className="new-label">GUIDED</span>
          </NavLink>
          <NavLink to="/os/workflows" className="sidebar-link">
            <GitBranch size={18} />
            Workflows
          </NavLink>
          <NavLink to="/os/governance" className="sidebar-link">
            <ShieldCheck size={18} />
            Governance
          </NavLink>
        </nav>
        <div className="sidebar-bottom">
          <div className="control-note">
            <ShieldCheck size={16} />
            <span>
              Your work. Your judgment.<small>You decide what happens next.</small>
            </span>
          </div>
          <NavLink to="/os/settings" className="sidebar-link">
            <Settings2 size={18} />
            Settings
          </NavLink>
          <div className="profile-row">
            <span className="avatar">
              {state.user.name
                .split(' ')
                .map((x) => x[0])
                .slice(0, 2)
                .join('')}
            </span>
            <span>
              <strong>{state.user.name}</strong>
              <small>
                {state.user.demo ? 'Sample workspace' : `Workspace ${state.workspace.role}`}
              </small>
            </span>
            <button
              className="icon-button"
              aria-label="Sign out"
              onClick={async () => {
                try {
                  await api('/auth/logout', {});
                  navigate('/');
                } catch (e) {
                  setToast((e as Error).message);
                }
              }}
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>
      <div className="workspace-body">
        <header className="workspace-topbar">
          <div>
            <button
              className="icon-button mobile-menu"
              aria-label="Open workspace navigation"
              onClick={() => setMobile(true)}
            >
              <Menu size={20} />
            </button>
            <span className="breadcrumb-root">Workspace</span>
            <span className="breadcrumb-slash">/</span>
            <span>{String(current)}</span>
          </div>
          <div>
            <button className="search-button" onClick={() => setModal('search')}>
              <Search size={16} />
              <span>Search your workspace</span>
              <kbd>
                <Command size={10} /> K
              </kbd>
            </button>
            <Link
              className="notification-button icon-button"
              to="/os/today"
              aria-label={`${pending} actions need review`}
            >
              <Bell size={19} />
              {pending > 0 && <span />}
            </Link>
            <span className="topbar-divider" />
            <span className="avatar avatar-small">{state.user.name[0]}</span>
          </div>
        </header>
        {state.user.demo && (
          <div className="demo-banner">
            <span>
              <span className="gold-dot" /> Your own sample workspace. Explore freely; changes are
              saved in this session.
            </span>
            <Link to="/signup">
              Create your workspace <ArrowUpRight size={13} />
            </Link>
          </div>
        )}
        <main
          id="workspace-main"
          className="workspace-main"
          data-page-theme={pageTheme(location.pathname)}
          tabIndex={-1}
        >
          {error && (
            <p className="form-error" role="alert">
              {error} <button onClick={() => void refresh().catch(() => {})}>Retry</button>
            </p>
          )}
          <Outlet key={state.workspace.id} context={ctx} />
          <CanonicalCopy path={location.pathname} embedded />
        </main>
        <footer className="workspace-footer">
          <span>
            <span className="live-dot" /> Context connected. Judgment stays human.
          </span>
          <span>LAMID ONE · Development edition</span>
        </footer>
      </div>
      {toast && (
        <div className="toast" role="status">
          <Check size={17} />
          {toast}
          <button aria-label="Dismiss message" onClick={() => setToast('')}>
            <X size={14} />
          </button>
        </div>
      )}
      {modal === 'objective' && (
        <ObjectiveForm
          context={state.workspace.context}
          onClose={() => setModal(null)}
          onSaved={async () => {
            await refresh();
            setModal(null);
            setToast('Your objective is ready. Define the next step.');
          }}
        />
      )}
      {modal === 'action' && (
        <ActionForm
          state={state}
          objectiveId={objectiveId}
          onClose={() => setModal(null)}
          onSaved={async () => {
            await refresh();
            setModal(null);
            setToast('Next action added.');
          }}
        />
      )}
      {modal === 'search' && (
        <Modal
          title="Find your context"
          onClose={() => {
            setModal(null);
            setQuery('');
          }}
        >
          <div className="search-input">
            <Search size={19} />
            <input
              aria-label="Search objectives, actions, and pages"
              placeholder="Search objectives, actions, and pages…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="search-results">
            {results.slice(0, 12).map((result) => (
              <Link
                key={result.id}
                to={result.path}
                onClick={() => {
                  setModal(null);
                  setQuery('');
                }}
              >
                <span>
                  <small>{result.type}</small>
                  {result.title}
                </span>
                <ArrowUpRight size={16} />
              </Link>
            ))}
            {results.length === 0 && (
              <Empty title="No matching context">Try another word or create a new objective.</Empty>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
function ObjectiveForm({
  context,
  onSaved,
  onClose,
}: {
  context: Context;
  onSaved: () => Promise<void>;
  onClose: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget));
    setBusy(true);
    try {
      await api('/objectives', data);
      await onSaved();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title="What do you want to move forward?" onClose={onClose}>
      <p className="modal-description">Start with an outcome. You can build the work around it.</p>
      <form onSubmit={submit}>
        <Field label="Your objective">
          <input
            name="title"
            required
            maxLength={500}
            placeholder="e.g. Launch a focused advisory service"
          />
        </Field>
        <Field label="Why it matters">
          <textarea
            name="description"
            maxLength={5000}
            rows={3}
            placeholder="Describe the situation and the change you want to make."
          />
        </Field>
        <div className="form-grid">
          <Field label="Context">
            <select name="context" defaultValue={context}>
              {contexts.map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </Field>
          <Field label="Priority">
            <select name="priority" defaultValue="Medium">
              <option>High</option>
              <option>Medium</option>
              <option>Low</option>
            </select>
          </Field>
        </div>
        <Field label="What does success look like?">
          <input
            name="success"
            maxLength={5000}
            placeholder="An observable result, in your own words"
          />
        </Field>
        <Field label="Constraints to keep in view">
          <input
            name="constraints"
            maxLength={5000}
            placeholder="Time, resources, assumptions, or boundaries"
          />
        </Field>
        <Field label="Target date (optional)">
          <input type="date" name="targetDate" />
        </Field>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <div className="modal-actions">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={busy}>
            {busy ? 'Saving…' : 'Create objective'}
            <Plus size={16} />
          </Button>
        </div>
      </form>
    </Modal>
  );
}
function ActionForm({
  state,
  objectiveId,
  onSaved,
  onClose,
}: {
  state: WorkspaceState;
  objectiveId: string;
  onSaved: () => Promise<void>;
  onClose: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const data = {
      ...Object.fromEntries(form),
      requiresApproval: form.get('requiresApproval') === 'on',
      owner: state.user.name,
    };
    setBusy(true);
    try {
      await api('/actions', data);
      await onSaved();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title="Make the next step clear." onClose={onClose}>
      {state.objectives.length === 0 ? (
        <Empty title="Start with an objective">
          Create an objective first so every action has a purpose.
        </Empty>
      ) : (
        <form onSubmit={submit}>
          <Field label="Action">
            <input
              name="title"
              required
              maxLength={500}
              placeholder="One concrete step you can take"
            />
          </Field>
          <Field label="Connected objective">
            <select name="objectiveId" defaultValue={objectiveId}>
              {state.objectives.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.title}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Due date (optional)">
            <input name="dueDate" type="date" />
          </Field>
          <Field label="Notes and acceptance criteria">
            <textarea
              name="notes"
              rows={3}
              maxLength={5000}
              placeholder="What needs to be true before this is complete?"
            />
          </Field>
          <label className="checkbox-field">
            <input name="requiresApproval" type="checkbox" />
            <span>
              Require a review before completion
              <small>You must explicitly approve this action after reviewing it.</small>
            </span>
          </label>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <div className="modal-actions">
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? 'Saving…' : 'Add next action'}
              <Plus size={16} />
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
