import pg from 'pg';
import { randomUUID, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { AsyncLocalStorage } from 'node:async_hooks';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  acquireDatabaseClient,
  isDatabaseConnectionError,
  markDatabaseError,
} from './databaseErrors.mjs';

// This module is the one common dependency of every entry point that needs DATABASE_URL
// (the production server, the e2e server, and every test file run directly via `node --test`,
// none of which otherwise load .env themselves) — loading it here, once, guarantees it's always
// set before the first openStore() call. Safe no-op in real deployments with no .env file.
if (existsSync('.env')) process.loadEnvFile('.env');

// Supabase's pooler presents a certificate chain rooted at its own (self-signed) CA, not one in
// Node's default trust store — `rejectUnauthorized: false` previously accepted ANY certificate
// from anyone, silently disabling TLS verification entirely (MITM-vulnerable). Pinning Supabase's
// actual public root CA here restores real verification. This is Supabase-specific by design —
// this codebase is built around Supabase's Session Pooler throughout — so migrating to a
// different Postgres host later means swapping this file, not just the connection string.
const SUPABASE_CA = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), 'supabase-ca.pem'),
  'utf8',
);
const sslConfig = { rejectUnauthorized: true, ca: SUPABASE_CA };

// pg returns BIGINT (OID 20) as strings by default, to avoid silently losing precision beyond
// Number.MAX_SAFE_INTEGER. Every BIGINT column in this schema holds an epoch-millisecond
// timestamp (Date.now()-based), safely within that range for millennia, and the app expects
// plain numbers here — node:sqlite always returned proper numbers. Parsing globally, once, means
// no call site anywhere in the app needs to know or care that the column type changed.
pg.types.setTypeParser(20, (value) => parseInt(value, 10));
// Same story for NUMERIC (OID 1700) — Postgres's AVG() over an integer column (e.g. AVG(rating))
// returns NUMERIC, which pg also stringifies by default ("5.0000000000000000" instead of 5).
// There are no arbitrary-precision NUMERIC/DECIMAL business columns in this schema — every use is
// an AVG() aggregate over small rating values — so a plain float is always safe here too.
pg.types.setTypeParser(1700, (value) => parseFloat(value));

const scrypt = promisify(scryptCallback);
export async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const hash = await scrypt(password, salt, 64);
  return `${salt}:${hash.toString('hex')}`;
}
export async function verifyPassword(password, stored) {
  const [salt, hash] = stored.split(':');
  const actual = await scrypt(password, salt, 64);
  return timingSafeEqual(Buffer.from(hash, 'hex'), actual);
}

// Every call site across the app writes `?`-style positional placeholders (the SQLite
// convention). Translating them to Postgres's `$1,$2,...` here, once, means ~390 of the ~405
// query call sites outside this file need zero textual changes for the Postgres migration.
function toPgSql(sql) {
  let i = 0;
  return sql.replace(/\?/g, () => `$${++i}`);
}

// Routes every query through the active transaction's checked-out client when one exists,
// otherwise checks out a fresh client from the pool per call. This is what lets
// `store.transaction(() => {...})` callbacks keep closing over `db` exactly as they do today —
// no explicit client/tx parameter needs to be threaded through the ~25 files and ~84 transaction
// call sites that use it.
const als = new AsyncLocalStorage();

// Every pool is deliberately created with identical, generic connection parameters (see
// openStore below — no per-schema `options`/startup parameters). Supabase's Session Pooler
// (Supavisor) appears to bucket connections into distinct internal "pools" keyed by their exact
// startup parameters, capped independently of total connection count — giving each disposable
// test schema its own `-c search_path=...` startup option hit that cap (EMAXPOOLSREACHED) almost
// immediately with more than a couple of schemas in play. Selecting the schema at the SQL level
// instead, on every checked-out client, keeps every pool identical from the pooler's point of
// view, while still giving each schema correct isolation.
export async function withClient(pool, schema, work) {
  const client = await acquireDatabaseClient(pool);
  // pool.on('error') (see openStore below) only covers a client that's IDLE, sitting unused in
  // the pool — one that's checked out (which this always is, for the lifetime of this function)
  // needs its own listener, or a connection severed between statements (not mid-query) is an
  // unhandled 'error' event on the Client itself, crashing the whole process the same way.
  // Confirmed by reproducing this exact crash during manual testing before adding this handler.
  // pg's Pool reuses the same underlying Client object across separate checkouts of an idle
  // connection — adding a listener on every checkout without ever removing it accumulates
  // indefinitely on that one long-lived object (confirmed via a real MaxListenersExceededWarning),
  // so it must come off again before release, symmetric with the add.
  let discard = false;
  let workStarted = false;
  const onError = (error) => {
    discard = true;
    console.error('Postgres client connection error:', error.message);
  };
  client.on('error', onError);
  try {
    await client.query(`SET search_path TO "${schema}"`);
    workStarted = true;
    return await work(client);
  } catch (error) {
    discard ||= isDatabaseConnectionError(error);
    if (workStarted && isDatabaseConnectionError(error)) error.commitOutcomeUnknown = true;
    throw markDatabaseError(error, pool);
  } finally {
    client.off('error', onError);
    client.release(discard);
  }
}

function createDb(pool, schema) {
  const run = (fn) => {
    const active = als.getStore();
    return active
      ? fn(active).catch((error) => {
          throw markDatabaseError(error, pool);
        })
      : withClient(pool, schema, fn);
  };
  return {
    prepare(sql) {
      const pgSql = toPgSql(sql);
      return {
        async get(...args) {
          const result = await run((client) => client.query(pgSql, args));
          return result.rows[0];
        },
        async all(...args) {
          const result = await run((client) => client.query(pgSql, args));
          return result.rows;
        },
        async run(...args) {
          const result = await run((client) => client.query(pgSql, args));
          return { changes: result.rowCount };
        },
      };
    },
    // Parameter-free `exec` uses pg's simple query protocol, which (like SQLite's db.exec)
    // supports multiple `;`-separated statements in one call — used for migration DDL blocks.
    async exec(sql) {
      await run((client) => client.query(sql));
    },
    async close() {
      await pool.end();
    },
  };
}

export function createTransaction(pool, schema) {
  return async function transaction(work) {
    if (als.getStore())
      throw new Error(
        'Nested transactions are not supported: a transaction() call was made while one was already active.',
      );
    const client = await acquireDatabaseClient(pool);
    // See the identical comment in withClient above — a checked-out client needs its own error
    // listener, not just the pool's, and it must come off again before release (pg reuses the
    // same Client object across checkouts, so an unpaired add leaks listeners indefinitely).
    let discard = false;
    let phase = 'begin';
    const onError = (error) => {
      discard = true;
      console.error('Postgres client connection error:', error.message);
    };
    client.on('error', onError);
    try {
      await client.query(`SET search_path TO "${schema}"`);
      await client.query('BEGIN');
      phase = 'work';
      const result = await als.run(client, () => work());
      phase = 'commit';
      await client.query('COMMIT');
      return result;
    } catch (error) {
      if (phase !== 'work') markDatabaseError(error, pool);
      if (phase === 'commit' && isDatabaseConnectionError(error)) error.commitOutcomeUnknown = true;
      discard ||= isDatabaseConnectionError(error);
      if (!discard) {
        try {
          await client.query('ROLLBACK');
        } catch {
          discard = true;
        }
      }
      throw error;
    } finally {
      client.off('error', onError);
      client.release(discard);
    }
  };
}

function sanitizeSchemaName(name) {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '_')
      .slice(0, 60) || 'public'
  );
}

