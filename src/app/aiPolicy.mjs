import { randomUUID } from 'node:crypto';
import { lockAIQuota } from './reliability.mjs';

const deny = (message) => {
  throw Object.assign(new Error(message), { status: 403 });
};
export async function authorizeExternalAI(store, workspaceId, principalId) {
  const user = await store.db
    .prepare('SELECT verified_at, demo, disabled_at FROM users WHERE id = ?')
    .get(principalId);
  if (!user || user.demo || user.disabled_at || !user.verified_at)
    deny('External AI requires a verified account.');
  const member = await store.db
    .prepare(
      "SELECT role FROM workspace_members WHERE user_id = ? AND workspace_id = ? AND status = 'active'",
    )
    .get(principalId, workspaceId);
  if (!member || !['owner', 'member'].includes(member.role))
    deny('Your workspace membership does not permit external AI.');
  const policy = (await store.records(workspaceId, 'ai_policy'))[0];
  if (!policy?.enabled) deny('External AI is disabled in this workspace.');
  return policy;
}
export async function reserveAIUsage(store, workspaceId, principalId) {
  const policy = await authorizeExternalAI(store, workspaceId, principalId);
  const since = await lockAIQuota(store, workspaceId);
  const globalLimit = Math.min(
    1000,
    Math.max(1, Number.parseInt(process.env.AI_GLOBAL_DAILY_LIMIT || '100', 10) || 100),
  );
  // Serializes concurrent reservations sharing the same daily quota bucket — a plain COUNT-then-
  // INSERT would let two parallel Companion/AI calls both see capacity and both reserve, together
  // exceeding the workspace or global daily limit. pg_advisory_xact_lock is transaction-scoped
  // (this function always runs inside store.transaction(), per scopedProvider below) and needs no
  // schema change; see the identical pattern in ai.mjs's /api/ai/reviews for the Deep Review engine
  // — this is the equivalent gate for every other Companion/document AI call.
  if (
    (await store.db.prepare('SELECT COUNT(*) AS n FROM ai_usage WHERE created_at >= ?').get(since))
      .n >= globalLimit ||
    (
      await store.db
        .prepare('SELECT COUNT(*) AS n FROM ai_usage WHERE workspace_id = ? AND created_at >= ?')
        .get(workspaceId, since)
    ).n >= policy.dailyLimit
  ) {
    throw Object.assign(new Error('The daily AI request limit has been reached.'), { status: 429 });
  }
  const id = randomUUID();
  await store.db
    .prepare("INSERT INTO ai_usage VALUES (?, ?, ?, ?, 'pending')")
    .run(id, workspaceId, principalId, Date.now());
  return id;
}

/** Wrap every Companion provider call, including document agents, with the same policy. */
export function scopedProvider(store, provider, workspaceId, principalId, consent) {
  if (!provider) return null;
  return {
    ...provider,
    async review(payload) {
      if (consent !== true)
        deny('Confirm consent to share the relevant workspace context with external AI.');
      if (Buffer.byteLength(JSON.stringify(payload)) > 60000)
        throw Object.assign(new Error('Select less context for this request.'), { status: 413 });
      const usage = await store.transaction(() => reserveAIUsage(store, workspaceId, principalId));
      const controller = new AbortController();
      let timer;
      try {
        const result = await Promise.race([
          provider.review(payload, { signal: controller.signal }),
          new Promise((_, reject) => {
            timer = setTimeout(() => {
              controller.abort();
              reject(new Error('AI request timed out.'));
            }, 45000);
          }),
        ]);
        await authorizeExternalAI(store, workspaceId, principalId);
        const ids = new Set(payload.sources.map((source) => source.id));
        if ((result.review.evidenceIds || []).some((id) => !ids.has(id)))
          throw new Error('AI returned evidence outside the selected context.');
        await store.db.prepare("UPDATE ai_usage SET status = 'completed' WHERE id = ?").run(usage);
        return result;
      } catch (error) {
        await store.db.prepare("UPDATE ai_usage SET status = 'failed' WHERE id = ?").run(usage);
        throw error;
      } finally {
        clearTimeout(timer);
      }
    },
  };
}
