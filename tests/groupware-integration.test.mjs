import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import express from 'express';
import { findOrCreateGlobalIdentity, promoteToPayingClient, normalizeEmail, normalizePhone } from '../src/app/groupware/identity.mjs';
import { queueOutboundSync, processInboundSync, getOrSetEntityMapping } from '../src/app/groupware/sync.mjs';
import { mountGroupwareWebhook } from '../src/app/groupware/webhook.mjs';
import { mountGroupwareAdmin } from '../src/app/groupware/admin.mjs';
import { getGroupwareConfig, sanitizeLogData } from '../src/app/groupware/config.mjs';
import { signRequestPayload } from '../src/app/groupware/client.mjs';

/**
 * Creates an in-memory SQL mock store simulating PostgreSQL prepared statements.
 */
function createMockStore() {
  const tables = {
    global_user_identities: [],
    groupware_entity_mappings: [],
    groupware_sync_events: [],
  };

  const db = {
    prepare(sql) {
      return {
        async run(...args) {
          if (sql.includes('INSERT INTO global_user_identities')) {
            const [
              global_user_id, lamid_one_user_id, groupware_user_id,
              primary_email, normalized_email, phone_number,
              registration_source, account_status, is_client,
              client_converted_at, metadata, created_at, updated_at
            ] = args;
            tables.global_user_identities.push({
              global_user_id, lamid_one_user_id, groupware_user_id,
              primary_email, normalized_email, phone_number,
              registration_source, account_status, is_client,
              client_converted_at, metadata, created_at, updated_at
            });
            return { changes: 1 };
          }
          if (sql.includes('UPDATE global_user_identities SET')) {
            if (sql.includes('is_client = 1')) {
              const [convertedAt, metadata, updated_at, gid] = args;
              const row = tables.global_user_identities.find((r) => r.global_user_id === gid);
              if (row) {
                row.is_client = 1;
                row.client_converted_at = row.client_converted_at || convertedAt;
                row.metadata = metadata;
                row.updated_at = updated_at;
              }
            } else {
              const [newL1, newGw, newPhone, isClient, convertedAt, metadata, updated_at, gid] = args;
              const row = tables.global_user_identities.find((r) => r.global_user_id === gid);
              if (row) {
                row.lamid_one_user_id = newL1;
                row.groupware_user_id = newGw;
                row.phone_number = newPhone;
                row.is_client = isClient;
                row.client_converted_at = convertedAt;
                row.metadata = metadata;
                row.updated_at = updated_at;
              }
            }
            return { changes: 1 };
          }
          if (sql.includes('INSERT INTO groupware_entity_mappings')) {
            const [id, entity_type, lamid_one_id, groupware_id, sync_direction, last_synced_at, metadata] = args;
            tables.groupware_entity_mappings.push({
              id, entity_type, lamid_one_id, groupware_id, sync_direction, last_synced_at, metadata
            });
            return { changes: 1 };
          }
          if (sql.includes('INSERT INTO groupware_sync_events')) {
            const [id, event_id, entity_type, entity_id, action, payload, created_at] = args;
            const direction = sql.includes("'inbound'") ? 'inbound' : 'outbound';
            tables.groupware_sync_events.push({
              id, event_id, direction, entity_type, entity_id, action,
              payload, status: 'pending', attempt_count: 0, max_attempts: 5, created_at
            });
            return { changes: 1 };
          }
          if (sql.includes("UPDATE groupware_sync_events SET status = 'completed'")) {
            const [completed_at, id] = args;
            const ev = tables.groupware_sync_events.find((e) => e.id === id);
            if (ev) {
              ev.status = 'completed';
              ev.completed_at = completed_at;
              ev.last_error = null;
              ev.attempt_count++;
            }
            return { changes: 1 };
          }
          if (sql.includes("UPDATE groupware_sync_events SET status = 'failed'")) {
            const [err, next_retry, id] = args;
            const ev = tables.groupware_sync_events.find((e) => e.id === id);
            if (ev) {
              ev.status = 'failed';
              ev.last_error = err;
              ev.next_retry_at = next_retry;
              ev.attempt_count++;
            }
            return { changes: 1 };
          }
          return { changes: 0 };
        },
        async get(...args) {
          if (sql.includes('FROM global_user_identities WHERE lamid_one_user_id = ?')) {
            return tables.global_user_identities.find((r) => r.lamid_one_user_id === args[0]);
          }
          if (sql.includes('FROM global_user_identities WHERE groupware_user_id = ?')) {
            return tables.global_user_identities.find((r) => r.groupware_user_id === args[0]);
          }
          if (sql.includes('FROM global_user_identities WHERE normalized_email = ?')) {
            return tables.global_user_identities.find((r) => r.normalized_email === args[0]);
          }
          if (sql.includes('FROM global_user_identities WHERE global_user_id = ?')) {
            return tables.global_user_identities.find((r) => r.global_user_id === args[0]);
          }
          if (sql.includes('FROM groupware_entity_mappings WHERE entity_type = ? AND lamid_one_id = ?')) {
            return tables.groupware_entity_mappings.find((m) => m.entity_type === args[0] && m.lamid_one_id === args[1]);
          }
          if (sql.includes('FROM groupware_entity_mappings WHERE entity_type = ? AND groupware_id = ?')) {
            return tables.groupware_entity_mappings.find((m) => m.entity_type === args[0] && m.groupware_id === args[1]);
          }
          if (sql.includes('FROM groupware_entity_mappings WHERE id = ?')) {
            return tables.groupware_entity_mappings.find((m) => m.id === args[0]);
          }
          if (sql.includes('FROM groupware_sync_events WHERE event_id = ?')) {
            return tables.groupware_sync_events.find((e) => e.event_id === args[0]);
          }
          if (sql.includes('FROM groupware_sync_events WHERE id = ?')) {
            return tables.groupware_sync_events.find((e) => e.id === args[0]);
          }
          if (sql.includes('SELECT count(*)::int AS count FROM global_user_identities WHERE is_client = 1')) {
            return { count: tables.global_user_identities.filter((r) => r.is_client === 1).length };
          }
          if (sql.includes('SELECT count(*)::int AS count FROM global_user_identities')) {
            return { count: tables.global_user_identities.length };
          }
          if (sql.includes('SELECT count(*)::int AS count FROM groupware_entity_mappings')) {
            return { count: tables.groupware_entity_mappings.length };
          }
          if (sql.includes('SELECT count(*)::int AS count FROM groupware_sync_events')) {
            return { count: tables.groupware_sync_events.length };
          }
          return null;
        },
        async all() {
          if (sql.includes('FROM groupware_sync_events')) {
            return tables.groupware_sync_events;
          }
          return [];
        },
      };
    },
  };

  return {
    db,
    tables,
    async transaction(work) {
      return await work();
    },
    async log() {},
  };
}