// The single consolidated schema (replaces 31 sequential SQLite migrations). There is no
// production data to preserve pre-launch, and several of the 31 were bug-then-fix pairs
// (see git history) that cannot recur when every table is created once, in final column order.
// Kept schema-agnostic (no explicit schema-qualified names) so the exact same DDL text is used
// for the real `public` schema and every disposable per-test-file schema alike — routed by
// each connection's `search_path`, set at connection-startup time in `openStore` below.
const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS migrations (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY, email TEXT UNIQUE, password TEXT, name TEXT NOT NULL,
  demo INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL,
  verified_at BIGINT, disabled_at BIGINT, points_balance INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS workspaces (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL UNIQUE REFERENCES users(id), name TEXT NOT NULL,
  context TEXT NOT NULL, tier TEXT NOT NULL DEFAULT 'individual', member_limit INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id),
  expires_at BIGINT NOT NULL, workspace_id TEXT REFERENCES workspaces(id)
);
CREATE TABLE IF NOT EXISTS workspace_members (
  workspace_id TEXT NOT NULL REFERENCES workspaces(id), user_id TEXT NOT NULL REFERENCES users(id),
  role TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'active', created_at BIGINT NOT NULL,
  PRIMARY KEY (workspace_id, user_id)
);
CREATE TABLE IF NOT EXISTS job_posts (
  id TEXT PRIMARY KEY, workspace_id TEXT NOT NULL REFERENCES workspaces(id),
  client_user_id TEXT NOT NULL REFERENCES users(id), title TEXT NOT NULL, category TEXT NOT NULL,
  project_type TEXT NOT NULL, description TEXT NOT NULL, deliverables TEXT NOT NULL,
  budget_min INTEGER NOT NULL, budget_max INTEGER NOT NULL, currency TEXT NOT NULL,
  timeline TEXT NOT NULL, status TEXT NOT NULL, created_at BIGINT NOT NULL,
  tags TEXT NOT NULL DEFAULT '[]'
);
CREATE TABLE IF NOT EXISTS bids (
  id TEXT PRIMARY KEY, job_id TEXT NOT NULL REFERENCES job_posts(id),
  workspace_id TEXT NOT NULL REFERENCES workspaces(id), freelancer_user_id TEXT NOT NULL REFERENCES users(id),
  cover_letter TEXT NOT NULL, proposed_amount INTEGER NOT NULL, currency TEXT NOT NULL,
  timeline TEXT NOT NULL, status TEXT NOT NULL, created_at BIGINT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS bids_one_per_user_job ON bids(job_id, freelancer_user_id);
CREATE TABLE IF NOT EXISTS proposals (
  id TEXT PRIMARY KEY, workspace_id TEXT NOT NULL REFERENCES workspaces(id),
  job_id TEXT NOT NULL REFERENCES job_posts(id), bid_id TEXT REFERENCES bids(id),
  author_user_id TEXT NOT NULL REFERENCES users(id), source_type TEXT NOT NULL, title TEXT NOT NULL,
  scope TEXT NOT NULL, deliverables TEXT NOT NULL, amount INTEGER NOT NULL, currency TEXT NOT NULL,
  timeline TEXT NOT NULL, status TEXT NOT NULL, created_at BIGINT NOT NULL
);
CREATE TABLE IF NOT EXISTS points_ledger (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), workspace_id TEXT REFERENCES workspaces(id),
  amount INTEGER NOT NULL, reason TEXT NOT NULL, reference_id TEXT, created_at BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS job_posts_workspace ON job_posts(workspace_id, status, created_at);
CREATE INDEX IF NOT EXISTS bids_job ON bids(job_id, status, created_at);
CREATE INDEX IF NOT EXISTS proposals_job ON proposals(job_id, created_at);
CREATE TABLE IF NOT EXISTS records (
  id TEXT PRIMARY KEY, workspace_id TEXT NOT NULL REFERENCES workspaces(id), kind TEXT NOT NULL,
  data TEXT NOT NULL, version INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL,
  seq BIGSERIAL
);
CREATE INDEX IF NOT EXISTS records_workspace ON records(workspace_id, kind);
CREATE TABLE IF NOT EXISTS audit (
  id TEXT PRIMARY KEY, workspace_id TEXT NOT NULL REFERENCES workspaces(id), actor TEXT NOT NULL,
  action TEXT NOT NULL, object_id TEXT, detail TEXT NOT NULL, created_at TEXT NOT NULL,
  seq BIGSERIAL
);
CREATE INDEX IF NOT EXISTS audit_workspace ON audit(workspace_id, created_at);
CREATE TABLE IF NOT EXISTS account_tokens (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), kind TEXT NOT NULL,
  token_hash TEXT UNIQUE NOT NULL, expires_at BIGINT NOT NULL, used_at BIGINT, created_at BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS account_tokens_lookup ON account_tokens(token_hash, kind, expires_at);

CREATE TABLE IF NOT EXISTS idempotency (
  user_id TEXT NOT NULL REFERENCES users(id), workspace_id TEXT NOT NULL REFERENCES workspaces(id),
  operation TEXT NOT NULL, key TEXT NOT NULL, fingerprint TEXT NOT NULL,
  status INTEGER NOT NULL, response TEXT NOT NULL, created_at BIGINT NOT NULL,
  PRIMARY KEY(user_id, workspace_id, operation, key)
);

CREATE TABLE IF NOT EXISTS workflow_runs (
  id TEXT PRIMARY KEY, workspace_id TEXT NOT NULL REFERENCES workspaces(id),
  principal_id TEXT NOT NULL REFERENCES users(id), title TEXT NOT NULL,
  objective_id TEXT NOT NULL REFERENCES records(id), state TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1, steps TEXT NOT NULL,
  start_at BIGINT NOT NULL, expires_at BIGINT NOT NULL,
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL, reason TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS workflow_due ON workflow_runs(state, start_at);
CREATE TABLE IF NOT EXISTS tool_invocations (
  id TEXT PRIMARY KEY, run_id TEXT NOT NULL REFERENCES workflow_runs(id) ON DELETE CASCADE,
  step_id TEXT NOT NULL, tool_id TEXT NOT NULL, tool_version TEXT NOT NULL,
  principal_id TEXT NOT NULL, workspace_id TEXT NOT NULL,
  input TEXT NOT NULL, output TEXT NOT NULL, created_at TEXT NOT NULL,
  UNIQUE(run_id, step_id)
);

CREATE TABLE IF NOT EXISTS administration_audit (
  id TEXT PRIMARY KEY, actor_id TEXT NOT NULL, action TEXT NOT NULL,
  object_id TEXT NOT NULL, created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS ai_usage (
  id TEXT PRIMARY KEY, workspace_id TEXT NOT NULL REFERENCES workspaces(id),
  principal_id TEXT NOT NULL, created_at BIGINT NOT NULL, status TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS ai_usage_workspace_day ON ai_usage(workspace_id, created_at);

CREATE TABLE IF NOT EXISTS agent_manifests (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, home_engine TEXT NOT NULL,
  max_authority TEXT NOT NULL, human_gate TEXT NOT NULL,
  allowed_tool_ids TEXT NOT NULL, created_at TEXT NOT NULL,
  points_cost INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS agent_runs (
  id TEXT PRIMARY KEY, workspace_id TEXT NOT NULL REFERENCES workspaces(id),
  principal_id TEXT NOT NULL REFERENCES users(id),
  agent_id TEXT NOT NULL REFERENCES agent_manifests(id),
  input TEXT NOT NULL, output TEXT, status TEXT NOT NULL,
  created_at TEXT NOT NULL, completed_at TEXT
);
CREATE INDEX IF NOT EXISTS agent_runs_workspace ON agent_runs(workspace_id, created_at);

CREATE TABLE IF NOT EXISTS model_registry (
  id TEXT PRIMARY KEY, provider TEXT NOT NULL, use_case TEXT NOT NULL,
  status TEXT NOT NULL, created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS model_registry_use_case ON model_registry(use_case, status);

CREATE TABLE IF NOT EXISTS talent_profiles (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL UNIQUE REFERENCES users(id),
  headline TEXT NOT NULL DEFAULT '', skills TEXT NOT NULL DEFAULT '[]',
  experience_years INTEGER, availability TEXT, hourly_rate INTEGER, currency TEXT,
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
  location TEXT, languages TEXT NOT NULL DEFAULT '[]', portfolio_url TEXT,
  vetting_status TEXT NOT NULL DEFAULT 'unverified', vetted_at TEXT, vetted_by TEXT REFERENCES users(id),
  domains TEXT NOT NULL DEFAULT '[]', functions TEXT NOT NULL DEFAULT '[]', industries TEXT NOT NULL DEFAULT '[]',
  jurisdiction TEXT
);
CREATE TABLE IF NOT EXISTS talent_assessments (
  id TEXT PRIMARY KEY, profile_id TEXT NOT NULL REFERENCES talent_profiles(id),
  skill TEXT NOT NULL, score INTEGER NOT NULL, method TEXT NOT NULL, created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS talent_assessments_profile ON talent_assessments(profile_id);

CREATE TABLE IF NOT EXISTS expert_teams (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, lead_user_id TEXT NOT NULL REFERENCES users(id),
  description TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY, workspace_id TEXT NOT NULL REFERENCES workspaces(id),
  job_id TEXT REFERENCES job_posts(id), title TEXT NOT NULL, status TEXT NOT NULL,
  created_at TEXT NOT NULL, freelancer_user_id TEXT REFERENCES users(id),
  assigned_team_id TEXT REFERENCES expert_teams(id)
);
CREATE INDEX IF NOT EXISTS projects_workspace ON projects(workspace_id, status);
CREATE TABLE IF NOT EXISTS milestones (
  id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES projects(id),
  title TEXT NOT NULL, description TEXT NOT NULL DEFAULT '', amount INTEGER NOT NULL,
  currency TEXT NOT NULL, due_date TEXT, status TEXT NOT NULL, created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS milestones_project ON milestones(project_id, status);
CREATE TABLE IF NOT EXISTS deliverables (
  id TEXT PRIMARY KEY, milestone_id TEXT NOT NULL REFERENCES milestones(id),
  title TEXT NOT NULL, description TEXT NOT NULL DEFAULT '', status TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS deliverables_milestone ON deliverables(milestone_id);

CREATE TABLE IF NOT EXISTS scope_items (
  id TEXT PRIMARY KEY, job_id TEXT NOT NULL REFERENCES job_posts(id),
  title TEXT NOT NULL, description TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS scope_items_job ON scope_items(job_id);
CREATE TABLE IF NOT EXISTS acceptance_criteria (
  id TEXT PRIMARY KEY, deliverable_id TEXT NOT NULL REFERENCES deliverables(id),
  criterion TEXT NOT NULL, status TEXT NOT NULL, created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS acceptance_criteria_deliverable ON acceptance_criteria(deliverable_id);
CREATE TABLE IF NOT EXISTS change_orders (
  id TEXT PRIMARY KEY, proposal_id TEXT NOT NULL REFERENCES proposals(id),
  description TEXT NOT NULL, amount_delta INTEGER NOT NULL DEFAULT 0, currency TEXT NOT NULL,
  status TEXT NOT NULL, created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS change_orders_proposal ON change_orders(proposal_id);

CREATE TABLE IF NOT EXISTS submissions (
  id TEXT PRIMARY KEY, milestone_id TEXT NOT NULL REFERENCES milestones(id),
  submitted_by TEXT NOT NULL REFERENCES users(id), notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS submissions_milestone ON submissions(milestone_id);
CREATE TABLE IF NOT EXISTS submission_assets (
  id TEXT PRIMARY KEY, submission_id TEXT NOT NULL REFERENCES submissions(id),
  url TEXT NOT NULL, kind TEXT NOT NULL, created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS submission_assets_submission ON submission_assets(submission_id);
CREATE TABLE IF NOT EXISTS verification_cases (
  id TEXT PRIMARY KEY, submission_id TEXT NOT NULL REFERENCES submissions(id),
  status TEXT NOT NULL, method TEXT NOT NULL, confidence DOUBLE PRECISION, created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS verification_cases_submission ON verification_cases(submission_id);
CREATE TABLE IF NOT EXISTS criterion_results (
  id TEXT PRIMARY KEY, verification_case_id TEXT NOT NULL REFERENCES verification_cases(id),
  criterion_id TEXT NOT NULL REFERENCES acceptance_criteria(id), result TEXT NOT NULL,
  rationale TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS criterion_results_case ON criterion_results(verification_case_id);

CREATE TABLE IF NOT EXISTS approvals (
  id TEXT PRIMARY KEY, subject_type TEXT NOT NULL, subject_id TEXT NOT NULL,
  approver_id TEXT NOT NULL REFERENCES users(id), decision TEXT NOT NULL,
  reason TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS approvals_subject ON approvals(subject_type, subject_id);
CREATE TABLE IF NOT EXISTS disputes (
  id TEXT PRIMARY KEY, subject_type TEXT NOT NULL, subject_id TEXT NOT NULL,
  opened_by TEXT NOT NULL REFERENCES users(id), reason TEXT NOT NULL,
  status TEXT NOT NULL, created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS disputes_subject ON disputes(subject_type, subject_id);

CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES projects(id),
  title TEXT NOT NULL, description TEXT NOT NULL DEFAULT '', status TEXT NOT NULL,
  assignee_user_id TEXT REFERENCES users(id), due_at TEXT,
  blocked INTEGER NOT NULL DEFAULT 0, blocked_reason TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS tasks_project ON tasks(project_id, status);

CREATE TABLE IF NOT EXISTS project_change_requests (
  id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES projects(id),
  title TEXT NOT NULL, description TEXT NOT NULL DEFAULT '',
  requested_by TEXT NOT NULL REFERENCES users(id), status TEXT NOT NULL,
  decided_by TEXT REFERENCES users(id), decided_at TEXT, decision_reason TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS project_change_requests_project ON project_change_requests(project_id, status);

CREATE TABLE IF NOT EXISTS kpi_definitions (
  id TEXT PRIMARY KEY, workspace_id TEXT NOT NULL REFERENCES workspaces(id),
  name TEXT NOT NULL, unit TEXT NOT NULL DEFAULT '', target DOUBLE PRECISION, created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS kpi_definitions_workspace ON kpi_definitions(workspace_id);
CREATE TABLE IF NOT EXISTS kpi_observations (
  id TEXT PRIMARY KEY, kpi_id TEXT NOT NULL REFERENCES kpi_definitions(id),
  value DOUBLE PRECISION NOT NULL, observed_at TEXT NOT NULL, source TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS kpi_observations_kpi ON kpi_observations(kpi_id, observed_at);

CREATE TABLE IF NOT EXISTS learning_paths (
  id TEXT PRIMARY KEY, workspace_id TEXT NOT NULL REFERENCES workspaces(id),
  title TEXT NOT NULL, description TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL,
  domain TEXT, function TEXT, industry TEXT, estimated_hours DOUBLE PRECISION,
  points_cost INTEGER, language TEXT NOT NULL DEFAULT 'en',
  coach_user_id TEXT REFERENCES users(id), created_by TEXT REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS learning_paths_workspace ON learning_paths(workspace_id);
CREATE TABLE IF NOT EXISTS learning_enrollments (
  id TEXT PRIMARY KEY, path_id TEXT NOT NULL REFERENCES learning_paths(id),
  user_id TEXT NOT NULL REFERENCES users(id), status TEXT NOT NULL,
  progress INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL,
  assigned_by TEXT REFERENCES users(id), due_at TEXT, completed_at TEXT
);
CREATE INDEX IF NOT EXISTS learning_enrollments_path ON learning_enrollments(path_id, user_id);

CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY, workspace_id TEXT NOT NULL REFERENCES workspaces(id),
  subject TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL,
  project_id TEXT REFERENCES projects(id)
);
CREATE INDEX IF NOT EXISTS conversations_workspace ON conversations(workspace_id, created_at);
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY, conversation_id TEXT NOT NULL REFERENCES conversations(id),
  sender_id TEXT NOT NULL REFERENCES users(id), body TEXT NOT NULL, created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS messages_conversation ON messages(conversation_id, created_at);

CREATE TABLE IF NOT EXISTS connections (
  id TEXT PRIMARY KEY, workspace_id TEXT NOT NULL REFERENCES workspaces(id),
  provider TEXT NOT NULL, status TEXT NOT NULL, scopes TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS connections_workspace ON connections(workspace_id, provider);
CREATE TABLE IF NOT EXISTS webhook_receipts (
  id TEXT PRIMARY KEY, connection_id TEXT NOT NULL REFERENCES connections(id),
  event_type TEXT NOT NULL, payload TEXT NOT NULL, processed_at TEXT, created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS webhook_receipts_connection ON webhook_receipts(connection_id, created_at);

CREATE TABLE IF NOT EXISTS kyc_cases (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), status TEXT NOT NULL,
  provider TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS kyc_cases_user ON kyc_cases(user_id);
CREATE TABLE IF NOT EXISTS identity_evidence (
  id TEXT PRIMARY KEY, kyc_case_id TEXT NOT NULL REFERENCES kyc_cases(id),
  kind TEXT NOT NULL, reference TEXT NOT NULL, created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS identity_evidence_case ON identity_evidence(kyc_case_id);

CREATE TABLE IF NOT EXISTS payment_accounts (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id),
  provider TEXT NOT NULL, account_name TEXT NOT NULL, account_number TEXT NOT NULL,
  bank_code TEXT, recipient_code TEXT, created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS payment_accounts_user ON payment_accounts(user_id, provider);
CREATE TABLE IF NOT EXISTS payment_transfers (
  id TEXT PRIMARY KEY, workspace_id TEXT NOT NULL REFERENCES workspaces(id),
  milestone_id TEXT NOT NULL REFERENCES milestones(id), provider TEXT NOT NULL,
  amount_minor INTEGER NOT NULL, currency TEXT NOT NULL, recipient_code TEXT,
  status TEXT NOT NULL, provider_reference TEXT, failure_reason TEXT,
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS payment_transfers_milestone ON payment_transfers(milestone_id);
CREATE TABLE IF NOT EXISTS payment_webhook_events (
  id TEXT PRIMARY KEY, provider TEXT NOT NULL, event_type TEXT NOT NULL,
  provider_event_id TEXT NOT NULL, payload TEXT NOT NULL,
  processed_at TEXT, created_at TEXT NOT NULL,
  UNIQUE(provider, provider_event_id)
);

CREATE TABLE IF NOT EXISTS document_signatures (
  id TEXT PRIMARY KEY, agent_run_id TEXT NOT NULL REFERENCES agent_runs(id),
  signer_user_id TEXT NOT NULL REFERENCES users(id), signer_name TEXT NOT NULL,
  document_hash TEXT NOT NULL, signed_at TEXT NOT NULL, created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS document_signatures_run ON document_signatures(agent_run_id);

CREATE TABLE IF NOT EXISTS fx_rates (pair TEXT PRIMARY KEY, rate DOUBLE PRECISION NOT NULL, updated_at TEXT NOT NULL);

CREATE TABLE IF NOT EXISTS concierge_applications (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id),
  headline TEXT NOT NULL, experience TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending',
  reviewed_by TEXT REFERENCES users(id), reviewed_at TEXT,
  created_at TEXT NOT NULL, monthly_rate_minor INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS concierge_applications_user ON concierge_applications(user_id, status);

CREATE TABLE IF NOT EXISTS billing_line_items (
  id TEXT PRIMARY KEY, workspace_id TEXT NOT NULL REFERENCES workspaces(id),
  kind TEXT NOT NULL, description TEXT NOT NULL,
  amount_minor INTEGER NOT NULL, currency TEXT NOT NULL DEFAULT 'USD',
  period_start BIGINT NOT NULL, period_end BIGINT NOT NULL,
  created_at TEXT NOT NULL, paid_at TEXT,
  UNIQUE(workspace_id, kind, period_start)
);
CREATE INDEX IF NOT EXISTS billing_line_items_workspace ON billing_line_items(workspace_id, period_start);

CREATE TABLE IF NOT EXISTS bundles (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, description TEXT NOT NULL DEFAULT '',
  price_minor INTEGER NOT NULL, currency TEXT NOT NULL DEFAULT 'USD',
  points_included INTEGER NOT NULL DEFAULT 0,
  billing_cycle TEXT NOT NULL DEFAULT 'one_time',
  status TEXT NOT NULL DEFAULT 'draft',
  created_by TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS bundles_status ON bundles(status);
CREATE TABLE IF NOT EXISTS bundle_items (
  id TEXT PRIMARY KEY, bundle_id TEXT NOT NULL REFERENCES bundles(id),
  agent_id TEXT NOT NULL REFERENCES agent_manifests(id),
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS bundle_items_bundle ON bundle_items(bundle_id);

CREATE TABLE IF NOT EXISTS points_purchases (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id),
  workspace_id TEXT NOT NULL REFERENCES workspaces(id),
  points INTEGER NOT NULL, amount_minor INTEGER NOT NULL, currency TEXT NOT NULL DEFAULT 'USD',
  provider TEXT NOT NULL, provider_reference TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending', created_at TEXT NOT NULL,
  bundle_id TEXT REFERENCES bundles(id)
);
CREATE INDEX IF NOT EXISTS points_purchases_user ON points_purchases(user_id, status);

CREATE TABLE IF NOT EXISTS job_invitations (
  id TEXT PRIMARY KEY, job_id TEXT NOT NULL REFERENCES job_posts(id),
  workspace_id TEXT NOT NULL REFERENCES workspaces(id),
  freelancer_user_id TEXT NOT NULL REFERENCES users(id),
  invited_by TEXT NOT NULL REFERENCES users(id),
  message TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL, decided_at TEXT
);
CREATE INDEX IF NOT EXISTS job_invitations_job ON job_invitations(job_id, freelancer_user_id);
CREATE INDEX IF NOT EXISTS job_invitations_freelancer ON job_invitations(freelancer_user_id, status);

CREATE TABLE IF NOT EXISTS rate_limit_buckets (
  key TEXT PRIMARY KEY, count INTEGER NOT NULL, reset_at BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS rate_limit_buckets_reset ON rate_limit_buckets(reset_at);

CREATE TABLE IF NOT EXISTS milestone_fundings (
  id TEXT PRIMARY KEY, milestone_id TEXT NOT NULL REFERENCES milestones(id),
  workspace_id TEXT NOT NULL REFERENCES workspaces(id),
  provider TEXT NOT NULL, amount_minor INTEGER NOT NULL, currency TEXT NOT NULL,
  provider_reference TEXT NOT NULL UNIQUE, status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL, held_at TEXT, released_at TEXT, refunded_at TEXT
);
CREATE INDEX IF NOT EXISTS milestone_fundings_milestone ON milestone_fundings(milestone_id);

CREATE TABLE IF NOT EXISTS expert_credentials (
  id TEXT PRIMARY KEY, profile_id TEXT NOT NULL REFERENCES talent_profiles(id),
  type TEXT NOT NULL, title TEXT NOT NULL, issuer TEXT NOT NULL,
  issued_at TEXT, expires_at TEXT, evidence_url TEXT,
  verification_status TEXT NOT NULL DEFAULT 'pending',
  verified_at TEXT, verified_by TEXT REFERENCES users(id),
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS expert_credentials_profile ON expert_credentials(profile_id);

CREATE TABLE IF NOT EXISTS reviews (
  id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES projects(id),
  milestone_id TEXT NOT NULL REFERENCES milestones(id),
  reviewer_user_id TEXT NOT NULL REFERENCES users(id),
  reviewee_user_id TEXT NOT NULL REFERENCES users(id),
  rating INTEGER NOT NULL, comment TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS reviews_one_per_reviewer_milestone ON reviews(milestone_id, reviewer_user_id);
CREATE INDEX IF NOT EXISTS reviews_reviewee ON reviews(reviewee_user_id);

CREATE TABLE IF NOT EXISTS conflict_disclosures (
  id TEXT PRIMARY KEY, profile_id TEXT NOT NULL REFERENCES talent_profiles(id),
  description TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'disclosed',
  created_at TEXT NOT NULL, reviewed_at TEXT, reviewed_by TEXT REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS conflict_disclosures_profile ON conflict_disclosures(profile_id, status);

CREATE TABLE IF NOT EXISTS scoping_cases (
  id TEXT PRIMARY KEY, workspace_id TEXT NOT NULL REFERENCES workspaces(id),
  created_by TEXT NOT NULL REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'draft',
  objective TEXT NOT NULL DEFAULT '', problem_statement TEXT NOT NULL DEFAULT '',
  desired_outcome TEXT NOT NULL DEFAULT '', in_scope TEXT NOT NULL DEFAULT '',
  out_of_scope TEXT NOT NULL DEFAULT '', deliverables TEXT NOT NULL DEFAULT '',
  acceptance_criteria TEXT NOT NULL DEFAULT '', assumptions TEXT NOT NULL DEFAULT '',
  category TEXT, budget_context TEXT NOT NULL DEFAULT '', timeline_context TEXT NOT NULL DEFAULT '',
  risk_band TEXT NOT NULL DEFAULT 'green',
  published_job_id TEXT REFERENCES job_posts(id),
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL, jurisdiction TEXT
);
CREATE INDEX IF NOT EXISTS scoping_cases_workspace ON scoping_cases(workspace_id, status);

CREATE TABLE IF NOT EXISTS availability_slots (
  id TEXT PRIMARY KEY, profile_id TEXT NOT NULL REFERENCES talent_profiles(id),
  start_at TEXT NOT NULL, end_at TEXT NOT NULL, format TEXT NOT NULL DEFAULT 'advisory_session',
  status TEXT NOT NULL DEFAULT 'open', created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS availability_slots_profile ON availability_slots(profile_id, status);

CREATE TABLE IF NOT EXISTS bookings (
  id TEXT PRIMARY KEY, slot_id TEXT NOT NULL REFERENCES availability_slots(id),
  client_user_id TEXT NOT NULL REFERENCES users(id),
  expert_user_id TEXT NOT NULL REFERENCES users(id),
  project_id TEXT REFERENCES projects(id),
  status TEXT NOT NULL DEFAULT 'confirmed', notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS bookings_client ON bookings(client_user_id, status);
CREATE INDEX IF NOT EXISTS bookings_expert ON bookings(expert_user_id, status);

CREATE TABLE IF NOT EXISTS review_queue_entries (
  id TEXT PRIMARY KEY, scoping_case_id TEXT NOT NULL UNIQUE REFERENCES scoping_cases(id),
  risk_band TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending',
  claimed_by TEXT REFERENCES users(id), claimed_at TEXT, notes TEXT NOT NULL DEFAULT '',
  completed_at TEXT, created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS review_queue_status ON review_queue_entries(status, created_at);

CREATE TABLE IF NOT EXISTS jurisdiction_rules (
  id TEXT PRIMARY KEY, jurisdiction TEXT NOT NULL, category TEXT NOT NULL,
  requires_license INTEGER NOT NULL DEFAULT 1, notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS jurisdiction_rules_unique ON jurisdiction_rules(jurisdiction, category);

CREATE TABLE IF NOT EXISTS handoffs (
  id TEXT PRIMARY KEY, workspace_id TEXT NOT NULL REFERENCES workspaces(id),
  requested_by TEXT NOT NULL REFERENCES users(id),
  source TEXT NOT NULL, context_summary TEXT NOT NULL, context_snapshot TEXT NOT NULL DEFAULT '{}',
  target_user_id TEXT REFERENCES users(id), status TEXT NOT NULL DEFAULT 'pending',
  scoping_case_id TEXT REFERENCES scoping_cases(id), project_id TEXT REFERENCES projects(id),
  created_at TEXT NOT NULL, resolved_at TEXT
);
CREATE INDEX IF NOT EXISTS handoffs_workspace ON handoffs(workspace_id, status);
CREATE INDEX IF NOT EXISTS handoffs_target ON handoffs(target_user_id, status);

CREATE TABLE IF NOT EXISTS engagement_outcomes (
  id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES projects(id),
  workspace_id TEXT NOT NULL REFERENCES workspaces(id), created_by TEXT NOT NULL REFERENCES users(id),
  summary TEXT NOT NULL, learnings TEXT NOT NULL DEFAULT '', reusable_context TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS engagement_outcomes_workspace ON engagement_outcomes(workspace_id, created_at);
CREATE UNIQUE INDEX IF NOT EXISTS engagement_outcomes_project ON engagement_outcomes(project_id);

CREATE TABLE IF NOT EXISTS expert_team_members (
  id TEXT PRIMARY KEY, team_id TEXT NOT NULL REFERENCES expert_teams(id),
  user_id TEXT NOT NULL REFERENCES users(id), role TEXT NOT NULL DEFAULT '',
  access_scope TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS expert_team_members_unique ON expert_team_members(team_id, user_id);
CREATE INDEX IF NOT EXISTS expert_team_members_user ON expert_team_members(user_id);

CREATE TABLE IF NOT EXISTS learning_modules (
  id TEXT PRIMARY KEY, path_id TEXT NOT NULL REFERENCES learning_paths(id),
  title TEXT NOT NULL, description TEXT NOT NULL DEFAULT '',
  format TEXT NOT NULL DEFAULT 'reading', order_index INTEGER NOT NULL DEFAULT 0,
  estimated_minutes INTEGER, content_url TEXT, quiz_skill TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS learning_modules_path ON learning_modules(path_id, order_index);

CREATE TABLE IF NOT EXISTS learning_module_completions (
  id TEXT PRIMARY KEY, enrollment_id TEXT NOT NULL REFERENCES learning_enrollments(id),
  module_id TEXT NOT NULL REFERENCES learning_modules(id),
  score INTEGER, completed_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS learning_module_completions_unique ON learning_module_completions(enrollment_id, module_id);

CREATE TABLE IF NOT EXISTS learning_prerequisites (
  id TEXT PRIMARY KEY, path_id TEXT NOT NULL REFERENCES learning_paths(id),
  requires_path_id TEXT NOT NULL REFERENCES learning_paths(id)
);
CREATE UNIQUE INDEX IF NOT EXISTS learning_prerequisites_unique ON learning_prerequisites(path_id, requires_path_id);

CREATE TABLE IF NOT EXISTS learning_certificates (
  id TEXT PRIMARY KEY, enrollment_id TEXT NOT NULL UNIQUE REFERENCES learning_enrollments(id),
  credential_id TEXT REFERENCES expert_credentials(id),
  issued_at TEXT NOT NULL, expires_at TEXT
);

CREATE TABLE IF NOT EXISTS learning_feedback (
  id TEXT PRIMARY KEY, path_id TEXT NOT NULL REFERENCES learning_paths(id),
  user_id TEXT NOT NULL REFERENCES users(id),
  rating INTEGER NOT NULL, comment TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS learning_feedback_unique ON learning_feedback(path_id, user_id);

CREATE TABLE IF NOT EXISTS compliance_requirements (
  id TEXT PRIMARY KEY, workspace_id TEXT NOT NULL REFERENCES workspaces(id),
  path_id TEXT NOT NULL REFERENCES learning_paths(id),
  mandatory INTEGER NOT NULL DEFAULT 1, due_days INTEGER, created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS compliance_requirements_workspace ON compliance_requirements(workspace_id);

CREATE TABLE IF NOT EXISTS signup_signals (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  email_hash TEXT NOT NULL, device_hash TEXT NOT NULL, ip_hash TEXT NOT NULL, created_at BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS signup_ip ON signup_signals(ip_hash, created_at);

CREATE TABLE IF NOT EXISTS welcome_claims (
  user_id TEXT PRIMARY KEY, email_hash TEXT UNIQUE NOT NULL, device_hash TEXT,
  ip_hash TEXT, status TEXT NOT NULL, reason TEXT NOT NULL, created_at BIGINT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS welcome_device ON welcome_claims(device_hash) WHERE status = 'granted';
CREATE INDEX IF NOT EXISTS welcome_ip ON welcome_claims(ip_hash, created_at);

CREATE TABLE IF NOT EXISTS otp_challenges (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  purpose TEXT NOT NULL, code_hash TEXT NOT NULL, attempts INTEGER NOT NULL DEFAULT 0,
  expires_at BIGINT NOT NULL, used_at BIGINT, created_at BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS otp_user ON otp_challenges(user_id, purpose, created_at);

CREATE TABLE IF NOT EXISTS mail_outbox (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  payload TEXT NOT NULL, status TEXT NOT NULL, attempts INTEGER NOT NULL DEFAULT 0,
  next_at BIGINT NOT NULL, lease_until BIGINT, expires_at BIGINT NOT NULL, created_at BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS mail_pending ON mail_outbox(status, next_at);

CREATE TABLE IF NOT EXISTS service_leases (name TEXT PRIMARY KEY, owner TEXT NOT NULL, expires_at BIGINT NOT NULL);
CREATE TABLE IF NOT EXISTS account_security_keys (name TEXT PRIMARY KEY, value TEXT NOT NULL);
`;

const SEED_SQL = `
INSERT INTO agent_manifests (id, name, home_engine, max_authority, human_gate, allowed_tool_ids, created_at, points_cost) VALUES
  ('context-curator', 'Context Curator', 'Shared', 'A1', 'none', '[]', now()::text, 65),
  ('diagnostic-intelligence', 'Diagnostic Intelligence', 'Clarity', 'A1', 'none', '[]', now()::text, 65),
  ('workflow-orchestration', 'Workflow Orchestration', 'Consistency', 'A2', 'approve', '[]', now()::text, 5),
  ('signal-monitoring', 'Signal Monitoring', 'Shared', 'A1', 'none', '[]', now()::text, 65),
  ('capability-mapper', 'Capability Mapper', 'Capability', 'A1', 'none', '[]', now()::text, 65),
  ('performance-analytics', 'Performance Analytics', 'Growth', 'A1', 'none', '[]', now()::text, 65),
  ('market-intelligence', 'Market Intelligence', 'Growth', 'A1', 'none', '[]', now()::text, 65),
  ('proposal-drafter', 'Proposal Drafter', 'Capability', 'A1', 'none', '[]', now()::text, 65),
  ('scope-builder', 'Scope of Work Builder', 'Capability', 'A1', 'none', '[]', now()::text, 65),
  ('sow-builder', 'Statement of Work Builder', 'Capability', 'A1', 'none', '[]', now()::text, 65),
  ('brief-builder', 'Client Brief Builder', 'Capability', 'A1', 'none', '[]', now()::text, 65),
  ('deliverable-builder', 'Deliverable Builder', 'Capability', 'A1', 'none', '[]', now()::text, 65),
  ('acceptance-builder', 'Acceptance Criteria Builder', 'Capability', 'A1', 'none', '[]', now()::text, 65),
  ('change-order', 'Change Order Generator', 'Capability', 'A1', 'none', '[]', now()::text, 65),
  ('contract-builder', 'Contract Builder', 'Capability', 'A1', 'none', '[]', now()::text, 65),
  ('quote-generator', 'Quote Generator', 'Capability', 'A1', 'none', '[]', now()::text, 65),
  ('estimate-generator', 'Estimate Generator', 'Capability', 'A1', 'none', '[]', now()::text, 65),
  ('invoice-generator', 'Invoice Generator', 'Capability', 'A1', 'none', '[]', now()::text, 65),
  ('goal-advisor', 'Goal Advisor', 'Clarity', 'A1', 'none', '[]', now()::text, 65);

INSERT INTO model_registry (id, provider, use_case, status, created_at) VALUES
  ('companion-context-v1', 'openai', 'companion.context-curator', 'approved', now()::text),
  ('companion-diagnostic-v1', 'openai', 'companion.diagnostic-intelligence', 'approved', now()::text),
  ('companion-signal-v1', 'openai', 'companion.signal-monitoring', 'approved', now()::text),
  ('companion-capability-v1', 'openai', 'companion.capability-mapper', 'approved', now()::text),
  ('companion-analytics-v1', 'openai', 'companion.performance-analytics', 'approved', now()::text),
  ('companion-market-v1', 'openai', 'companion.market-intelligence', 'approved', now()::text),
  ('companion-proposal-v1', 'openai', 'companion.proposal-drafter', 'approved', now()::text),
  ('companion-scope-v1', 'openai', 'companion.scope-builder', 'approved', now()::text),
  ('companion-sow-v1', 'openai', 'companion.sow-builder', 'approved', now()::text),
  ('companion-brief-v1', 'openai', 'companion.brief-builder', 'approved', now()::text),
  ('companion-deliverable-v1', 'openai', 'companion.deliverable-builder', 'approved', now()::text),
  ('companion-acceptance-v1', 'openai', 'companion.acceptance-builder', 'approved', now()::text),
  ('companion-change-order-v1', 'openai', 'companion.change-order', 'approved', now()::text),
  ('companion-contract-v1', 'openai', 'companion.contract-builder', 'approved', now()::text),
  ('companion-goal-advisor-v1', 'openai', 'companion.goal-advisor', 'approved', now()::text),
  ('companion-verification-v1', 'openai', 'companion.deliverable-verification', 'approved', now()::text);

INSERT INTO fx_rates (pair, rate, updated_at) VALUES
  ('USD_EUR', 0.92, now()::text), ('EUR_USD', 1.09, now()::text),
  ('USD_GBP', 0.79, now()::text), ('GBP_USD', 1.27, now()::text),
  ('USD_NGN', 1450, now()::text), ('NGN_USD', 0.000690, now()::text),
  ('USD_CAD', 1.36, now()::text), ('CAD_USD', 0.735, now()::text),
  ('USD_AUD', 1.51, now()::text), ('AUD_USD', 0.662, now()::text);
`;

/**
 * `filename` keeps its historical name/positional meaning for call-site compatibility:
 *  - ':memory:' creates a randomly-named, disposable schema (test isolation).
 *  - any other string is sanitized and used directly as a real, reusable schema name.
 *  - omitted defaults to Postgres's own default schema, 'public' (normal/production use).
 *
 * `poolMax` is this *process's* share of the connection budget, not a fleet-wide total — under
 * Node clustering (server/index.mjs), every worker opens its own pool against the same Supabase
 * project, so the caller is responsible for dividing the total budget across worker count before
 * calling openStore. Test files run many pools concurrently too (see package.json's
 * --test-concurrency=3), so their ceiling must stay small and fixed regardless of environment:
 * 3 processes x 3 connections = 9, safely under the Session Pooler's 15-connection cap on lower
 * tiers.
 */
export async function openStore(filename, { poolMax } = {}) {
  const disposable = filename === ':memory:';
  const schema = disposable
    ? `test_${randomBytes(6).toString('hex')}`
    : sanitizeSchemaName(filename || 'public');

  // Any explicit `filename` (':memory:' or a named schema) only ever comes from test code —
  // server/index.mjs's real production boot never passes one. Routing every test call through a
  // dedicated TEST_DATABASE_URL, physically separate from the production project, means repeated
  // test runs (or a crashed run that skips its own cleanup) can never fill or corrupt production
  // data again. This throws rather than silently falling back to DATABASE_URL on purpose: a
  // missing TEST_DATABASE_URL should fail loudly, not quietly point tests at production.
  const isTestContext = filename !== undefined;
  if (isTestContext && !process.env.TEST_DATABASE_URL)
    throw new Error(
      "TEST_DATABASE_URL is not set. Tests must run against a separate Supabase project from production — set TEST_DATABASE_URL in .env to that project's connection string.",
    );
  const connectionString = isTestContext ? process.env.TEST_DATABASE_URL : process.env.DATABASE_URL;

  const bootstrap = new pg.Pool({
    connectionString,
    ssl: sslConfig,
    max: 1,
    connectionTimeoutMillis: 15000,
    statement_timeout: 30000,
    query_timeout: 35000,
    lock_timeout: 10000,
  });
  // node-postgres emits 'error' on the POOL (not the individual client) when an idle pooled
  // connection is severed — a network blip, Supabase recycling a connection, anything that
  // doesn't happen while the client is actively mid-query. With no listener, Node's default
  // behavior for an unhandled EventEmitter 'error' is to throw, crashing the entire process —
  // confirmed by reproducing exactly this crash during manual testing. A query in flight on that
  // connection still rejects normally to its caller; this only stops the *idle*-connection case
  // from taking down every other request the process is serving.
  bootstrap.on('error', (error) =>
    console.error('Idle Postgres connection error (bootstrap pool):', error.message),
  );
  let bootstrapClient;
  const onBootstrapClientError = (error) =>
    console.error('Postgres bootstrap connection error:', error.message);
  try {
    bootstrapClient = await acquireDatabaseClient(bootstrap, { attempts: 2 });
    bootstrapClient.on('error', onBootstrapClientError);
    await bootstrapClient.query(`CREATE SCHEMA IF NOT EXISTS "${schema}"`);
  } catch (error) {
    // Despite IF NOT EXISTS, Postgres's catalog check-then-create isn't itself atomic under true
    // concurrency: two processes racing to create the same schema (e.g. several cluster workers
    // starting simultaneously) can both pass the "not exists" check and both attempt the CREATE,
    // one hitting pg_namespace's own unique index. That failure means the schema now exists —
    // exactly the desired end state — so it's safe to swallow specifically this error.
    if (error.code !== '23505') throw error;
  } finally {
    bootstrapClient?.off('error', onBootstrapClientError);
    bootstrapClient?.release(true);
    await bootstrap.end();
  }

  const configuredPoolMax = Math.max(
    1,
    Math.floor(Number(poolMax) || Number(process.env.PG_POOL_MAX) || 10),
  );
  // Named reopen/shared-schema tests also use TEST_DATABASE_URL and must share its small budget.
  const resolvedPoolMax = isTestContext ? Math.min(3, configuredPoolMax) : configuredPoolMax;
  const pool = new pg.Pool({
    connectionString,
    ssl: sslConfig,
    connectionTimeoutMillis: 15000,
    statement_timeout: 30000,
    // Client deadline also bounds a query when the network cannot deliver the server timeout.
    query_timeout: 35000,
    lock_timeout: 10000,
    idle_in_transaction_session_timeout: 60000,
    // Every pool uses identical, generic connection parameters — deliberately no per-schema
    // startup `options` here; see the comment on withClient above for why. Schema selection
    // happens per-checkout instead, via a runtime `SET search_path`.
    max: resolvedPoolMax,
  });
  pool.on('error', (error) => console.error('Idle Postgres connection error:', error.message));

  let client;
  try {
    client = await acquireDatabaseClient(pool, { attempts: 2 });
  } catch (error) {
    await pool.end().catch(() => {});
    throw error;
  }
  // Symmetric add/remove — see the comment in withClient for why an unpaired add leaks listeners
  // on this pool's connections, which withClient/transaction go on to reuse for this store's
  // entire lifetime.
  const onClientError = (error) =>
    console.error('Postgres client connection error:', error.message);
  client.on('error', onClientError);
  try {
    await client.query(`SET search_path TO "${schema}"`);
    await client.query('BEGIN');
    // Serializes concurrent openStore() calls targeting the same schema — e.g. several Node
    // cluster workers all starting up at once against the production 'public' schema — so only
    // one of them actually runs the migration DDL/seed; the rest block here until it commits, then
    // correctly see migration 1 already applied and skip straight past it. Without this, several
    // workers could race on CREATE TABLE / the seed INSERTs simultaneously at startup. Transaction-
    // scoped, so the lock releases automatically at COMMIT/ROLLBACK below — no separate unlock.
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [schema]);
    await client.query(
      'CREATE TABLE IF NOT EXISTS migrations (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL)',
    );
    const already = await client.query('SELECT 1 FROM migrations WHERE version = 1');
    if (already.rowCount === 0) {
      await client.query(SCHEMA_SQL);
      await client.query(SEED_SQL);
      await client.query('INSERT INTO migrations VALUES (1, $1)', [new Date().toISOString()]);
    }
    await client.query(`CREATE TABLE IF NOT EXISTS refund_receipts (
      reference_id TEXT NOT NULL, reason TEXT NOT NULL, created_at BIGINT NOT NULL,
      PRIMARY KEY (reference_id, reason)
    );
    INSERT INTO refund_receipts SELECT reference_id, reason, MIN(created_at) FROM points_ledger
      WHERE reference_id IS NOT NULL AND reason IN ('agent_run_refund', 'ai_review_refund')
      GROUP BY reference_id, reason ON CONFLICT DO NOTHING;
    CREATE INDEX IF NOT EXISTS agent_history_owner ON agent_runs(workspace_id, principal_id, created_at);
    CREATE INDEX IF NOT EXISTS companion_task_owner ON records(workspace_id, (data::jsonb->>'ownerId'), seq) WHERE kind = 'companion_task';`);
    // tasks/project_change_requests were originally added only inside SCHEMA_SQL above, which never
    // re-runs once migration 1 is recorded — so on any database that had already migrated, these
    // tables would silently never be created. CREATE TABLE IF NOT EXISTS here is idempotent and
    // reaches both fresh and already-migrated databases, same fix pattern as the agent_manifests
    // blocks above.
    await client.query(`CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES projects(id),
      title TEXT NOT NULL, description TEXT NOT NULL DEFAULT '', status TEXT NOT NULL,
      assignee_user_id TEXT REFERENCES users(id), due_at TEXT,
      blocked INTEGER NOT NULL DEFAULT 0, blocked_reason TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL, updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS tasks_project ON tasks(project_id, status);
    CREATE TABLE IF NOT EXISTS project_change_requests (
      id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES projects(id),
      title TEXT NOT NULL, description TEXT NOT NULL DEFAULT '',
      requested_by TEXT NOT NULL REFERENCES users(id), status TEXT NOT NULL,
      decided_by TEXT REFERENCES users(id), decided_at TEXT, decision_reason TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS project_change_requests_project ON project_change_requests(project_id, status);`);
    // Goal lifecycle + subscriptions. Deliberately separate from the existing 'objective' record
    // kind (records table) rather than folding into it: objectives already have a stable 3-value
    // status (Active/Paused/Complete) that a lot of existing code/tests depend on, and the spec's
    // 12-stage lifecycle is an additive, optional refinement layered on top of a goal (= objective),
    // not a replacement for that status. One lifecycle row per goal; many subscription rows per goal.
    await client.query(`CREATE TABLE IF NOT EXISTS goal_lifecycle (
      goal_id TEXT PRIMARY KEY, workspace_id TEXT NOT NULL REFERENCES workspaces(id),
      stage TEXT NOT NULL DEFAULT 'captured', updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS goal_lifecycle_workspace ON goal_lifecycle(workspace_id);
    CREATE TABLE IF NOT EXISTS goal_subscriptions (
      id TEXT PRIMARY KEY, goal_id TEXT NOT NULL, workspace_id TEXT NOT NULL REFERENCES workspaces(id),
      signal_classes TEXT NOT NULL, constraints TEXT NOT NULL DEFAULT '{}',
      attention_policy TEXT NOT NULL DEFAULT 'digest', created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS goal_subscriptions_goal ON goal_subscriptions(goal_id);`);
    // Growth engine domain tables. kpi_definitions/kpi_observations already existed in SCHEMA_SQL
    // but had no application code behind them; opportunities/experiments are new. All three are
    // additive here (idempotent, unconditional) rather than in SCHEMA_SQL, per the same
    // migration-gating lesson as tasks/goal_lifecycle above.
    await client.query(`CREATE TABLE IF NOT EXISTS opportunities (
      id TEXT PRIMARY KEY, workspace_id TEXT NOT NULL REFERENCES workspaces(id),
      title TEXT NOT NULL, description TEXT NOT NULL DEFAULT '',
      source TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'identified',
      value_estimate DOUBLE PRECISION, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS opportunities_workspace ON opportunities(workspace_id, status);
    CREATE TABLE IF NOT EXISTS experiments (
      id TEXT PRIMARY KEY, workspace_id TEXT NOT NULL REFERENCES workspaces(id),
      title TEXT NOT NULL, hypothesis TEXT NOT NULL, metric TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'draft', result TEXT NOT NULL DEFAULT '',
      started_at TEXT, ended_at TEXT, created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS experiments_workspace ON experiments(workspace_id, status);`);
    // Signal Gateway: persisted matches found for a goal_subscriptions row. Evaluation itself is
    // on-demand (POST /api/goal-subscriptions/:id/scan in signals.mjs), not a cron job — there is
    // no background worker infrastructure in this codebase yet, and an on-demand scan is honest
    // about being pull-based rather than silently pretending to be push/real-time.
    await client.query(`CREATE TABLE IF NOT EXISTS signal_matches (
      id TEXT PRIMARY KEY, subscription_id TEXT NOT NULL REFERENCES goal_subscriptions(id),
      goal_id TEXT NOT NULL, workspace_id TEXT NOT NULL REFERENCES workspaces(id),
      signal_class TEXT NOT NULL, source_kind TEXT NOT NULL, source_id TEXT NOT NULL,
      title TEXT NOT NULL, summary TEXT NOT NULL DEFAULT '', matched_at TEXT NOT NULL,
      seen INTEGER NOT NULL DEFAULT 0,
      UNIQUE (subscription_id, source_kind, source_id)
    );
    CREATE INDEX IF NOT EXISTS signal_matches_subscription ON signal_matches(subscription_id, matched_at DESC);`);
    // Real file upload storage. This app's CSRF middleware requires every mutation to be
    // application/json (see app.mjs), so uploads are JSON-with-base64 rather than multipart —
    // consistent with the rest of the API instead of carving out a CSRF exception for one route.
    // Bytes are stored in Postgres (BYTEA), not local disk, since this app has no durable local
    // filesystem guarantee between deploys. kyc_cases/identity_evidence already existed in
    // SCHEMA_SQL with zero application code behind them (see kyc.mjs); users.kyc_verified_at is
    // new and deliberately separate from users.verified_at, which only gates AI-feature access.
    await client.query(`CREATE TABLE IF NOT EXISTS uploaded_files (
      id TEXT PRIMARY KEY, workspace_id TEXT NOT NULL REFERENCES workspaces(id),
      uploaded_by TEXT NOT NULL REFERENCES users(id),
      filename TEXT NOT NULL, mime_type TEXT NOT NULL, size_bytes INTEGER NOT NULL,
      content BYTEA NOT NULL, created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS uploaded_files_workspace ON uploaded_files(workspace_id);
    ALTER TABLE users ADD COLUMN IF NOT EXISTS kyc_verified_at TEXT;`);
    // Creation Studio: persisted, versioned output for the document-drafting agents
    // (proposal-drafter, scope-builder, sow-builder, brief-builder, deliverable-builder,
    // acceptance-builder, contract-builder, change-order), which previously returned one-shot AI
    // text with nothing saved. root_asset_id is null on a document's first version and points to
    // that first version's id on every later revision, so "all versions of this document" is one
    // query regardless of how many revisions exist.
    await client.query(`CREATE TABLE IF NOT EXISTS creation_assets (
      id TEXT PRIMARY KEY, workspace_id TEXT NOT NULL REFERENCES workspaces(id),
      created_by TEXT NOT NULL REFERENCES users(id),
      kind TEXT NOT NULL, title TEXT NOT NULL, content TEXT NOT NULL,
      version INTEGER NOT NULL DEFAULT 1, root_asset_id TEXT,
      job_id TEXT REFERENCES job_posts(id), proposal_id TEXT REFERENCES proposals(id),
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS creation_assets_workspace ON creation_assets(workspace_id, kind);
    CREATE INDEX IF NOT EXISTS creation_assets_root ON creation_assets(root_asset_id);`);
    // Expert-initiated engagement: today an expert can only pull work (browse the marketplace,
    // claim a review-queue entry) — nothing lets an expert register interest and be told about
    // new matching jobs. This is the same on-demand-scan pattern as the Signal Gateway
    // (goal_subscriptions/signal_matches above), applied to job_posts instead of goal signals.
    await client.query(`CREATE TABLE IF NOT EXISTS expert_watches (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id),
      categories TEXT NOT NULL DEFAULT '[]', keywords TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS expert_watches_user ON expert_watches(user_id);
    CREATE TABLE IF NOT EXISTS expert_watch_matches (
      id TEXT PRIMARY KEY, watch_id TEXT NOT NULL REFERENCES expert_watches(id),
      job_id TEXT NOT NULL REFERENCES job_posts(id), matched_at TEXT NOT NULL,
      seen INTEGER NOT NULL DEFAULT 0,
      UNIQUE (watch_id, job_id)
    );
    CREATE INDEX IF NOT EXISTS expert_watch_matches_watch ON expert_watch_matches(watch_id, matched_at DESC);`);
    // Shared Intelligence & Result Fabric: a typed, freshness-tracked result any agent/engine can
    // write and any other agent/engine (or the UI) can read back instead of recomputing — the
    // cross-engine reuse piece that was entirely absent before. One row per (subject, agent);
    // expires_at makes staleness explicit instead of silently trusting an old computation forever.
    // intelligence_conflicts is populated when two different agents reach a different conclusion
    // about the same subject while both results are still fresh — surfaced for a human to resolve,
    // never auto-reconciled, per "the human enforces AI controls" rather than another AI arbitrating.
    await client.query(`CREATE TABLE IF NOT EXISTS intelligence_results (
      id TEXT PRIMARY KEY, workspace_id TEXT NOT NULL REFERENCES workspaces(id),
      subject_kind TEXT NOT NULL, subject_id TEXT NOT NULL, agent_id TEXT NOT NULL,
      conclusion TEXT NOT NULL, summary TEXT NOT NULL,
      computed_at TEXT NOT NULL, expires_at TEXT NOT NULL,
      UNIQUE (workspace_id, subject_kind, subject_id, agent_id)
    );
    CREATE INDEX IF NOT EXISTS intelligence_results_subject ON intelligence_results(workspace_id, subject_kind, subject_id);
    CREATE TABLE IF NOT EXISTS intelligence_conflicts (
      id TEXT PRIMARY KEY, workspace_id TEXT NOT NULL REFERENCES workspaces(id),
      subject_kind TEXT NOT NULL, subject_id TEXT NOT NULL,
      agent_a TEXT NOT NULL, conclusion_a TEXT NOT NULL,
      agent_b TEXT NOT NULL, conclusion_b TEXT NOT NULL,
      detected_at TEXT NOT NULL, resolved INTEGER NOT NULL DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS intelligence_conflicts_subject ON intelligence_conflicts(workspace_id, subject_kind, subject_id, resolved);`);
    // Recommendation Lifecycle Manager (spec 20.8 / SI-10): a recommendation an agent makes is a
    // trackable object with its own state, not just a chat response the user reads once and loses.
    await client.query(`CREATE TABLE IF NOT EXISTS recommendations (
      id TEXT PRIMARY KEY, workspace_id TEXT NOT NULL REFERENCES workspaces(id),
      subject_kind TEXT NOT NULL, subject_id TEXT NOT NULL, agent_id TEXT NOT NULL,
      title TEXT NOT NULL, rationale TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'recommended',
      scheduled_for TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS recommendations_subject ON recommendations(workspace_id, subject_kind, subject_id, status);`);
    // Scope Reconciliation (spec 25.1 / PS-07): every save of a scoping case snapshots the prior
    // state as a new version, so "what changed between scope versions and why" is answerable
    // instead of PATCH silently overwriting the only copy.
    await client.query(`CREATE TABLE IF NOT EXISTS scope_versions (
      id TEXT PRIMARY KEY, scoping_case_id TEXT NOT NULL REFERENCES scoping_cases(id),
      version INTEGER NOT NULL, source TEXT NOT NULL,
      snapshot TEXT NOT NULL, reason TEXT NOT NULL DEFAULT '',
      created_by TEXT NOT NULL REFERENCES users(id), created_at TEXT NOT NULL,
      UNIQUE (scoping_case_id, version)
    );
    CREATE INDEX IF NOT EXISTS scope_versions_case ON scope_versions(scoping_case_id, version);`);
    // Asynchronous Expert Availability (spec 21.5 / EX-04 / PS-06): reviewer eligibility, timezone,
    // availability, review SLA and urgent/async capability are tracked, not assumed. A red-band
    // scoping case at 2am is not a dead end — it queues, and this is what lets the queue expose an
    // honest expected response window instead of a fabricated one.
    await client.query(`ALTER TABLE talent_profiles ADD COLUMN IF NOT EXISTS timezone TEXT;
      ALTER TABLE talent_profiles ADD COLUMN IF NOT EXISTS async_review_eligible INTEGER NOT NULL DEFAULT 0;
      ALTER TABLE talent_profiles ADD COLUMN IF NOT EXISTS urgent_review_eligible INTEGER NOT NULL DEFAULT 0;
      ALTER TABLE talent_profiles ADD COLUMN IF NOT EXISTS expected_response_hours INTEGER;
      ALTER TABLE review_queue_entries ADD COLUMN IF NOT EXISTS sla_due_at TEXT;
      ALTER TABLE talent_profiles ADD COLUMN IF NOT EXISTS seniority TEXT;
      ALTER TABLE talent_profiles ADD COLUMN IF NOT EXISTS engagement_models TEXT NOT NULL DEFAULT '[]';`);
    // Outcome Attribution & Learning (spec 20.9 / SI-11): observed results are recorded with an
    // explicit attribution strength rather than overstating causality — correlation is not the
    // same claim as verified-causal, and the schema keeps that distinction instead of collapsing
    // it into a single "it worked" flag.
    await client.query(`CREATE TABLE IF NOT EXISTS outcomes (
      id TEXT PRIMARY KEY, workspace_id TEXT NOT NULL REFERENCES workspaces(id),
      subject_kind TEXT NOT NULL, subject_id TEXT NOT NULL,
      recommendation_id TEXT REFERENCES recommendations(id),
      description TEXT NOT NULL, attribution_strength TEXT NOT NULL,
      observed_at TEXT NOT NULL, created_by TEXT NOT NULL REFERENCES users(id), created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS outcomes_subject ON outcomes(workspace_id, subject_kind, subject_id);`);
    // Expert Context Handoff (spec 19.4/19.7, EX-04): an explicit, inspectable, revocable record of
    // exactly which objects a client shared with an engaged expert — not implicit trust from being
    // assigned to the project. Scope references are typed (kind, id) pairs, resolved read-only and
    // only while the package is active.
    await client.query(`CREATE TABLE IF NOT EXISTS context_packages (
      id TEXT PRIMARY KEY, workspace_id TEXT NOT NULL REFERENCES workspaces(id),
      project_id TEXT NOT NULL REFERENCES projects(id), expert_user_id TEXT NOT NULL REFERENCES users(id),
      granted_by TEXT NOT NULL REFERENCES users(id),
      scope TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT NOT NULL, revoked_at TEXT
    );
    CREATE INDEX IF NOT EXISTS context_packages_project ON context_packages(project_id, status);`);
    // Context Transfer & Multi-Party Rules (spec 20.10 / SI-12): "personal" and "organization" are
    // not a new scope this platform lacks — they are exactly workspace ownership (workspaces.user_id)
    // versus workspace_members membership, which already exist. What was missing is the explicit,
    // audited transfer action between two workspaces a user legitimately belongs to; personal
    // intelligence does not silently become organization-visible merely because the same person is
    // in both, and this table is the record of every deliberate crossing.
    await client.query(`CREATE TABLE IF NOT EXISTS context_transfers (
      id TEXT PRIMARY KEY,
      source_workspace_id TEXT NOT NULL REFERENCES workspaces(id),
      target_workspace_id TEXT NOT NULL REFERENCES workspaces(id),
      record_kind TEXT NOT NULL, source_record_id TEXT NOT NULL, target_record_id TEXT,
      action TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'active',
      performed_by TEXT NOT NULL REFERENCES users(id),
      created_at TEXT NOT NULL, revoked_at TEXT
    );
    CREATE INDEX IF NOT EXISTS context_transfers_source ON context_transfers(source_workspace_id, source_record_id);
    CREATE INDEX IF NOT EXISTS context_transfers_target ON context_transfers(target_workspace_id, status);`);
    await client.query(
      `INSERT INTO agent_manifests (id, name, home_engine, max_authority, human_gate, allowed_tool_ids, created_at, points_cost) VALUES
      ('starter-planner', 'Starter Plan', 'Guidance', 'A1', 'none', '[]', $1, 0),
      ('onboarding', 'Onboarding Guide', 'Shared', 'A1', 'none', '[]', $1, 0),
      ('support', 'Support Guide', 'Shared', 'A1', 'none', '[]', $1, 0),
      ('pricing', 'Pricing Guide', 'Shared', 'A1', 'none', '[]', $1, 0)
      ON CONFLICT (id) DO NOTHING`,
      [new Date().toISOString()],
    );
    // Added after the v1 seed migration — same idempotent unconditional-insert pattern as the
    // starter-planner block above, so these rows reach databases that already ran migration 1
    // (this project's real dev/production schema included) without a new migration version.
    await client.query(
      `INSERT INTO agent_manifests (id, name, home_engine, max_authority, human_gate, allowed_tool_ids, created_at, points_cost) VALUES
      ('opportunity-signals', 'Opportunity Signals Engine', 'Growth', 'A1', 'none', '[]', $1, 65),
      ('experiment-builder', 'Experiment Builder', 'Growth', 'A1', 'none', '[]', $1, 65)
      ON CONFLICT (id) DO NOTHING`,
      [new Date().toISOString()],
    );
    await client.query(
      `INSERT INTO model_registry (id, provider, use_case, status, created_at) VALUES
      ('companion-opportunity-signals-v1', 'openai', 'companion.opportunity-signals', 'approved', $1),
      ('companion-experiment-builder-v1', 'openai', 'companion.experiment-builder', 'approved', $1)
      ON CONFLICT (id) DO NOTHING`,
      [new Date().toISOString()],
    );
    // Added after the v1 seed migration, same reason as the opportunity-signals/experiment-builder
    // block above — a plain SEED_SQL edit never reaches a database that already ran migration 1.
    await client.query(
      `INSERT INTO agent_manifests (id, name, home_engine, max_authority, human_gate, allowed_tool_ids, created_at, points_cost) VALUES
      ('contract-builder', 'Contract Builder', 'Capability', 'A1', 'none', '[]', $1, 65)
      ON CONFLICT (id) DO NOTHING`,
      [new Date().toISOString()],
    );
    await client.query(
      `INSERT INTO model_registry (id, provider, use_case, status, created_at) VALUES
      ('companion-contract-v1', 'openai', 'companion.contract-builder', 'approved', $1)
      ON CONFLICT (id) DO NOTHING`,
      [new Date().toISOString()],
    );
    await client.query(
      `INSERT INTO agent_manifests (id, name, home_engine, max_authority, human_gate, allowed_tool_ids, created_at, points_cost) VALUES
      ('goal-advisor', 'Goal Advisor', 'Clarity', 'A1', 'none', '[]', $1, 65)
      ON CONFLICT (id) DO NOTHING`,
      [new Date().toISOString()],
    );
    await client.query(
      `INSERT INTO model_registry (id, provider, use_case, status, created_at) VALUES
      ('companion-goal-advisor-v1', 'openai', 'companion.goal-advisor', 'approved', $1)
      ON CONFLICT (id) DO NOTHING`,
      [new Date().toISOString()],
    );
    // Intelligence Engine layer -- ported from LamidOne's src/lib/intelligence + src/lib/engines.ts
    // (see src/app/engineRegistry.mjs, src/app/engines.mjs). Same idempotent unconditional-insert
    // pattern as the blocks above: 248 diagnostic-tool manifests, flat 35-point cost per run (see
    // ENGINE_POINTS_COST in engines.mjs), no model_registry rows needed since these are
    // deterministic compute with zero AI calls.
    await client.query(
      `INSERT INTO agent_manifests (id, name, home_engine, max_authority, human_gate, allowed_tool_ids, created_at, points_cost) VALUES
      ('s01', 'Strategic Identity Statement', 'Clarity', 'A1', 'none', '[]', $1, 35),
      ('s02', 'Strategic Direction Setter', 'Clarity', 'A1', 'none', '[]', $1, 35),
      ('s03', 'Strategy Consistency Check', 'Clarity', 'A1', 'none', '[]', $1, 35),
      ('s04', 'Cross-Function Strategy Alignment', 'Clarity', 'A1', 'none', '[]', $1, 35),
      ('s05', 'Strategic Execution Cadence', 'Clarity', 'A1', 'none', '[]', $1, 35),
      ('s06', 'Strategy Execution Tracker', 'Clarity', 'A1', 'none', '[]', $1, 35),
      ('s07', 'Strategic Cadence Impact Area', 'Clarity', 'A1', 'none', '[]', $1, 35),
      ('s08', 'Strategic Momentum Score', 'Clarity', 'A1', 'none', '[]', $1, 35),
      ('s09', 'Strategic Priority Weighting', 'Clarity', 'A1', 'none', '[]', $1, 35),
      ('s10', 'Strategic Focus Areas', 'Clarity', 'A1', 'none', '[]', $1, 35),
      ('s11', 'Market Trend Response Tracker', 'Clarity', 'A1', 'none', '[]', $1, 35),
      ('s12', 'Long-Term Strategic Outlook', 'Clarity', 'A1', 'none', '[]', $1, 35),
      ('r01', 'Cadence Mapping', 'Consistency', 'A1', 'none', '[]', $1, 35),
      ('r02', 'Pace of Execution', 'Consistency', 'A1', 'none', '[]', $1, 35),
      ('r03', 'Cadence Drift Alert', 'Consistency', 'A1', 'none', '[]', $1, 35),
      ('r04', 'Cadence Stability Score', 'Consistency', 'A1', 'none', '[]', $1, 35),
      ('r05', 'Workload Balance Monitor', 'Consistency', 'A1', 'none', '[]', $1, 35),
      ('r06', 'Cross-Team Cadence Fit', 'Consistency', 'A1', 'none', '[]', $1, 35),
      ('r07', 'Cadence Consistency Check', 'Consistency', 'A1', 'none', '[]', $1, 35),
      ('r08', 'Cadence Integration', 'Consistency', 'A1', 'none', '[]', $1, 35),
      ('r09', 'Strategy-to-Execution Alignment', 'Consistency', 'A1', 'none', '[]', $1, 35),
      ('r10', 'Multi-Team Cadence Sync', 'Consistency', 'A1', 'none', '[]', $1, 35),
      ('r11', 'Real-Time Cadence Sync', 'Consistency', 'A1', 'none', '[]', $1, 35),
      ('r12', 'Operational Flow Tracker', 'Consistency', 'A1', 'none', '[]', $1, 35),
      ('r13', 'Team Cadence Engagement Score', 'Consistency', 'A1', 'none', '[]', $1, 35),
      ('r14', 'Real-Time Cadence Pulse', 'Consistency', 'A1', 'none', '[]', $1, 35),
      ('r15', 'Organisational Cadence Profile', 'Consistency', 'A1', 'none', '[]', $1, 35),
      ('r16', 'Cadence Pattern Report', 'Consistency', 'A1', 'none', '[]', $1, 35),
      ('r17', 'Core Cadence Drivers', 'Consistency', 'A1', 'none', '[]', $1, 35),
      ('r18', 'Cultural Cadence Fit', 'Consistency', 'A1', 'none', '[]', $1, 35),
      ('r19', 'Cadence Impact Area', 'Consistency', 'A1', 'none', '[]', $1, 35),
      ('r20', 'Department Cadence View', 'Consistency', 'A1', 'none', '[]', $1, 35),
      ('r21', 'Business Unit Cadence View', 'Consistency', 'A1', 'none', '[]', $1, 35),
      ('r22', 'Enterprise-Wide Cadence View', 'Consistency', 'A1', 'none', '[]', $1, 35),
      ('r23', 'Long-Term Cadence Trends', 'Consistency', 'A1', 'none', '[]', $1, 35),
      ('r24', 'Historical Cadence Tracking', 'Consistency', 'A1', 'none', '[]', $1, 35),
      ('r25', 'Root Cause of Cadence Issues', 'Consistency', 'A1', 'none', '[]', $1, 35),
      ('r26', 'Cadence Data Sources', 'Consistency', 'A1', 'none', '[]', $1, 35),
      ('r27', 'Peak Performance Cadence', 'Consistency', 'A1', 'none', '[]', $1, 35),
      ('r28', 'Cadence Governance Console', 'Consistency', 'A1', 'none', '[]', $1, 35),
      ('r29', 'Executive Cadence Report', 'Consistency', 'A1', 'none', '[]', $1, 35),
      ('r30', 'Enterprise Cadence Overview', 'Consistency', 'A1', 'none', '[]', $1, 35),
      ('c02', 'Workflow Intelligence', 'Shared', 'A1', 'none', '[]', $1, 35),
      ('c03', 'Core Diagnostic', 'Shared', 'A1', 'none', '[]', $1, 35),
      ('c04', 'Transformation Console', 'Shared', 'A1', 'none', '[]', $1, 35),
      ('c05', 'Operating Rhythm Console', 'Shared', 'A1', 'none', '[]', $1, 35),
      ('c06', 'Operating Model Blueprint', 'Shared', 'A1', 'none', '[]', $1, 35),
      ('c07', 'Strategic Alignment Console', 'Shared', 'A1', 'none', '[]', $1, 35),
      ('c08', 'Change Management Console', 'Shared', 'A1', 'none', '[]', $1, 35),
      ('c09', 'Executive Console', 'Shared', 'A1', 'none', '[]', $1, 35),
      ('q01', 'Decision Landscape Mapping', 'Clarity', 'A1', 'none', '[]', $1, 35),
      ('q02', 'Current Decision Status', 'Clarity', 'A1', 'none', '[]', $1, 35),
      ('q03', 'Decision Path Simulator', 'Clarity', 'A1', 'none', '[]', $1, 35),
      ('q04', 'Outcome Probability', 'Clarity', 'A1', 'none', '[]', $1, 35),
      ('q05', 'Decision Timing Diagnostic', 'Clarity', 'A1', 'none', '[]', $1, 35),
      ('q06', 'Conflicting Priorities Detector', 'Clarity', 'A1', 'none', '[]', $1, 35),
      ('q07', 'Decision Consistency Check', 'Clarity', 'A1', 'none', '[]', $1, 35),
      ('q08', 'Decision Finalization', 'Clarity', 'A1', 'none', '[]', $1, 35),
      ('q09', 'Option Selection Assistant', 'Clarity', 'A1', 'none', '[]', $1, 35),
      ('q10', 'Multi-Factor Decision View', 'Clarity', 'A1', 'none', '[]', $1, 35),
      ('q11', 'Scenario Reality Check', 'Clarity', 'A1', 'none', '[]', $1, 35),
      ('q12', 'Full Scenario Explorer', 'Clarity', 'A1', 'none', '[]', $1, 35),
      ('q13', 'Root Cause Tracer', 'Clarity', 'A1', 'none', '[]', $1, 35),
      ('q14', 'Data Source Validator', 'Clarity', 'A1', 'none', '[]', $1, 35),
      ('q15', 'Early Warning Signals', 'Clarity', 'A1', 'none', '[]', $1, 35),
      ('q16', 'Decision Recurrence Tracker', 'Clarity', 'A1', 'none', '[]', $1, 35),
      ('q17', 'Stakeholder Alignment Score', 'Clarity', 'A1', 'none', '[]', $1, 35),
      ('q18', 'Cross-Team Consistency Check', 'Clarity', 'A1', 'none', '[]', $1, 35),
      ('q19', 'Sentiment-Adjusted Assessment', 'Clarity', 'A1', 'none', '[]', $1, 35),
      ('q20', 'Context Insight Layer', 'Clarity', 'A1', 'none', '[]', $1, 35),
      ('q21', 'Decision Framework Builder', 'Clarity', 'A1', 'none', '[]', $1, 35),
      ('q22', 'Decision Structure Mapper', 'Clarity', 'A1', 'none', '[]', $1, 35),
      ('q23', 'Decision Architecture Console', 'Clarity', 'A1', 'none', '[]', $1, 35),
      ('q24', 'Decision Model Diagnostic', 'Clarity', 'A1', 'none', '[]', $1, 35),
      ('q25', 'Recurring Pattern Detector', 'Clarity', 'A1', 'none', '[]', $1, 35),
      ('q26', 'Decision Signature Report', 'Clarity', 'A1', 'none', '[]', $1, 35),
      ('q27', 'Decision-Maker Profile', 'Clarity', 'A1', 'none', '[]', $1, 35),
      ('q28', 'Stakeholder Persona Mapping', 'Clarity', 'A1', 'none', '[]', $1, 35),
      ('q29', 'Decision Role Assignment', 'Clarity', 'A1', 'none', '[]', $1, 35),
      ('q30', 'Decision Function Library', 'Clarity', 'A1', 'none', '[]', $1, 35),
      ('q31', 'Decision Capacity Planner', 'Clarity', 'A1', 'none', '[]', $1, 35),
      ('q32', 'Team Decision Capability Score', 'Clarity', 'A1', 'none', '[]', $1, 35),
      ('q33', 'Decision-Making Skill Score', 'Clarity', 'A1', 'none', '[]', $1, 35),
      ('q34', 'Best-Practice Technique Library', 'Clarity', 'A1', 'none', '[]', $1, 35),
      ('q35', 'Decision Methodology Selector', 'Clarity', 'A1', 'none', '[]', $1, 35),
      ('q36', 'Decision Process Tracker', 'Clarity', 'A1', 'none', '[]', $1, 35),
      ('q37', 'Decision Workflow Automation', 'Clarity', 'A1', 'none', '[]', $1, 35),
      ('q38', 'Enterprise Decision System', 'Clarity', 'A1', 'none', '[]', $1, 35),
      ('q39', 'Cross-Functional Decision Network', 'Clarity', 'A1', 'none', '[]', $1, 35),
      ('q40', 'Decision Ecosystem Overview', 'Clarity', 'A1', 'none', '[]', $1, 35),
      ('q41', 'Decision Intelligence Summary', 'Clarity', 'A1', 'none', '[]', $1, 35),
      ('q42', 'Organizational Insight Index', 'Clarity', 'A1', 'none', '[]', $1, 35),
      ('q43', 'Risk Visibility Monitor', 'Clarity', 'A1', 'none', '[]', $1, 35),
      ('q44', 'Decision Clarity Score', 'Clarity', 'A1', 'none', '[]', $1, 35),
      ('q45', 'Strategic Insight Generator', 'Clarity', 'A1', 'none', '[]', $1, 35),
      ('q46', 'Predictive Foresight', 'Clarity', 'A1', 'none', '[]', $1, 35),
      ('q47', 'Long-Range Vision Planner', 'Clarity', 'A1', 'none', '[]', $1, 35),
      ('q48', 'Multi-Stakeholder Perspective View', 'Clarity', 'A1', 'none', '[]', $1, 35),
      ('q49', 'Decision Rationale Explainer', 'Clarity', 'A1', 'none', '[]', $1, 35),
      ('q50', 'Decision Mastery Benchmark', 'Clarity', 'A1', 'none', '[]', $1, 35),
      ('q51', 'Decision Influence Score', 'Clarity', 'A1', 'none', '[]', $1, 35),
      ('q52', 'Decision Impact Strength', 'Clarity', 'A1', 'none', '[]', $1, 35),
      ('q53', 'Team Capacity & Workload Monitor', 'Clarity', 'A1', 'none', '[]', $1, 35),
      ('q54', 'Decision Momentum Tracker', 'Clarity', 'A1', 'none', '[]', $1, 35),
      ('q55', 'Decision Speed Index', 'Clarity', 'A1', 'none', '[]', $1, 35),
      ('q56', 'Decision Acceleration Planner', 'Clarity', 'A1', 'none', '[]', $1, 35),
      ('q57', 'Business Impact Estimator', 'Clarity', 'A1', 'none', '[]', $1, 35),
      ('q58', 'Impact Magnitude Report', 'Clarity', 'A1', 'none', '[]', $1, 35),
      ('q59', 'Outcome Range Assessment', 'Clarity', 'A1', 'none', '[]', $1, 35),
      ('q60', 'Decision Urgency Index', 'Clarity', 'A1', 'none', '[]', $1, 35),
      ('q61', 'Decision Scope Mapper', 'Clarity', 'A1', 'none', '[]', $1, 35),
      ('q62', 'Domain-Specific Decision View', 'Clarity', 'A1', 'none', '[]', $1, 35),
      ('q63', 'Market Territory Analysis', 'Clarity', 'A1', 'none', '[]', $1, 35),
      ('q64', 'Business Unit Decision Overview', 'Clarity', 'A1', 'none', '[]', $1, 35),
      ('q65', 'Enterprise-Wide Decision Map', 'Clarity', 'A1', 'none', '[]', $1, 35),
      ('q66', 'Portfolio/Group Decision View', 'Clarity', 'A1', 'none', '[]', $1, 35),
      ('q67', 'Global Decision Overview', 'Clarity', 'A1', 'none', '[]', $1, 35),
      ('q68', 'Long-Term Scenario Planner', 'Clarity', 'A1', 'none', '[]', $1, 35),
      ('q69', 'Decision Consistency Diagnostic', 'Clarity', 'A1', 'none', '[]', $1, 35),
      ('q70', 'Legacy Decision Archive', 'Clarity', 'A1', 'none', '[]', $1, 35),
      ('q71', 'Decision Timeline', 'Clarity', 'A1', 'none', '[]', $1, 35),
      ('q72', 'Point-in-Time Snapshot', 'Clarity', 'A1', 'none', '[]', $1, 35),
      ('q73', 'Decision Sequence Tracker', 'Clarity', 'A1', 'none', '[]', $1, 35),
      ('q74', 'Decision Duration Analysis', 'Clarity', 'A1', 'none', '[]', $1, 35),
      ('q75', 'Recurring Decision Cycles', 'Clarity', 'A1', 'none', '[]', $1, 35),
      ('q76', 'Long-Term Commitment Tracker', 'Clarity', 'A1', 'none', '[]', $1, 35),
      ('q77', 'Breakthrough Decision Alerts', 'Clarity', 'A1', 'none', '[]', $1, 35),
      ('q78', 'Cross-Team Decision Convergence', 'Clarity', 'A1', 'none', '[]', $1, 35),
      ('q79', 'Critical Decision Point Alert', 'Clarity', 'A1', 'none', '[]', $1, 35),
      ('q80', 'Decision Model Evolution Tracker', 'Clarity', 'A1', 'none', '[]', $1, 35),
      ('q81', 'Organisational Self-Assessment', 'Clarity', 'A1', 'none', '[]', $1, 35),
      ('q82', 'Core Decision Principles', 'Clarity', 'A1', 'none', '[]', $1, 35),
      ('q83', 'Decision Culture Profile', 'Clarity', 'A1', 'none', '[]', $1, 35),
      ('q84', 'Company Values Alignment', 'Clarity', 'A1', 'none', '[]', $1, 35),
      ('q85', 'Organisational Health Check', 'Clarity', 'A1', 'none', '[]', $1, 35),
      ('q86', 'Business Continuity Status', 'Clarity', 'A1', 'none', '[]', $1, 35),
      ('q87', 'Independent Decision Authority', 'Clarity', 'A1', 'none', '[]', $1, 35),
      ('q88', 'Enterprise Decision Insight', 'Clarity', 'A1', 'none', '[]', $1, 35),
      ('q89', 'Organisational Identity Report', 'Clarity', 'A1', 'none', '[]', $1, 35),
      ('q90', 'Autonomous Decision Capability', 'Clarity', 'A1', 'none', '[]', $1, 35),
      ('q91', 'Governance Foundation', 'Clarity', 'A1', 'none', '[]', $1, 35),
      ('q92', 'Partnership Agreement Tracker', 'Clarity', 'A1', 'none', '[]', $1, 35),
      ('q93', 'Enterprise Charter & Bylaws', 'Clarity', 'A1', 'none', '[]', $1, 35),
      ('q94', 'Public Commitments Tracker', 'Clarity', 'A1', 'none', '[]', $1, 35),
      ('q95', 'Executive Mandate Tracker', 'Clarity', 'A1', 'none', '[]', $1, 35),
      ('q96', 'Decision Protocol Library', 'Clarity', 'A1', 'none', '[]', $1, 35),
      ('q97', 'Compliance & Policy Rules', 'Clarity', 'A1', 'none', '[]', $1, 35),
      ('q98', 'Decision Authority Matrix', 'Clarity', 'A1', 'none', '[]', $1, 35),
      ('q99', 'Enterprise Governance', 'Clarity', 'A1', 'none', '[]', $1, 35),
      ('q100', 'Executive Sign-Off & Certification', 'Clarity', 'A1', 'none', '[]', $1, 35),
      ('x01', 'Enterprise Protection', 'Consistency', 'A1', 'none', '[]', $1, 35),
      ('x02', 'Security Intelligence', 'Consistency', 'A1', 'none', '[]', $1, 35),
      ('x03', 'Governance Intelligence', 'Consistency', 'A1', 'none', '[]', $1, 35),
      ('x04', 'Compliance Intelligence', 'Consistency', 'A1', 'none', '[]', $1, 35),
      ('x05', 'Ethics Intelligence', 'Consistency', 'A1', 'none', '[]', $1, 35),
      ('x06', 'Resilience Intelligence', 'Consistency', 'A1', 'none', '[]', $1, 35),
      ('x07', 'Continuity Intelligence', 'Consistency', 'A1', 'none', '[]', $1, 35),
      ('a02', 'Capability Assessment', 'Capability', 'A1', 'none', '[]', $1, 35),
      ('a03', 'Workforce Planning', 'Capability', 'A1', 'none', '[]', $1, 35),
      ('a04', 'Leadership Pipeline', 'Capability', 'A1', 'none', '[]', $1, 35),
      ('a05', 'Culture Intelligence', 'Capability', 'A1', 'none', '[]', $1, 35),
      ('a06', 'Workforce Readiness', 'Capability', 'A1', 'none', '[]', $1, 35),
      ('a07', 'Talent Diagnostics', 'Capability', 'A1', 'none', '[]', $1, 35),
      ('a08', 'Talent Risk Intelligence', 'Capability', 'A1', 'none', '[]', $1, 35),
      ('a09', 'Talent Opportunity Intelligence', 'Capability', 'A1', 'none', '[]', $1, 35),
      ('a10', 'Talent Performance Intelligence', 'Capability', 'A1', 'none', '[]', $1, 35),
      ('a11', 'Talent Engagement Intelligence', 'Capability', 'A1', 'none', '[]', $1, 35),
      ('a12', 'Talent Sentiment Intelligence', 'Capability', 'A1', 'none', '[]', $1, 35),
      ('a13', 'Talent Experience Intelligence', 'Capability', 'A1', 'none', '[]', $1, 35),
      ('a14', 'Talent Lifecycle Intelligence', 'Capability', 'A1', 'none', '[]', $1, 35),
      ('a15', 'Talent Capability Uplift', 'Capability', 'A1', 'none', '[]', $1, 35),
      ('a16', 'Talent Leadership Uplift', 'Capability', 'A1', 'none', '[]', $1, 35),
      ('a17', 'Talent Acceleration Engine Part I', 'Capability', 'A1', 'none', '[]', $1, 35),
      ('a18', 'Talent Acceleration Engine Part II', 'Capability', 'A1', 'none', '[]', $1, 35),
      ('a19', 'Talent Acceleration Engine Part III', 'Capability', 'A1', 'none', '[]', $1, 35),
      ('a20', 'Talent Acceleration Engine Part IV', 'Capability', 'A1', 'none', '[]', $1, 35),
      ('a21', 'Succession & Leadership Pipeline', 'Capability', 'A1', 'none', '[]', $1, 35),
      ('a22', 'Leadership Bench Strength', 'Capability', 'A1', 'none', '[]', $1, 35),
      ('a23', 'Behavioral Competency', 'Capability', 'A1', 'none', '[]', $1, 35),
      ('a24', 'Performance & Capability Alignment', 'Capability', 'A1', 'none', '[]', $1, 35),
      ('a25', 'Career Pathing', 'Capability', 'A1', 'none', '[]', $1, 35),
      ('a26', 'Workforce Planning Readiness', 'Capability', 'A1', 'none', '[]', $1, 35),
      ('a27', 'Engagement & Culture Signals', 'Capability', 'A1', 'none', '[]', $1, 35),
      ('a28', 'Executive Talent Intelligence', 'Capability', 'A1', 'none', '[]', $1, 35),
      ('a29', 'Enterprise Integration', 'Capability', 'A1', 'none', '[]', $1, 35),
      ('a30', 'Enterprise Talent Fabric', 'Capability', 'A1', 'none', '[]', $1, 35),
      ('a31', 'Enterprise Talent Flow', 'Capability', 'A1', 'none', '[]', $1, 35),
      ('a32', 'ETOS — Enterprise Talent Operating System', 'Capability', 'A1', 'none', '[]', $1, 35),
      ('z01', 'Breakthrough Opportunity Mapping', 'Growth', 'A1', 'none', '[]', $1, 35),
      ('z02', 'Pace of Transformation', 'Growth', 'A1', 'none', '[]', $1, 35),
      ('z03', 'Transformation Drift Alert', 'Growth', 'A1', 'none', '[]', $1, 35),
      ('z04', 'Transformation Stability Score', 'Growth', 'A1', 'none', '[]', $1, 35),
      ('z05', 'Transformation Alignment Across Teams', 'Growth', 'A1', 'none', '[]', $1, 35),
      ('z06', 'Transformation Progress Tracker', 'Growth', 'A1', 'none', '[]', $1, 35),
      ('z07', 'Transformation Identity Report', 'Growth', 'A1', 'none', '[]', $1, 35),
      ('z08', 'Enterprise-Wide Intelligence Summary', 'Growth', 'A1', 'none', '[]', $1, 35),
      ('z09', 'Enterprise Consistency Check', 'Growth', 'A1', 'none', '[]', $1, 35),
      ('z10', 'Enterprise-Wide Alignment', 'Growth', 'A1', 'none', '[]', $1, 35),
      ('z11', 'Enterprise Flow Tracker', 'Growth', 'A1', 'none', '[]', $1, 35),
      ('z12', 'Enterprise Renewal Cycle', 'Growth', 'A1', 'none', '[]', $1, 35),
      ('z13', 'Enterprise Insight Index', 'Growth', 'A1', 'none', '[]', $1, 35),
      ('z14', 'Organizational Insight Consistency', 'Growth', 'A1', 'none', '[]', $1, 35),
      ('z15', 'Organizational Insight Tracker', 'Growth', 'A1', 'none', '[]', $1, 35),
      ('p01', 'Productivity Mapping', 'Consistency', 'A1', 'none', '[]', $1, 35),
      ('p02', 'Productivity Velocity', 'Consistency', 'A1', 'none', '[]', $1, 35),
      ('p03', 'Productivity Drift', 'Consistency', 'A1', 'none', '[]', $1, 35),
      ('p04', 'Productivity Stability', 'Consistency', 'A1', 'none', '[]', $1, 35),
      ('p05', 'Productivity Balance', 'Consistency', 'A1', 'none', '[]', $1, 35),
      ('p06', 'Productivity Harmony', 'Consistency', 'A1', 'none', '[]', $1, 35),
      ('p07', 'Productivity Coherence', 'Consistency', 'A1', 'none', '[]', $1, 35),
      ('p08', 'Productivity Integration', 'Consistency', 'A1', 'none', '[]', $1, 35),
      ('p09', 'Productivity Alignment', 'Consistency', 'A1', 'none', '[]', $1, 35),
      ('p10', 'Productivity Performance', 'Consistency', 'A1', 'none', '[]', $1, 35),
      ('p11', 'Productivity Excellence', 'Consistency', 'A1', 'none', '[]', $1, 35),
      ('p12', 'Productivity Delivery', 'Consistency', 'A1', 'none', '[]', $1, 35),
      ('p13', 'Productivity Execution', 'Consistency', 'A1', 'none', '[]', $1, 35),
      ('p14', 'Productivity Optimisation', 'Consistency', 'A1', 'none', '[]', $1, 35),
      ('p15', 'Productivity Intelligence', 'Consistency', 'A1', 'none', '[]', $1, 35),
      ('p16', 'Team Productivity', 'Consistency', 'A1', 'none', '[]', $1, 35),
      ('p17', 'Collaboration', 'Consistency', 'A1', 'none', '[]', $1, 35),
      ('p18', 'Communication', 'Consistency', 'A1', 'none', '[]', $1, 35),
      ('p19', 'Engagement', 'Consistency', 'A1', 'none', '[]', $1, 35),
      ('p20', 'Capability', 'Consistency', 'A1', 'none', '[]', $1, 35),
      ('p21', 'Process Optimisation', 'Consistency', 'A1', 'none', '[]', $1, 35),
      ('p22', 'Workflow Intelligence', 'Consistency', 'A1', 'none', '[]', $1, 35),
      ('p23', 'Systems Productivity', 'Consistency', 'A1', 'none', '[]', $1, 35),
      ('p24', 'Technology Productivity', 'Consistency', 'A1', 'none', '[]', $1, 35),
      ('p25', 'Innovation Productivity', 'Consistency', 'A1', 'none', '[]', $1, 35),
      ('p26', 'Transformation', 'Consistency', 'A1', 'none', '[]', $1, 35),
      ('p27', 'Change', 'Consistency', 'A1', 'none', '[]', $1, 35),
      ('p28', 'Convergence', 'Consistency', 'A1', 'none', '[]', $1, 35),
      ('p29', 'Synchronization', 'Consistency', 'A1', 'none', '[]', $1, 35),
      ('p30', 'Flow', 'Consistency', 'A1', 'none', '[]', $1, 35),
      ('f01', 'Financial Visibility', 'Finance', 'A1', 'none', '[]', $1, 35),
      ('g02', 'Opportunity Signals', 'Growth', 'A1', 'none', '[]', $1, 35),
      ('g03', 'Growth Pathways', 'Growth', 'A1', 'none', '[]', $1, 35),
      ('g04', 'Modernisation Planning', 'Growth', 'A1', 'none', '[]', $1, 35),
      ('g05', 'Market Intelligence', 'Growth', 'A1', 'none', '[]', $1, 35),
      ('g06', 'Digital Maturity Model', 'Growth', 'A1', 'none', '[]', $1, 35),
      ('g07', 'Growth Planner', 'Growth', 'A1', 'none', '[]', $1, 35),
      ('g08', 'Advisory Console', 'Growth', 'A1', 'none', '[]', $1, 35),
      ('g09', 'Executive Growth Report', 'Growth', 'A1', 'none', '[]', $1, 35),
      ('f02', 'Budgeting & Forecasting', 'Finance', 'A1', 'none', '[]', $1, 35),
      ('f03', 'Financial KPI Linkage Diagnostic', 'Finance', 'A1', 'none', '[]', $1, 35),
      ('f04', 'Cost Optimization Diagnostic', 'Finance', 'A1', 'none', '[]', $1, 35),
      ('f05', 'Enterprise Value', 'Finance', 'A1', 'none', '[]', $1, 35),
      ('f06', 'Financial Governance', 'Finance', 'A1', 'none', '[]', $1, 35),
      ('f07', 'CFO Transformation', 'Finance', 'A1', 'none', '[]', $1, 35)
      ON CONFLICT (id) DO NOTHING`,
      [new Date().toISOString()],
    );
    // Real entitlement gating (see src/app/entitlements.mjs): a workspace's access to a paid
    // tool comes from either enterprise tier or an actually-purchased bundle, not just points.
    // `source` records which bundle purchase granted the row (composite PK lets more than one
    // bundle grant the same tool, and makes re-granting the same bundle idempotent).
    await client.query(`CREATE TABLE IF NOT EXISTS workspace_agent_entitlements (
      workspace_id TEXT NOT NULL REFERENCES workspaces(id),
      agent_id TEXT NOT NULL REFERENCES agent_manifests(id),
      source TEXT NOT NULL,
      granted_at TEXT NOT NULL,
      PRIMARY KEY (workspace_id, agent_id, source)
    )`);
    await client.query('COMMIT');
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch {
      /* Preserve the original startup error. */
    }
    client.off('error', onClientError);
    client.release(true);
    await pool.end().catch(() => {});
    throw error;
  }
  client.off('error', onClientError);
  client.release();

  const db = createDb(pool, schema);
  const transaction = createTransaction(pool, schema);
  const log = async (workspace, actor, action, object, detail) =>
    db
      .prepare(
        'INSERT INTO audit (id, workspace_id, actor, action, object_id, detail, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      )
      .run(randomUUID(), workspace, actor, action, object, detail, new Date().toISOString());
  const insert = async (workspace, kind, data) => {
    const id = randomUUID();
    const createdAt = new Date().toISOString();
    await db
      .prepare(
        'INSERT INTO records (id, workspace_id, kind, data, version, created_at) VALUES (?, ?, ?, ?, 1, ?)',
      )
      .run(id, workspace, kind, JSON.stringify(data), createdAt);
    return { ...data, id, version: 1, createdAt };
  };
  const records = async (workspace, kind) => {
    const rows = await db
      .prepare(
        'SELECT * FROM records WHERE workspace_id = ? AND kind = ? ORDER BY created_at DESC, seq DESC',
      )
      .all(workspace, kind);
    return rows.map((row) => ({
      ...JSON.parse(row.data),
      id: row.id,
      version: row.version,
      createdAt: row.created_at,
    }));
  };
  // Includes named test schemas used by reconnect tests, never the public schema or production.
  const dropSchema = async () => {
    if (!isTestContext || schema === 'public')
      throw new Error('Only isolated test database schemas can be dropped.');
    try {
      await pool.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    } finally {
      await pool.end();
    }
  };

  return { db, transaction, log, insert, records, schema, disposable, dropSchema };
}

export async function seedWorkspace(store, workspace, name) {
  const { insert, log } = store;
  const due = (days) => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString().slice(0, 10);
  };
  const first = await insert(workspace, 'objective', {
    title: 'Launch our advisory practice',
    description:
      'Build a focused service for growing businesses. Validate the offer with three potential customers before investing in a full launch.',
    context: 'Founder',
    priority: 'High',
    status: 'Active',
    targetDate: due(28),
    constraints: 'Keep the initial scope small. Protect time for existing client work.',
    success: 'Three customer conversations and one validated service offer.',
  });
  const second = await insert(workspace, 'objective', {
    title: 'Build a more intentional week',
    description: 'Make space for deep work and a meaningful weekly review.',
    context: 'Professional',
    priority: 'Medium',
    status: 'Active',
    targetDate: due(14),
    constraints: 'Two afternoons are reserved for client meetings.',
    success: 'Complete three focused work sessions each week.',
  });
  await insert(workspace, 'action', {
    title: 'Draft the service offer',
    objectiveId: first.id,
    status: 'In progress',
    dueDate: due(1),
    owner: name,
    requiresApproval: false,
    notes: 'Describe the outcome, audience, and boundaries of the first offer.',
  });
  await insert(workspace, 'action', {
    title: 'Review customer interview questions',
    objectiveId: first.id,
    status: 'Needs review',
    dueDate: due(0),
    owner: name,
    requiresApproval: true,
    notes:
      'Draft includes questions about current challenges, alternatives, and decision criteria. Review wording before using it.',
  });
  await insert(workspace, 'action', {
    title: 'Schedule three discovery conversations',
    objectiveId: first.id,
    status: 'Planned',
    dueDate: due(3),
    owner: name,
    requiresApproval: false,
    notes: 'Start with existing professional connections.',
  });
  await insert(workspace, 'action', {
    title: 'Protect two deep-work blocks',
    objectiveId: second.id,
    status: 'Done',
    dueDate: due(-1),
    owner: name,
    requiresApproval: false,
    notes: 'Reserved Tuesday and Thursday mornings.',
  });
  await insert(workspace, 'action', {
    title: 'Write a Friday reflection',
    objectiveId: second.id,
    status: 'Planned',
    dueDate: due(4),
    owner: name,
    requiresApproval: false,
    notes: '',
  });
  await log(
    workspace,
    name,
    'Sample workspace created',
    first.id,
    'Illustrative objectives and actions. No external work has been performed.',
  );
}
