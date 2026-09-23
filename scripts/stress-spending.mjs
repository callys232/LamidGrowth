import { randomUUID } from 'node:crypto';
import { openStore } from '../server/store.mjs';
import { createAgentRuntime } from '../src/app/agents.mjs';
let first, second;
const findings = [];
const record = (value) => {
  findings.push(value);
  console.log(JSON.stringify(value));
};
try {
  first = await openStore(':memory:');
  second = await openStore(first.schema, { poolMax: 2 });
  const user = randomUUID(),
    workspace = randomUUID();
  await first.db
    .prepare('INSERT INTO users (id,name,created_at,points_balance) VALUES (?,?,?,65)')
    .run(user, 'Spending fixture', new Date().toISOString());
  await first.db
    .prepare('INSERT INTO workspaces (id,user_id,name,context) VALUES (?,?,?,?)')
    .run(workspace, user, 'Spending fixture', 'Founder');
  await first.db
    .prepare("INSERT INTO workspace_members VALUES (?,?,'owner','active',?)")
    .run(workspace, user, Date.now());
  const runtimes = [
    createAgentRuntime(first, { aiProvider: null }),
    createAgentRuntime(second, { aiProvider: null }),
  ];
  for (const mode of ['last-balance', 'same-retry-key'])
    for (let round = 1; round <= 3; round++) {
      await first.db.prepare('UPDATE users SET points_balance = 65 WHERE id = ?').run(user);
      const before = Number(
        (
          await first.db
            .prepare(
              "SELECT COUNT(*) AS n FROM points_ledger WHERE user_id = ? AND reason = 'agent_run'",
            )
            .get(user)
        ).n,
      );
      const key = `stress_${randomUUID()}`;
      const start = performance.now();
      const results = await Promise.all(
        Array.from({ length: 10 }, async (_, index) => {
          const at = performance.now();
          try {
            const result = await runtimes[index % 2].send(
              { id: workspace, context: 'Founder', role: 'owner' },
              { id: user, name: 'Spending fixture' },
              { message: 'Summarize my context', agentId: 'context-curator', consent: false },
              mode === 'same-retry-key' ? key : `${key}_${index}`,
            );
            return { status: 201, runId: result.runId, ms: Math.round(performance.now() - at) };
          } catch (error) {
            return {
              status: error.status || 500,
              ms: Math.round(performance.now() - at),
              error: error.message,
            };
          }
        }),
      );
      const balance = (
        await first.db.prepare('SELECT points_balance FROM users WHERE id = ?').get(user)
      ).points_balance;
      const after = Number(
        (
          await first.db
            .prepare(
              "SELECT COUNT(*) AS n FROM points_ledger WHERE user_id = ? AND reason = 'agent_run'",
            )
            .get(user)
        ).n,
      );
      const statuses = Object.fromEntries(
        [...new Set(results.map((r) => r.status))].map((status) => [
          status,
          results.filter((r) => r.status === status).length,
        ]),
      );
      const allowed = mode === 'same-retry-key' ? [201, 409] : [201, 402];
      record({
        mode,
        round,
        concurrentRequests: 10,
        statuses,
        charges: after - before,
        balance,
        elapsedMs: Math.round(performance.now() - start),
        maxRequestMs: Math.max(...results.map((r) => r.ms)),
        errors: results.filter((r) => !allowed.includes(r.status)),
        passed:
          balance === 0 && after - before === 1 && results.every((r) => allowed.includes(r.status)),
      });
    }
} catch (error) {
  record({ passed: false, code: error.code || error.name, message: error.message });
} finally {
  if (second) await second.db.close();
  if (first) await first.dropSchema();
}
console.log(
  JSON.stringify({
    summary: {
      rounds: findings.length,
      passed: findings.filter((r) => r.passed).length,
      failed: findings.filter((r) => !r.passed).length,
    },
    scope:
      'Direct agent runtime, two PostgreSQL pools, isolated schema, no external AI. Not HTTP throughput.',
  }),
);
process.exitCode = findings.every((r) => r.passed) ? 0 : 1;
