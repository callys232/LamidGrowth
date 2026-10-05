/**
 * One execution path for every catalog tool, whoever calls it — the tools page, an agent or a
 * workflow step. Each call:
 *
 *   1. checks the caller's role, the workspace's access to the tool, and the subject and sources
 *      it cites (they must exist in this workspace);
 *   2. validates the input and runs the deterministic calculation (bad input throws, uncharged);
 *   3. takes the result's analytical status — completed, provisional or insufficient_evidence;
 *   4. in one transaction: saves the run with its input, tool version and subject, charges only
 *      a chargeable status, and publishes the result as subject-bound intelligence with the
 *      sources it rests on (their versions recorded, so a later change marks it stale);
 *   5. returns the saved result and what the caller can do next.
 *
 * An idempotency key makes a retried request return the run it already made instead of
 * charging and saving a second time.
 */
import { randomUUID, createHash } from 'node:crypto';
import { z } from 'zod';
import { permissionsFor, requirePermission } from './policy.mjs';
import { hasToolAccess } from './entitlements.mjs';
import { resolve, runEngine, purchasedIds, sourceIds } from './engines.mjs';
import {
  upsertIntelligenceResult,
  currentSourceVersion,
  CHECKABLE_SOURCE_KINDS,
} from './intelligence.mjs';
import { TOOLS, PRIMARY } from './toolCatalog/catalog.mjs';
import { toolVersion } from './toolCatalog/validation.mjs';
import { traceability, traceabilitySummary } from './toolCatalog/canonical.mjs';

/** Charging policy, stated once. Invalid input is refused before this point and never charged.
 * A provisional or insufficient-evidence result is saved and shown but not charged: the user did
 * not get the conclusion the tool exists to give. */
export const CHARGEABLE_STATUSES = new Set(['completed']);

export const SUBJECT_KINDS = ['goal', 'project', 'workspace'];

/** Which catalog tools each agent may run. An agent not listed here may run none. */
export const AGENT_CAPABILITIES = {
  'diagnostic-intelligence': ['T06', 'T07', 'T08', 'T09', 'T10', 'T11'],
  'signal-monitoring': ['T07', 'T28'],
  'capability-mapper': ['T40', 'T41', 'T42', 'T48'],
};
/** Tool id → the agents allowed to run it. */
export const agentCallersByTool = () => {
  const out = {};
  for (const [agent, tools] of Object.entries(AGENT_CAPABILITIES))
    for (const t of tools) (out[t] ??= []).push(agent);
  return out;
};

const DAY = 86_400;
/** How long a result stays current before it needs recomputing, by what kind of tool it is:
 * monitors and registers describe a moving situation; questionnaires change slowly. */
const MONITORS = new Set(['T06', 'T07', 'T08', 'T09', 'T28', 'T33', 'T50']);
function freshnessSeconds(toolId) {
  if (MONITORS.has(toolId)) return 7 * DAY;
  if (TOOLS[toolId].engine === 'anchored') return 180 * DAY;
  return 30 * DAY;
}

const sourceRef = z
  .object({
    kind: z.string().trim().min(1).max(40),
    id: z.string().trim().min(1).max(200),
    version: z.union([z.string().max(100), z.number()]).optional(),
  })
  .strict();
export const executionRequest = z
  .object({
    input: z.record(z.string(), z.unknown()).default({}),
    subject: z
      .object({ kind: z.enum(SUBJECT_KINDS), id: z.string().trim().min(1).max(200) })
      .strict()
      .optional(),
    sources: z.array(sourceRef).max(50).default([]),
    idempotencyKey: z.string().trim().min(8).max(200).optional(),
  })
  .strict();

const fail = (message, status) => {
  throw Object.assign(new Error(message), { status });
};