test('01. Email and Phone normalization handles canonical identities', () => {
  assert.equal(normalizeEmail('John.Doe+promo@gmail.com'), 'johndoe@gmail.com');
  assert.equal(normalizeEmail('USER@DOMAIN.COM'), 'user@domain.com');
  assert.equal(normalizePhone('+1 (555) 234-5678'), '+15552345678');
});

test('02. Fresh registration in LAMID ONE creates shared global identity', async () => {
  const store = createMockStore();
  const identity = await findOrCreateGlobalIdentity(store, {
    email: 'executive@example.com',
    lamidOneUserId: 'u_101',
    registrationSource: 'lamid_one',
    isClient: false,
  });

  assert.ok(identity.global_user_id.startsWith('gid_'));
  assert.equal(identity.lamid_one_user_id, 'u_101');
  assert.equal(identity.groupware_user_id, null);
  assert.equal(identity.is_client, 0);
  assert.equal(identity.normalized_email, 'executive@example.com');
});

test('03. Registration in Groupware creates shared global identity', async () => {
  const store = createMockStore();
  const identity = await findOrCreateGlobalIdentity(store, {
    email: 'adviser@groupware.com',
    groupwareUserId: 'gw_999',
    registrationSource: 'groupware',
    isClient: false,
  });

  assert.ok(identity.global_user_id.startsWith('gid_'));
  assert.equal(identity.lamid_one_user_id, null);
  assert.equal(identity.groupware_user_id, 'gw_999');
  assert.equal(identity.registration_source, 'groupware');
});

