import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID, randomBytes } from 'node:crypto';
import { openStore } from '../server/store.mjs';
import { createMailOutbox } from '../src/app/mail.mjs';

async function setupTestStore() {
  const schemaName = `mail_test_${randomUUID().replace(/-/g, '_')}`;
  const store = await openStore(schemaName);

  const userId = randomUUID();
  await store.db.prepare(
    "INSERT INTO users (id, email, password, name, demo, created_at) VALUES (?, ?, 'pass', 'Mail Test User', 0, ?)"
  ).run(userId, `user_${Date.now()}_${randomUUID().slice(0, 8)}@example.test`, new Date().toISOString());

  return { store, userId };
}

test('mail outbox enqueues, decrypts, delivers message, and records logs', async (t) => {
  const { store, userId } = await setupTestStore();
  t.after(async () => {
    await store.dropSchema();
  });

  const sentMessages = [];
  const logs = [];

  const mockProvider = {
    async send(message, id) {
      logs.push({ event: 'mail_sent', messageId: id, recipient: message.to, timestamp: Date.now() });
      sentMessages.push({ message, id });
    },
  };

  const key = randomBytes(32);
  const outbox = createMailOutbox(store, mockProvider, key);

  assert.equal(outbox.configured, true, 'outbox should be configured when mail provider is supplied');

  const mailId = randomUUID();
  const testMessage = { to: 'test@example.com', subject: 'Welcome to Lamid', text: 'Your account is ready.' };
  const expiresAt = Date.now() + 300000; // 5 minutes

  logs.push({ event: 'enqueue_message', messageId: mailId });
  await outbox.enqueue(mailId, userId, testMessage, expiresAt);

  // Verify stored in outbox table encrypted
  const pendingRow = await store.db.prepare('SELECT * FROM mail_outbox WHERE id = ?').get(mailId);
  assert.ok(pendingRow, 'mail_outbox row should exist');
  assert.equal(pendingRow.status, 'pending');
  assert.equal(pendingRow.attempts, 0);
  assert.notEqual(pendingRow.payload, JSON.stringify(testMessage), 'payload must be encrypted');

  // Process the mail outbox queue
  logs.push({ event: 'process_queue_start' });
  await outbox.tick();
  logs.push({ event: 'process_queue_complete' });

  // Verify provider received expected decrypted message
  assert.equal(sentMessages.length, 1, 'mock provider should receive 1 message');
  assert.equal(sentMessages[0].id, mailId);
  assert.deepEqual(sentMessages[0].message, testMessage);

  // Verify status updated in outbox DB
  const sentRow = await store.db.prepare('SELECT * FROM mail_outbox WHERE id = ?').get(mailId);
  assert.equal(sentRow.status, 'sent');
  assert.equal(sentRow.payload, '', 'payload should be cleared after delivery');

  // Verify event logs
  assert.equal(logs.length, 4);
  assert.equal(logs[0].event, 'enqueue_message');
  assert.equal(logs[1].event, 'process_queue_start');
  assert.equal(logs[2].event, 'mail_sent');
  assert.equal(logs[3].event, 'process_queue_complete');
});

test('mail outbox captures retry attempts and logs structured delivery errors on failure', async (t) => {
  const { store, userId } = await setupTestStore();
  t.after(async () => {
    await store.dropSchema();
  });

  const capturedConsoleErrors = [];
  const originalConsoleError = console.error;
  console.error = (...args) => {
    capturedConsoleErrors.push(args.join(' '));
  };

  try {
    const failingProvider = {
      async send() {
        throw new Error('Connection refused by remote mail server');
      },
    };

    const key = randomBytes(32);
    const outbox = createMailOutbox(store, failingProvider, key);

    const mailId = randomUUID();
    const message = { to: 'fail@example.com', subject: 'Notification', text: 'Failed delivery test' };
    await outbox.enqueue(mailId, userId, message, Date.now() + 300000);

    // Trigger queue processing which should encounter error and log
    await outbox.tick();

    // Verify row state changed to reflect retry attempt
    const row = await store.db.prepare('SELECT * FROM mail_outbox WHERE id = ?').get(mailId);
    assert.equal(row.status, 'pending', 'status should remain pending for retries');
    assert.equal(row.attempts, 1, 'attempts count should increment to 1');

    // Verify retry log emitted via console.error
    assert.equal(capturedConsoleErrors.length, 1);
    const parsedLog = JSON.parse(capturedConsoleErrors[0]);
    assert.equal(parsedLog.event, 'mail_delivery_retry');
    assert.equal(parsedLog.messageId, mailId);
    assert.equal(parsedLog.attempt, 1);
    assert.equal(parsedLog.failed, false);
  } finally {
    console.error = originalConsoleError;
  }
});
