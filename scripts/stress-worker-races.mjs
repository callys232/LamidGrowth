// Bounded, isolated PostgreSQL race probes. No live email/model calls.
import { randomUUID } from 'node:crypto';
import { openStore } from '../server/store.mjs';
import { createAgentRuntime } from '../src/app/agents.mjs';
import { acquireServiceLease } from '../src/app/operations.mjs';
import { createMailOutbox } from '../src/app/mail.mjs';

let first, second;
const findings = [];
function record(value) { findings.push(value); console.log(JSON.stringify(value)); }
try {
  first = await openStore(':memory:');
  second = await openStore(first.schema, { poolMax: 2 });
  const user = randomUUID(), workspace = randomUUID();
  await first.db.prepare('INSERT INTO users (id,name,created_at,points_balance) VALUES (?,?,?,100)').run(user, 'Isolated race fixture', new Date().toISOString());
  await first.db.prepare('INSERT INTO workspaces (id,user_id,name,context) VALUES (?,?,?,?)').run(workspace, user, 'Race fixture', 'Founder');
  const runtimes = [createAgentRuntime(first, {}), createAgentRuntime(second, {})];
  for (let round = 1; round <= 5; round++) {
    const id = randomUUID();
    await first.db.prepare('UPDATE users SET points_balance = 99 WHERE id = ?').run(user);
    await first.db.prepare("INSERT INTO agent_runs VALUES (?,?,?,'context-curator','{}',NULL,'running',?,NULL)").run(id, workspace, user, new Date(Date.now() - 180000).toISOString());
    await first.db.prepare("INSERT INTO points_ledger VALUES (?,?,?,-1,'agent_run',?,?)").run(randomUUID(), user, workspace, id, Date.now());
    const results = await Promise.allSettled(runtimes.map(runtime => runtime.reconcile()));
    const refunds = await first.db.prepare("SELECT COUNT(*) AS count, COALESCE(SUM(amount),0) AS total FROM points_ledger WHERE reference_id = ? AND reason = 'agent_run_refund'").get(id);
    const balance = (await first.db.prepare('SELECT points_balance FROM users WHERE id = ?').get(user)).points_balance;
    record({ probe: 'concurrent-stale-refund', round, refunds: Number(refunds.count), refundedPoints: Number(refunds.total), balance, errors: results.filter(r => r.status === 'rejected').map(r => r.reason.code || r.reason.name), passed: Number(refunds.count) === 1 && balance === 100 });
  }
  for (let round = 1; round <= 5; round++) {
    const name = `race-${randomUUID()}`;
    const claims = await Promise.all([acquireServiceLease(first, name, 'a', 1000, 1000), acquireServiceLease(second, name, 'b', 1000, 1000)]);
    record({ probe: 'scheduler-claim', round, winners: claims.filter(Boolean).length, passed: claims.filter(Boolean).length === 1 });
  }
  let sends = 0;
  const provider = { async send() { sends++; } };
  const mailA = createMailOutbox(first, provider, Buffer.alloc(32, 2));
  const mailB = createMailOutbox(second, provider, Buffer.alloc(32, 2));
  for (let round = 1; round <= 5; round++) {
    sends = 0;
    await mailA.enqueue(randomUUID(), user, { to: 'unused@example.test', text: 'No external delivery' }, Date.now() + 120000);
    await Promise.all([mailA.tick(), mailB.tick()]);
    record({ probe: 'mail-claim', round, sends, passed: sends === 1 });
  }
} catch (error) {
  record({ probe: 'infrastructure', passed: false, code: error.code || error.name, message: error.message });
} finally {
  if (second) await second.db.close();
  if (first) await first.dropSchema();
}
console.log(JSON.stringify({ summary: { probes: findings.length, passed: findings.filter(r => r.passed).length, failed: findings.filter(r => !r.passed).length }, isolation: 'Two independent connection pools in one process, sharing one disposable TEST_DATABASE_URL schema; not an OS-process crash test' }));
process.exitCode = findings.every(r => r.passed) ? 0 : 1;