test('04. Existing user subsequent access links safely without creating duplicate', async () => {
  const store = createMockStore();
  
  // First registered in LAMID ONE
  const first = await findOrCreateGlobalIdentity(store, {
    email: 'shared@enterprise.com',
    lamidOneUserId: 'u_202',
    registrationSource: 'lamid_one',
  });

  // Later logs into / registers on Groupware with the same verified email
  const second = await findOrCreateGlobalIdentity(store, {
    email: 'Shared@Enterprise.com',
    groupwareUserId: 'gw_555',
    registrationSource: 'groupware',
  });

  assert.equal(second.global_user_id, first.global_user_id);
  assert.equal(second.lamid_one_user_id, 'u_202');
  assert.equal(second.groupware_user_id, 'gw_555');
  assert.equal(store.tables.global_user_identities.length, 1);
});

test('05. Prospect to Paying Client conversion is monotonic and verified', async () => {
  const store = createMockStore();
  const identity = await findOrCreateGlobalIdentity(store, {
    email: 'prospect@startup.com',
    lamidOneUserId: 'u_303',
    registrationSource: 'lamid_one',
    isClient: false,
  });

  assert.equal(identity.is_client, 0);

  // Convert via verified payment
  const converted = await promoteToPayingClient(store, {
    lamidOneUserId: 'u_303',
    paymentReference: 'pay_ref_888999',
    source: 'paystack_subscription',
  });

  assert.equal(converted.is_client, 1);
  assert.ok(converted.client_converted_at);

  // Subsequent sync with isClient: false CANNOT downgrade a client
  const protectedIdentity = await findOrCreateGlobalIdentity(store, {
    email: 'prospect@startup.com',
    isClient: false,
    registrationSource: 'groupware',
  });

  assert.equal(protectedIdentity.is_client, 1);
});

test('06. Entity mapping tracks project, milestone, and review relationships', async () => {
  const store = createMockStore();
  const projectMap = await getOrSetEntityMapping(store, {
    entityType: 'project',
    lamidOneId: 'proj_l1_1',
    groupwareId: 'proj_gw_1',
    metadata: { title: 'Q4 Digital Transformation' },
  });

  assert.ok(projectMap.id.startsWith('map_'));
  assert.equal(projectMap.lamid_one_id, 'proj_l1_1');
  assert.equal(projectMap.groupware_id, 'proj_gw_1');

  // Lookup by Groupware ID finds the existing mapping
  const found = await getOrSetEntityMapping(store, {
    entityType: 'project',
    groupwareId: 'proj_gw_1',
  });
  assert.equal(found.id, projectMap.id);
});

test('07. Financial & Escrow integrity: sync records references but never alters balances', async () => {
  const store = createMockStore();
  const result = await processInboundSync(store, {
    eventId: 'evt_tx_001',
    entityType: 'escrow',
    entityId: 'escrow_gw_99',
    action: 'status_change',
    payload: {
      reference: 'ESCROW_REF_001',
      amountMinor: 5000000,
      currency: 'NGN',
      escrowStatus: 'held',
    },
    source: 'groupware',
  });

  assert.equal(result.ok, true);
  const mapping = store.tables.groupware_entity_mappings.find((m) => m.entity_type === 'escrow');
  assert.ok(mapping);
  const meta = JSON.parse(mapping.metadata);
  assert.equal(meta.isAuthoritative, false); // Balance authority remains with payment provider
});

test('08. Duplicate webhook delivery is recognized and idempotent', async () => {
  const store = createMockStore();
  const event = {
    eventId: 'evt_idempotent_123',
    entityType: 'user',
    entityId: 'gw_user_777',
    action: 'create',
    payload: { email: 'idempotent@test.com' },
    source: 'groupware',
  };

  const first = await processInboundSync(store, event);
  assert.equal(first.ok, true);
  assert.equal(first.duplicate, undefined);

  // Second delivery of identical eventId
  const second = await processInboundSync(store, event);
  assert.equal(second.ok, true);
  assert.equal(second.duplicate, true);
});

