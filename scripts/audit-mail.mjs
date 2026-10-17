import { existsSync, readFileSync } from 'node:fs';
import { Resolver } from 'node:dns/promises';
import pg from 'pg';

if (existsSync('.env')) process.loadEnvFile('.env');
const report = { config: {}, resend: {}, dns: {}, queues: {} };
const safeError = (error) =>
  /^[A-Za-z_0-9]+$/.test(error.cause?.code || error.code || error.name)
    ? error.cause?.code || error.code || error.name
    : 'check_failed';
const sender = (
  process.env.MAIL_FROM?.match(/<([^>]+)>/)?.[1] ||
  process.env.MAIL_FROM ||
  ''
).trim();
const domain = sender.split('@')[1]?.toLowerCase();
report.config = {
  resendConfigured: Boolean(process.env.RESEND_API_KEY),
  senderConfigured: Boolean(sender),
  webhookSecretConfigured: Boolean(process.env.RESEND_WEBHOOK_SECRET),
  apiOrigin: process.env.PUBLIC_ORIGIN ? new URL(process.env.PUBLIC_ORIGIN).origin : null,
  frontendOrigin:
    process.env.ACCOUNT_PUBLIC_ORIGIN ||
    process.env.FRONTEND_ORIGINS?.split(',')[0]?.trim() ||
    null,
};
async function get(path) {
  const response = await fetch(`https://api.resend.com${path}`, {
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok)
    throw Object.assign(new Error('Provider read failed'), { code: `HTTP_${response.status}` });
  return response.json();
}
if (process.env.RESEND_API_KEY && domain) {
  try {
    let match, cursor;
    for (let page = 0; page < 10; page++) {
      const result = await get(
        `/domains?limit=100${cursor ? `&after=${encodeURIComponent(cursor)}` : ''}`,
      );
      match = result.data?.find((entry) => entry.name?.toLowerCase() === domain);
      if (match || !result.has_more || !result.data?.length) break;
      cursor = result.data.at(-1).id;
    }
    if (match) {
      const detail = await get(`/domains/${encodeURIComponent(match.id)}`);
      report.resend.domainVerified = detail.status === 'verified';
      report.resend.sendingCapability = detail.capabilities?.sending ?? 'not_reported';
      report.resend.clickTracking = detail.click_tracking ?? 'not_reported';
      report.resend.openTracking = detail.open_tracking ?? 'not_reported';
      report.resend.dnsRecords = (detail.records || []).map((record) => ({
        record: record.record,
        type: record.type,
        status: record.status,
      }));
    } else report.resend.domainVerified = 'not_found_in_first_1000_domains';
  } catch (error) {
    report.resend.domainCheckError = safeError(error);
  }
  try {
    const hooks = await get('/webhooks?limit=100');
    const enabled = (hooks.data || []).filter((hook) => hook.status === 'enabled');
    report.resend.webhooks = {
      enabledCount: enabled.length,
      hasMore: Boolean(hooks.has_more),
      deliveryEventsConfigured: ['email.delivered', 'email.bounced', 'email.complained'].map(
        (event) => ({ event, configured: enabled.some((hook) => hook.events?.includes(event)) }),
      ),
    };
  } catch (error) {
    report.resend.webhookCheckError = safeError(error);
  }
  try {
    const emails = await get('/emails?limit=100');
    const counts = Object.create(null);
    let bouncedKnownTestRecipients = 0;
    for (const email of emails.data || []) {
      const event = [
        'sent',
        'delivered',
        'delivery_delayed',
        'bounced',
        'complained',
        'opened',
        'clicked',
        'failed',
        'scheduled',
        'canceled',
        'suppressed',
      ].includes(email.last_event)
        ? email.last_event
        : 'unknown';
      counts[event] = (counts[event] || 0) + 1;
      const testRecipient = (email.to || []).every(
        (address) =>
          /@(?:[^@]+\.)?(?:test|invalid)$/i.test(address) ||
          /@example\.(?:com|org|net)$/i.test(address) ||
          /^(?:bounced|delivered|complained|suppressed)(?:\+[^@]+)?@resend\.dev$/i.test(address),
      );
      if (event === 'bounced' && email.to?.length && testRecipient) bouncedKnownTestRecipients++;
    }
    report.resend.recentEmailMetadata = {
      sampled: emails.data?.length || 0,
      hasMore: Boolean(emails.has_more),
      lastEvents: counts,
      bouncedKnownTestRecipients,
      bouncedOtherOrUnclassified: (counts.bounced || 0) - bouncedKnownTestRecipients,
    };
  } catch (error) {
    report.resend.emailMetadataCheckError = safeError(error);
  }
  try {
    const resolver = new Resolver({ timeout: 3000, tries: 1 });
    const records = (await resolver.resolveTxt(`_dmarc.${domain}`)).map((parts) => parts.join(''));
    const dmarc = records.filter((value) => /^v=DMARC1(?:;|$)/i.test(value));
    report.dns = {
      senderDomainDmarcRecords: dmarc.length,
      policies: dmarc.map(
        (value) =>
          value.match(/(?:^|;)\s*p=(none|quarantine|reject)(?:;|$)/i)?.[1]?.toLowerCase() ||
          'unrecognized',
      ),
    };
  } catch (error) {
    report.dns = {
      senderDomainLookupError: safeError(error),
      note: 'A missing subdomain record can inherit the organizational-domain policy; this check does not evaluate inheritance.',
    };
    try {
      const response = await fetch(
        `https://dns.google/resolve?name=${encodeURIComponent(`_dmarc.${domain}`)}&type=TXT`,
        { signal: AbortSignal.timeout(10000) },
      );
      if (!response.ok) throw new Error('DNS HTTPS lookup failed');
      const result = await response.json();
      const dmarc = (result.Answer || [])
        .filter((record) => record.type === 16)
        .map((record) => record.data.replace(/"\s*"/g, '').replace(/^"|"$/g, ''))
        .filter((value) => /^v=DMARC1(?:;|$)/i.test(value));
      report.dns.httpsFallback = {
        dnsStatus: result.Status,
        senderDomainDmarcRecords: dmarc.length,
        policies: dmarc.map(
          (value) =>
            value.match(/(?:^|;)\s*p=(none|quarantine|reject)(?:;|$)/i)?.[1]?.toLowerCase() ||
            'unrecognized',
        ),
      };
    } catch (fallbackError) {
      report.dns.httpsFallbackError = safeError(fallbackError);
    }
  }
}
if (process.argv.includes('--database') && process.env.DATABASE_URL) {
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(
    new URL(process.env.DATABASE_URL).hostname,
  );
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: local
      ? false
      : {
          rejectUnauthorized: true,
          ca: readFileSync(new URL('../server/supabase-ca.pem', import.meta.url), 'utf8'),
        },
    connectionTimeoutMillis: 5000,
    query_timeout: 10000,
    statement_timeout: 8000,
    max: 1,
  });
  pool.on('error', () => {});
  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN READ ONLY');
    for (const table of ['mail_outbox', 'demo_mail_outbox']) {
      const found = await client.query('SELECT to_regclass($1) AS name', [`public.${table}`]);
      if (!found.rows[0].name) {
        report.queues[table] = { tableExists: false };
        continue;
      }
      const result = await client.query(
        `SELECT status, COUNT(*)::int AS count,
        COUNT(*) FILTER (WHERE (status = 'pending' AND next_at <= $1) OR (status = 'sending' AND lease_until <= $1))::int AS due_or_expired_lease
        FROM public.${table} GROUP BY status ORDER BY status`,
        [Date.now()],
      );
      report.queues[table] = { tableExists: true, statuses: result.rows };
    }
    await client.query('ROLLBACK');
  } catch (error) {
    report.queues.error = safeError(error);
  } finally {
    if (client) {
      await client.query('ROLLBACK').catch(() => {});
      client.release();
    }
    await pool.end();
  }
}
console.log(JSON.stringify(report, null, 2));
console.log(
  'Read-only audit: no email sent, no settings changed, no database migrations or writes. Recipient addresses, subjects, bodies and credentials are omitted.',
);
