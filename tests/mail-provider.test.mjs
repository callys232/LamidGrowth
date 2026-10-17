import test from 'node:test';
import assert from 'node:assert/strict';
import { resendMailer, sendgridMailer, mailFrontendOrigin } from '../src/app/mail.mjs';
import { accountAccessEmail } from '../src/app/emails/accountAccess.mjs';

test('Resend sends the visitor address with a stable idempotency key and returns acceptance metadata', async () => {
  let sent;
  const mailer = resendMailer({
    apiKey: 'test-only',
    from: 'demo@example.test',
    fetcher: async (url, options) => {
      sent = { url, options };
      return Response.json({ id: 'provider-message-id' });
    },
  });
  const accepted = await mailer.send(
    { to: 'visitor@example.test', subject: 'Welcome', text: 'Private return link' },
    'stable-outbox-id',
  );
  assert.equal(sent.url, 'https://api.resend.com/emails');
  assert.deepEqual(JSON.parse(sent.options.body).to, ['visitor@example.test']);
  assert.equal(sent.options.headers['Idempotency-Key'], 'stable-outbox-id');
  assert.deepEqual(accepted, { provider: 'resend', messageId: 'provider-message-id' });
});
test('provider errors distinguish permanent rejection, concurrency, throttling and server failures', async () => {
  for (const [status, name, retryable] of [
    [400, 'validation_error', false],
    [401, 'unauthorized', false],
    [403, 'validation_error', false],
    [409, 'invalid_idempotent_request', false],
    [409, 'concurrent_idempotent_requests', true],
    [429, 'rate_limit_exceeded', true],
    [500, 'internal_server_error', true],
  ]) {
    const mailer = resendMailer({
      apiKey: 'test-only',
      from: 'demo@example.test',
      fetcher: async () =>
        Response.json(
          { name, message: 'private recipient information' },
          { status, headers: { 'retry-after': '120' } },
        ),
    });
    await assert.rejects(
      mailer.send({ to: 'visitor@example.test', text: 'private' }, 'id'),
      (error) => {
        assert.equal(error.retryable, retryable);
        assert.equal(error.retryAfterMs, 120000);
        assert.equal(error.providerStatus, status);
        assert.ok(!error.message.includes('private'));
        return true;
      },
    );
  }
});
test('SendGrid captures accepted metadata and honors Retry-After HTTP dates', async () => {
  const success = sendgridMailer({
    apiKey: 'test-only',
    from: 'demo@example.test',
    fetcher: async () =>
      new Response(null, { status: 202, headers: { 'x-message-id': 'sendgrid-id' } }),
  });
  assert.deepEqual(await success.send({ to: 'visitor@example.test', text: 'Test' }, 'id'), {
    provider: 'sendgrid',
    messageId: 'sendgrid-id',
  });
  const limited = sendgridMailer({
    apiKey: 'test-only',
    from: 'demo@example.test',
    fetcher: async () =>
      Response.json(
        {},
        { status: 429, headers: { 'retry-after': new Date(Date.now() + 120000).toUTCString() } },
      ),
  });
  await assert.rejects(
    limited.send({ to: 'visitor@example.test' }, 'id'),
    (error) => error.retryable && error.retryAfterMs > 118000 && error.retryAfterMs <= 120000,
  );
});
test('frontend link origins reject unsafe values and account copy stays in editable templates', () => {
  assert.equal(
    mailFrontendOrigin({ origin: 'https://app.example.test', production: true }).origin,
    'https://app.example.test',
  );
  for (const origin of [
    'http://app.example.test',
    'https://user:secret@app.example.test',
    'https://app.example.test/path',
    'https://app.example.test/?token=secret',
    'https://app.example.test/#secret',
  ])
    assert.throws(() => mailFrontendOrigin({ origin, production: true }));
  const verified = accountAccessEmail({
    purpose: 'verification',
    code: '123456',
    link: 'https://app.example.test/verify?token=test',
  });
  assert.match(verified.text, /123456/);
  assert.match(verified.text, /10 minutes/);
  const recovered = accountAccessEmail({
    purpose: 'recovery',
    code: 'do-not-include',
    link: 'https://app.example.test/reset-password?token=test',
  });
  assert.ok(!recovered.text.includes('do-not-include'));
  assert.match(recovered.text, /single-use/);
});