test('09. Webhook receiver validates HMAC signature and rejects invalid signatures', async () => {
  const store = createMockStore();
  const app = express();
  app.use(express.json({ verify: (req, _res, buf) => { req.rawBody = buf; } }));

  const webhookSecret = 'test_secret_key_1234567890abcdef1234567890abcdef';
  mountGroupwareWebhook(app, store, { webhookSecret });

  const payload = {
    eventId: 'evt_sig_test_1',
    entityType: 'user',
    entityId: 'gw_u1',
    action: 'create',
    payload: { email: 'signed@test.com' },
  };
  const bodyString = JSON.stringify(payload);
  const timestamp = Date.now().toString();

  // Valid signature
  const validSig = createHmac('sha256', webhookSecret)
    .update(`${timestamp}.${bodyString}`)
    .digest('hex');

  const server = app.listen(0);
  const port = server.address().port;

  try {
    // 1. Valid request
    const validRes = await fetch(`http://127.0.0.1:${port}/api/groupware/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Groupware-Signature': validSig,
        'X-Groupware-Timestamp': timestamp,
      },
      body: bodyString,
    });
    assert.equal(validRes.status, 200);

    // 2. Tampered body
    const invalidRes = await fetch(`http://127.0.0.1:${port}/api/groupware/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Groupware-Signature': validSig,
        'X-Groupware-Timestamp': timestamp,
      },
      body: JSON.stringify({ ...payload, tampered: true }),
    });
    assert.equal(invalidRes.status, 401);

    // 3. Expired timestamp (> 5 minutes)
    const expiredTimestamp = (Date.now() - 10 * 60 * 1000).toString();
    const expiredSig = createHmac('sha256', webhookSecret)
      .update(`${expiredTimestamp}.${bodyString}`)
      .digest('hex');

    const expiredRes = await fetch(`http://127.0.0.1:${port}/api/groupware/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Groupware-Signature': expiredSig,
        'X-Groupware-Timestamp': expiredTimestamp,
      },
      body: bodyString,
    });
    assert.equal(expiredRes.status, 401);
  } finally {
    server.close();
  }
});

test('10. Sensitive data sanitization prevents leaking credentials in logs and admin', () => {
  const sensitiveObj = {
    apiKey: 'secret_key_12345',
    apiSecret: 'top_secret_xyz',
    password: 'SuperSecretPassword123!',
    user: {
      email: 'safe@test.com',
      token: 'jwt_bearer_token',
    },
  };

  const sanitized = sanitizeLogData(sensitiveObj);
  assert.equal(sanitized.apiKey, '[REDACTED]');
  assert.equal(sanitized.apiSecret, '[REDACTED]');
  assert.equal(sanitized.password, '[REDACTED]');
  assert.equal(sanitized.user.token, '[REDACTED]');
  assert.equal(sanitized.user.email, 'safe@test.com');
});

test('11. Failed outbound requests record error and queue for retry with exponential backoff', async () => {
  const store = createMockStore();
  const mockFailingClient = {
    config: { isConfigured: true },
    async syncUser() {
      throw new Error('Connection refused: Groupware API unavailable (ECONNREFUSED)');
    },
  };

  const queued = await queueOutboundSync(
    store,
    {
      eventId: 'evt_fail_1',
      entityType: 'user',
      entityId: 'u_fail',
      action: 'create',
      payload: { email: 'fail@test.com' },
    },
    mockFailingClient
  );

  assert.equal(queued.status, 'queued_for_retry');
  const event = store.tables.groupware_sync_events.find((e) => e.event_id === 'evt_fail_1');
  assert.ok(event);
  assert.equal(event.status, 'failed');
  assert.equal(event.attempt_count, 1);
  assert.ok(event.last_error.includes('Connection refused'));
  assert.ok(event.next_retry_at);
});

test('12. Administrative status endpoint rejects unauthorized callers with 401 or 403', async () => {
  const store = createMockStore();
  const app = express();
  app.use(express.json());

  // Attach mock user middleware
  let currentUser = null;
  app.use((req, _res, next) => {
    req.user = currentUser;
    next();
  });

  mountGroupwareAdmin(app, store, { ecosystemAdminEmails: ['admin@lamid.com'] });

  const server = app.listen(0);
  const port = server.address().port;

  try {
    // 1. Unauthenticated (no user)
    currentUser = null;
    const unauthRes = await fetch(`http://127.0.0.1:${port}/api/admin/groupware/status`);
    assert.equal(unauthRes.status, 401);

    // 2. Regular user (non-admin)
    currentUser = { id: 'u_reg', email: 'regular@example.com', role: 'member' };
    const forbiddenRes = await fetch(`http://127.0.0.1:${port}/api/admin/groupware/status`);
    assert.equal(forbiddenRes.status, 403);

    // 3. Authorized ecosystem admin
    currentUser = { id: 'u_adm', email: 'admin@lamid.com', role: 'admin' };
    const adminRes = await fetch(`http://127.0.0.1:${port}/api/admin/groupware/status`);
    assert.equal(adminRes.status, 200);
    const data = await adminRes.json();
    assert.ok(data.metrics);
    assert.equal(typeof data.metrics.totalIdentities, 'number');
  } finally {
    server.close();
  }
});