/** A tool id (T06) or any engine code that runs as a tool (R02, or a merged code). */
export function resolveCapability(capabilityId) {
  const code = /^T\d\d$/.test(capabilityId) ? PRIMARY[capabilityId] : capabilityId;
  if (!code) return { status: 404, error: 'Unknown capability.' };
  return resolve(code);
}

async function assertSubject(db, workspace, subject) {
  if (!subject) return;
  const found =
    subject.kind === 'workspace'
      ? subject.id === workspace.id
      : subject.kind === 'goal'
        ? await db
            .prepare(
              "SELECT 1 FROM records WHERE id = ? AND workspace_id = ? AND kind = 'objective'",
            )
            .get(subject.id, workspace.id)
        : await db
            .prepare('SELECT 1 FROM projects WHERE id = ? AND workspace_id = ?')
            .get(subject.id, workspace.id);
  if (!found) fail(`That ${subject.kind} was not found in this workspace.`, 404);
}

/** Every cited source must exist in this workspace; its current version is recorded so a later
 * change can be detected. A caller that names a version it did not see is refused. */
async function pinSources(db, workspaceId, sources) {
  const pinned = [];
  for (const src of sources) {
    // A tool's lineage must be checkable later, so it may only cite kinds that can be verified.
    if (!CHECKABLE_SOURCE_KINDS.has(src.kind))
      fail(`Source kind "${src.kind}" cannot be cited by a tool run.`, 400);
    const now = await currentSourceVersion(db, workspaceId, src);
    if (!now) fail(`Source ${src.kind} ${src.id} was not found in this workspace.`, 404);
    if (src.version != null && now.version != null && String(src.version) !== now.version)
      fail(
        `Source ${src.kind} ${src.id} has changed (now version ${now.version}). Reload it and try again.`,
        409,
      );
    pinned.push({ kind: src.kind, id: src.id, version: now.version });
  }
  return pinned;
}

const hashInput = (input) => createHash('sha256').update(JSON.stringify(input)).digest('hex');

function nextSteps(result) {
  if (result.status === 'provisional')
    return [
      `Complete the remaining inputs (${result.missingEvidence.length} outstanding) for a full result.`,
    ];
  if (result.status === 'insufficient_evidence')
    return result.missingEvidence.map((m) => `Gather evidence: ${m}`);
  return [];
}

/** The workspace row and the principal's role in it, as the HTTP layer builds req.workspace. */
export async function loadWorkspaceFor(db, workspaceId, userId) {
  const workspace = await db
    .prepare(
      "SELECT workspaces.id, workspaces.name, workspaces.context, workspaces.tier, workspaces.member_limit, workspaces.plan, workspaces.plan_period_end, workspaces.plan_status, workspaces.plan_extra_seats, workspaces.plan_grandfathered_seats, workspace_members.role FROM workspace_members JOIN workspaces ON workspaces.id = workspace_members.workspace_id WHERE workspace_members.user_id = ? AND workspaces.id = ? AND workspace_members.status = 'active'",
    )
    .get(userId, workspaceId);
  if (!workspace) fail('No active membership in this workspace.', 403);
  return workspace;
}

/** Steps 1–2: everything that can refuse the request, before any write. */
async function prepare(store, { principal, workspace, capabilityId, subject, input, sources }) {
  const { db } = store;
  if (!permissionsFor(workspace.role).includes('work:write'))
    fail('Your workspace role does not allow this action.', 403);
  const r = resolveCapability(capabilityId);
  if (r.error) throw Object.assign(new Error(r.error), { status: r.status, retired: r.retired });
  const manifestId = r.primary.code.toLowerCase();
  const manifest = await db
    .prepare('SELECT id, points_cost FROM agent_manifests WHERE id = ?')
    .get(manifestId);
  if (!manifest) fail('This engine is not yet available.', 404);
  const purchased = await purchasedIds(store, workspace);
  const allowed =
    (await hasToolAccess(store, workspace, manifestId)) ||
    sourceIds(r.toolId).some((id) => purchased.has(id));
  if (!allowed)
    fail(
      "This engine isn't included in your plan. Purchase a bundle that includes it, or upgrade to Enterprise.",
      403,
    );
  await assertSubject(db, workspace, subject);
  const pinned = await pinSources(db, workspace.id, sources);
  // Throws EngineInputError (400) for malformed, contradictory or too-thin input.
  const result = runEngine(r.ref, input);
  return { r, manifestId, points: manifest.points_cost || 0, pinned, result, principal };
}

