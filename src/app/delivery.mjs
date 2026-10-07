/**
 * Delivery review — the first end-to-end use case on the shared execution path. Instead of
 * typing figures into the flow calculator, the review reads the project's own tasks, turns them
 * into weekly flow periods, runs Delivery Flow Metrics (T06) about the project through
 * executeCapability, and publishes the finding citing the project's tasks. Any later task
 * change marks that finding stale (see tasks.mjs and intelligence.mjs).
 *
 * What it can establish: throughput, cycle time and work in progress from task timestamps.
 * What it cannot: why work is slow. The finding is evidence for a diagnosis, not the diagnosis.
 */
import { requirePermission } from './policy.mjs';
import { executeCapability } from './capabilities.mjs';

const DAY = 86_400_000;
const MIN_PERIODS = 3; // T06's minimum

const r1 = (n) => Math.round(n * 10) / 10;

/** Weekly flow periods from tasks, oldest first. Pure, so it is tested without a database.
 * Only weeks in which something finished can have a cycle time, so empty weeks are left out of
 * the periods and reported, since leaving them out overstates how predictable delivery is. */
export function buildFlowEvidence(tasks, { now = new Date().toISOString(), weeks = 8 } = {}) {
  const end = Date.parse(now);
  const cancelled = tasks.filter((t) => t.status === 'cancelled');
  const live = tasks.filter((t) => t.status !== 'cancelled');
  const undated = live.filter((t) => t.status === 'done' && !t.completed_at);
  const doneAt = (t) => (t.completed_at ? Date.parse(t.completed_at) : null);
  const periods = [];
  let emptyWeeks = 0;
  for (let w = weeks - 1; w >= 0; w--) {
    const to = end - w * 7 * DAY;
    const from = to - 7 * DAY;
    const finished = live.filter((t) => doneAt(t) !== null && doneAt(t) > from && doneAt(t) <= to);
    if (!finished.length) {
      emptyWeeks++;
      continue;
    }
    const cycle =
      finished.reduce((s, t) => s + (doneAt(t) - Date.parse(t.created_at)), 0) / finished.length;
    const wip = live.filter(
      (t) =>
        Date.parse(t.created_at) <= to &&
        !(t.status === 'done' && !t.completed_at) &&
        (doneAt(t) === null || doneAt(t) > to),
    ).length;
    periods.push({
      label: `Week ending ${new Date(to).toISOString().slice(0, 10)}`,
      throughput: finished.length,
      cycleTimeDays: r1(cycle / DAY),
      wip,
    });
  }
  const limitations = [
    'Work in progress is counted at the end of each week, not averaged across it.',
    'Active working time is not recorded on tasks, so flow efficiency cannot be measured.',
  ];
  if (emptyWeeks)
    limitations.push(
      `${emptyWeeks} of ${weeks} weeks had no finished tasks and are left out, which makes throughput look steadier than it was.`,
    );
  if (undated.length)
    limitations.push(
      `${undated.length} finished task(s) predate completion times and are left out of throughput.`,
    );
  const sufficient = periods.length >= MIN_PERIODS;
  return {
    sufficient,
    input: { periodDays: 7, periods },
    coverage: {
      tasks: tasks.length,
      weeks,
      weeksWithCompletions: periods.length,
      emptyWeeks,
      doneWithoutCompletionTime: undated.length,
      cancelled: cancelled.length,
    },
    limitations,
    missingEvidence: sufficient
      ? []
      : [
          `Finished tasks in at least ${MIN_PERIODS} separate weeks of the last ${weeks} (found ${periods.length}).`,
        ],
  };
}

export function mountDelivery(app, store) {
  const { db } = store;

  // Runs the review for a project in this workspace. Too little history is reported as
  // insufficient evidence, with what is missing, and nothing is run or charged.
  app.post(
    '/api/projects/:id/delivery-review',
    requirePermission('work:write'),
    async (req, res) => {
      const project = await db
        .prepare('SELECT * FROM projects WHERE id = ? AND workspace_id = ?')
        .get(req.params.id, req.workspace.id);
      if (!project) return res.status(404).json({ error: 'Project not found in this workspace.' });
      const tasks = await db.prepare('SELECT * FROM tasks WHERE project_id = ?').all(project.id);
      const evidence = buildFlowEvidence(tasks);
      if (!evidence.sufficient)
        return res.json({
          status: 'insufficient_evidence',
          pointsCharged: 0,
          missingEvidence: evidence.missingEvidence,
          evidence,
        });
      const out = await executeCapability(store, {
        principal: req.user,
        workspace: req.workspace,
        capabilityId: 'T06',
        subject: { kind: 'project', id: project.id },
        input: evidence.input,
        sources: [{ kind: 'project_tasks', id: project.id }],
        idempotencyKey: req.get('Idempotency-Key') ?? undefined,
        caller: 'delivery-review',
      });
      res.json({ ...out, evidence });
    },
  );
}