test('13. Admin retry endpoint re-dispatches a previously failed event', async () => {
  const store = createMockStore();
  const app = express();
  app.use(express.json());

  app.use((req, _res, next) => {
    req.user = { id: 'u_adm', email: 'admin@lamid.com', role: 'admin' };
    next();
  });

  mountGroupwareAdmin(app, store, { ecosystemAdminEmails: ['admin@lamid.com'] });

  // Seed a failed event
  store.tables.groupware_sync_events.push({
    id: 'sync_failed_row_1',
    event_id: 'evt_retry_me',
    direction: 'outbound',
    entity_type: 'user',
    entityId: 'u_retry',
    action: 'create',
    payload: JSON.stringify({ email: 'retried@test.com' }),
    status: 'failed',
    attempt_count: 1,
    max_attempts: 5,
    last_error: 'Timeout',
    created_at: new Date().toISOString(),
  });

  const server = app.listen(0);
  const port = server.address().port;

  try {
    const res = await fetch(`http://127.0.0.1:${port}/api/admin/groupware/retry/sync_failed_row_1`, {
      method: 'POST',
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.retried, true);
    assert.equal(body.eventId, 'evt_retry_me');

    const updated = store.tables.groupware_sync_events.find((e) => e.id === 'sync_failed_row_1');
    assert.equal(updated.status, 'completed');
    assert.equal(updated.last_error, null);
  } finally {
    server.close();
  }
});

test('14. Review synchronization persists ratings and client feedback with append-only integrity', async () => {
  const store = createMockStore();
  const res = await processInboundSync(store, {
    eventId: 'evt_rev_001',
    entityType: 'review',
    entityId: 'rev_gw_42',
    action: 'create',
    payload: {
      rating: 5,
      feedback: 'Excellent strategic roadmap delivered on schedule.',
      authorGroupwareId: 'gw_client_1',
    },
    source: 'groupware',
  });

  assert.equal(res.ok, true);
  const mapping = store.tables.groupware_entity_mappings.find((m) => m.entity_type === 'review');
  assert.ok(mapping);
  const meta = JSON.parse(mapping.metadata);
  assert.equal(meta.rating, 5);
  assert.equal(meta.feedback, 'Excellent strategic roadmap delivered on schedule.');
});

test('15. Loop prevention: events originating from Groupware are tagged and not re-emitted infinitely', async () => {
  const store = createMockStore();
  // An inbound sync from Groupware records groupware as source
  const inbound = await processInboundSync(store, {
    eventId: 'evt_loop_prevent_1',
    entityType: 'project',
    entityId: 'proj_loop_1',
    action: 'update',
    payload: { status: 'in_progress' },
    source: 'groupware',
  });

  assert.equal(inbound.ok, true);
  // Assert no outbound event was created for the inbound update
  const outboundForThis = store.tables.groupware_sync_events.filter(
    (e) => e.direction === 'outbound' && e.entity_id === 'proj_loop_1'
  );
  assert.equal(outboundForThis.length, 0);
});

test('16. Request payload signing creates verifiable HMAC signatures for outbound HTTP requests', () => {
  const secret = 'super_secret_shared_hmac_key';
  const timestamp = '1730700000000';
  const body = JSON.stringify({ action: 'sync_user', userId: 'u_123' });

  const sig1 = signRequestPayload(secret, timestamp, body);
  const sig2 = signRequestPayload(secret, timestamp, body);

  assert.equal(sig1, sig2);
  assert.equal(sig1.length, 64); // 32-byte hex string

  // Tampering body invalidates signature
  const tamperedSig = signRequestPayload(secret, timestamp, body + ' ');
  assert.notEqual(sig1, tamperedSig);
});
