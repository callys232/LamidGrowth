/** Explicit retention policy only; IP claims and suppression hashes are never removed here. */
export async function pruneRetainedMailAndDemos(
  store,
  {
    apply = false,
    demoDays = process.env.DEMO_RETENTION_DAYS,
    mailDays = process.env.MAIL_RETENTION_DAYS,
    now = Date.now(),
  } = {},
) {
  for (const days of [demoDays, mailDays])
    if (!Number.isInteger(Number(days)) || Number(days) < 30 || Number(days) > 3650)
      throw new Error('Set demo and mail retention periods to whole days between 30 and 3650.');
  const demoCutoff = now - Number(demoDays) * 86400000,
    mailCutoff = now - Number(mailDays) * 86400000;
  const eligible = `COALESCE(last_seen_at, created_at) < ? AND NOT EXISTS (SELECT 1 FROM demo_sessions s WHERE s.registration_id = demo_registrations.id AND s.expires_at > ?)
    AND NOT EXISTS (SELECT 1 FROM demo_access_tokens t WHERE t.registration_id = demo_registrations.id AND t.expires_at > ?)`;
  return store.transaction(async () => {
    const leads = await store.db
      .prepare(`SELECT id FROM demo_registrations WHERE ${eligible} FOR UPDATE`)
      .all(demoCutoff, now, now);
    const expiredSessions = await store.db
      .prepare('SELECT COUNT(*) AS count FROM demo_sessions WHERE expires_at <= ?')
      .get(now);
    const expiredTokens = await store.db
      .prepare('SELECT COUNT(*) AS count FROM demo_access_tokens WHERE expires_at <= ?')
      .get(now);
    if (apply) {
      await store.db.prepare('DELETE FROM demo_sessions WHERE expires_at <= ?').run(now);
      await store.db.prepare('DELETE FROM demo_access_tokens WHERE expires_at <= ?').run(now);
      for (const lead of leads) {
        await store.db
          .prepare(
            "DELETE FROM mail_messages WHERE outbox_table = 'demo_mail_outbox' AND queue_id IN (SELECT id FROM demo_mail_outbox WHERE user_id = ?)",
          )
          .run(lead.id);
        await store.db.prepare('DELETE FROM demo_registrations WHERE id = ?').run(lead.id);
      }
      for (const table of ['mail_outbox', 'demo_mail_outbox']) {
        const terminal = "status NOT IN ('pending','sending') AND created_at < ?";
        await store.db
          .prepare(
            `DELETE FROM mail_messages WHERE outbox_table = ? AND queue_id IN (SELECT id FROM ${table} WHERE ${terminal})`,
          )
          .run(table, mailCutoff);
        await store.db.prepare(`DELETE FROM ${table} WHERE ${terminal}`).run(mailCutoff);
      }
      await store.db
        .prepare(
          'DELETE FROM mail_provider_events WHERE received_at < ? AND NOT EXISTS (SELECT 1 FROM mail_messages m WHERE m.provider_message_id = mail_provider_events.provider_message_id)',
        )
        .run(mailCutoff);
      await store.db
        .prepare('DELETE FROM mail_worker_health WHERE started_at < ?')
        .run(now - 7 * 86400000);
    }
    return {
      applied: apply,
      inactiveLeads: leads.length,
      expiredSessions: expiredSessions.count,
      expiredTokens: expiredTokens.count,
      preservedIpClaims: true,
      preservedSuppressions: true,
    };
  });
}