/** Steps 3–5, inside the caller's transaction. */
async function persist(store, prepared, request) {
  const { db, log } = store;
  const { r, manifestId, points, pinned, result, principal } = prepared;
  const { workspace, subject, input, idempotencyKey, caller } = request;
  const inputHash = hashInput(input);
  if (idempotencyKey) {
    const prior = await db
      .prepare('SELECT * FROM agent_runs WHERE workspace_id = ? AND idempotency_key = ?')
      .get(workspace.id, idempotencyKey);
    if (prior) {
      if (prior.input_hash !== inputHash || prior.agent_id !== manifestId)
        fail('This idempotency key was already used for a different request.', 409);
      return { replayed: true, run: prior };
    }
  }
  const runId = randomUUID();
  const createdAt = new Date().toISOString();
  const version = toolVersion(r.toolId);
  const charge = CHARGEABLE_STATUSES.has(result.status) ? points : 0;
  if (charge > 0) {
    const charged = await db
      .prepare(
        'UPDATE users SET points_balance = points_balance - ? WHERE id = ? AND points_balance >= ?',
      )
      .run(charge, principal.id, charge);
    if (charged.changes !== 1) fail('You do not have enough points for this engine.', 402);
    await db
      .prepare('INSERT INTO points_ledger VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(randomUUID(), principal.id, workspace.id, -charge, 'agent_run', runId, Date.now());
  }
  const saved = { ...result, toolVersion: version };
  await db
    .prepare(
      `INSERT INTO agent_runs (id, workspace_id, principal_id, agent_id, input, output, status,
        created_at, completed_at, idempotency_key, subject_kind, subject_id, tool_version,
        input_hash, points_charged, caller)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      runId,
      workspace.id,
      principal.id,
      manifestId,
      JSON.stringify(input),
      JSON.stringify(saved),
      result.status,
      createdAt,
      createdAt,
      idempotencyKey ?? null,
      subject?.kind ?? null,
      subject?.id ?? null,
      version,
      inputHash,
      charge,
      caller,
    );
  let intelligence = null;
  if (subject) {
    const headline = result.working.split('\n').find((l, i) => i > 0 && l.trim()) ?? '';
    intelligence = await upsertIntelligenceResult(
      store,
      {
        workspaceId: workspace.id,
        subjectKind: subject.kind,
        subjectId: subject.id,
        agentId: `tool:${r.toolId}`,
        conclusion: `${result.status}: ${headline}`.slice(0, 500),
        summary: JSON.stringify({
          toolId: r.toolId,
          toolVersion: version,
          runId,
          status: result.status,
          summary: result.summary,
          warnings: result.warnings,
          missingEvidence: result.missingEvidence,
          computes: result.computes,
          limits: result.limits,
        }),
        sources: [...pinned, { kind: 'tool_run', id: runId, version: null }],
        claim: r.toolId,
        status: result.status,
        runId,
        ttlSeconds: freshnessSeconds(r.toolId),
      },
      { withinTransaction: true },
    );
  }
  await log(workspace.id, principal.name, 'Engine run', runId, `${r.ref.code} (${result.status})`);
  return { replayed: false, runId, charge, saved, intelligence };
}

function shape(outcome, balance) {
  if (outcome.replayed) {
    const run = outcome.run;
    const result = JSON.parse(run.output);
    return {
      runId: run.id,
      status: run.status,
      pointsCharged: run.points_charged ?? 0,
      balance,
      result,
      intelligence: null,
      nextSteps: nextSteps(result),
      replayed: true,
    };
  }
  return {
    runId: outcome.runId,
    status: outcome.saved.status,
    pointsCharged: outcome.charge,
    balance,
    result: outcome.saved,
    intelligence: outcome.intelligence,
    nextSteps: nextSteps(outcome.saved),
    replayed: false,
  };
}

/** For callers already inside a transaction (workflow steps). */
export async function executeCapabilityInTransaction(store, request) {
  const req = executionRequest.parse({
    input: request.input,
    subject: request.subject,
    sources: request.sources,
    idempotencyKey: request.idempotencyKey,
  });
  const full = { ...request, ...req, caller: request.caller ?? 'workflow' };
  const prepared = await prepare(store, full);
  return shape(await persist(store, prepared, full), null);
}

/** For callers outside a transaction: the tools page and agents. */
export async function executeCapability(store, request) {
  const req = executionRequest.parse({
    input: request.input,
    subject: request.subject,
    sources: request.sources,
    idempotencyKey: request.idempotencyKey,
  });
  const full = { ...request, ...req, caller: request.caller ?? 'ui' };
  const prepared = await prepare(store, full);
  let outcome;
  try {
    outcome = await store.transaction(() => persist(store, prepared, full));
  } catch (error) {
    // Two identical retries racing: the loser hits the unique key, so return the winner's run.
    if (error.code === '23505' && full.idempotencyKey) {
      const run = await store.db
        .prepare('SELECT * FROM agent_runs WHERE workspace_id = ? AND idempotency_key = ?')
        .get(full.workspace.id, full.idempotencyKey);
      if (run && run.input_hash === hashInput(full.input)) outcome = { replayed: true, run };
      else throw error;
    } else throw error;
  }
  const balance = (
    await store.db.prepare('SELECT points_balance FROM users WHERE id = ?').get(full.principal.id)
  ).points_balance;
  return shape(outcome, balance);
}

/** A bounded adapter for an agent: it may run only the capabilities on its allow-list, through
 * the same checks, charging and lineage as everyone else. */
export function capabilityAdapter(store, { agentId, allowed, principal, workspace }) {
  const allowList = new Set(allowed);
  return {
    allowed: [...allowList],
    async run(capabilityId, input, { subject, sources, idempotencyKey } = {}) {
      const r = resolveCapability(capabilityId);
      if (r.error || !allowList.has(r.toolId))
        fail(`Agent ${agentId} is not allowed to run ${capabilityId}.`, 403);
      return executeCapability(store, {
        principal,
        workspace,
        capabilityId: r.toolId,
        subject,
        input,
        sources,
        idempotencyKey,
        caller: `agent:${agentId}`,
      });
    },
  };
}

/** GET /api/engines/catalog/traceability — the canonical capability crosswalk. */
export function mountTraceability(app) {
  app.get('/api/engines/catalog/traceability', (req, res) => {
    const rows = traceability(agentCallersByTool());
    res.json({ summary: traceabilitySummary(rows), capabilities: rows });
  });
}

/** POST /api/engines/:code/run — the tools page's entry to the shared execution path. Accepts
 * an Idempotency-Key header as well as `idempotencyKey` in the body. */
export function mountCapabilityRuns(app, store) {
  app.post('/api/engines/:code/run', requirePermission('work:write'), async (req, res) => {
    const r = resolveCapability(req.params.code);
    if (r.error) return res.status(r.status).json({ error: r.error, retired: r.retired });
    const body = executionRequest.parse(req.body ?? {});
    const header = req.get('Idempotency-Key');
    const out = await executeCapability(store, {
      principal: req.user,
      workspace: req.workspace,
      capabilityId: req.params.code,
      ...body,
      idempotencyKey: body.idempotencyKey ?? header ?? undefined,
      caller: 'ui',
    });
    res.json(out);
  });
}
