import { randomUUID } from 'node:crypto';

// Call within the same transaction as the owning run's state change.
export async function refundInTransaction(store, userId, workspaceId, referenceId, debitReason, now = Date.now()) {
  const reason = `${debitReason}_refund`;
  const debit = await store.db.prepare('SELECT COALESCE(SUM(amount), 0) AS amount FROM points_ledger WHERE user_id = ? AND reference_id = ? AND reason = ?').get(userId, referenceId, debitReason);
  const amount = -Number(debit.amount);
  if (amount <= 0) return false;
  const receipt = await store.db.prepare('INSERT INTO refund_receipts (reference_id, reason, created_at) VALUES (?, ?, ?) ON CONFLICT DO NOTHING RETURNING reference_id').get(referenceId, reason, now);
  if (!receipt) return false;
  if (await store.db.prepare('SELECT 1 FROM points_ledger WHERE reference_id = ? AND reason = ?').get(referenceId, reason)) return false;
  await store.db.prepare('INSERT INTO points_ledger VALUES (?, ?, ?, ?, ?, ?, ?)').run(randomUUID(), userId, workspaceId, amount, reason, referenceId, now);
  await store.db.prepare('UPDATE users SET points_balance = points_balance + ? WHERE id = ?').run(amount, userId);
  return true;
}

export async function lockAIQuota(store, workspaceId, now = Date.now()) {
  const day = new Date(now).toISOString().slice(0, 10);
  await store.db.prepare('SELECT pg_advisory_xact_lock(hashtext(?))').get(`ai-quota:global:${day}`);
  await store.db.prepare('SELECT pg_advisory_xact_lock(hashtext(?))').get(`ai-quota:${workspaceId}:${day}`);
  return Date.parse(day);
}
