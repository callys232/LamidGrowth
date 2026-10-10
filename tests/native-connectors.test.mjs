import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createFundedTestApp } from './support/funded-app.mjs';
import { createConnectorProviders, salesforceOrigin } from '../src/app/connectorProviders.mjs';

const env = {
  PUBLIC_ORIGIN: 'https://test.example',
  ACCOUNT_SECURITY_KEY: 'ab'.repeat(32),
  SLACK_CLIENT_ID: 'slack-id',
  SLACK_CLIENT_SECRET: 'slack-secret',
  SALESFORCE_CLIENT_ID: 'sf-id',
  SALESFORCE_CLIENT_SECRET: 'sf-secret',
};
const calls = [];
let failRead = false;
const fetchImpl = async (url, options = {}) => {
  calls.push({ url: String(url), options });
  if (String(url).includes('oauth.v2.access'))
    return Response.json({
      ok: true,
      access_token: 'slack-access-private',
      scope: 'channels:read',
      team: { name: 'Example team' },
    });
  if (String(url).includes('conversations.list'))
    return Response.json(
      failRead
        ? { ok: false, error: 'token_revoked' }
        : {
            ok: true,
            channels: [{ id: 'C1', name: 'general', num_members: 4 }],
            response_metadata: {},
          },
    );
  if (String(url).includes('auth.revoke')) return Response.json({ ok: true, revoked: true });
  if (String(url).includes('/oauth2/token'))
    return Response.json({
      access_token: 'sf-access-private',
      refresh_token: 'sf-refresh-private',
      instance_url: 'https://example.my.salesforce.com',
      scope: 'api refresh_token',
    });
  if (String(url).endsWith('/services/data/')) return Response.json([{ version: '65.0' }]);
  if (String(url).includes('/query?'))
    return Response.json({
      totalSize: 1,
      records: [{ attributes: { type: 'Contact' }, Id: 'R1', Name: 'Sample record' }],
    });
  if (String(url).includes('/revoke')) return new Response('', { status: 200 });
  throw Error('Unexpected provider URL');
};
let server, store, base;
before(async () => {
  const instance = await createFundedTestApp({
    filename: ':memory:',
    connectorOAuth: { env, fetchImpl },
    rateLimits: { api: { max: 2000 }, auth: { max: 1000 }, mutation: { max: 1000 } },
  });
  store = instance.store;
  server = await new Promise((resolve) => {
    const s = instance.app.listen(0, '127.0.0.1', () => resolve(s));
  });
  base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => {
  await new Promise((resolve) => server.close(resolve));
  await store.dropSchema();
});
const request = async (path, { cookie, body, method } = {}) => {
  const verb = method || (body ? 'POST' : 'GET');
  if (!['GET', 'HEAD'].includes(verb) && body === undefined) body = {};
  const r = await fetch(base + '/api' + path, {
    method: verb,
    redirect: 'manual',
    headers: {
      ...(cookie ? { Cookie: cookie } : {}),
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return {
    status: r.status,
    data: r.headers.get('content-type')?.includes('json') ? await r.json() : null,
    cookie: r.headers.get('set-cookie')?.split(';')[0],
    location: r.headers.get('location'),
  };
};
let serial = 0;
const signup = async () => {
  const r = await request('/auth/signup', {
    body: {
      name: 'Connector owner',
      email: `native-${Date.now()}-${serial++}@example.test`,
      password: 'native-connector-password-long',
      context: 'Founder',
    },
  });
  assert.equal(r.status, 201);
  return r.cookie;
};
const authorize = async (provider, cookie) => {
  const start = await request(`/connectors/oauth/${provider}/start`, { cookie, body: {} });
  assert.equal(start.status, 200);
  const url = new URL(start.data.url);
  const state = url.searchParams.get('state');
  const callback = await request(
    `/connectors/oauth/${provider}/callback?state=${state}&code=sample`,
    { cookie },
  );
  assert.equal(callback.status, 302);
  const list = await request('/connectors', { cookie });
  return { state, connector: list.data.find((c) => c.type === provider), url };
};

test('provider setup is explicit and Salesforce rejects untrusted instance hosts', () => {
  assert.equal(createConnectorProviders({ env: {} }).providers.slack.configured, false);
  assert.equal(createConnectorProviders({ env }).providers.slack.configured, true);
  assert.equal(
    createConnectorProviders({ env: { ...env, PUBLIC_ORIGIN: 'invalid' } }).providers.slack
      .configured,
    false,
  );
  for (const value of [
    'https://evil.example',
    'https://salesforce.com.evil.example',
    'http://example.salesforce.com',
    'https://user:pass@example.salesforce.com',
  ])
    assert.throws(() => salesforceOrigin(value));
});
test('Slack authorization is session-bound, single-use, and stores encrypted tokens', async () => {
  const cookie = await signup();
  const other = await signup();
  const start = await request('/connectors/oauth/slack/start', { cookie, body: {} });
  const state = new URL(start.data.url).searchParams.get('state');
  assert.equal(
    (
      await request(`/connectors/oauth/slack/callback?state=${state}&code=sample`, {
        cookie: other,
      })
    ).status,
    400,
  );
  assert.equal(
    (await request(`/connectors/oauth/slack/callback?state=${state}&code=sample`, { cookie }))
      .status,
    302,
  );
  assert.equal(
    (await request(`/connectors/oauth/slack/callback?state=${state}&code=sample`, { cookie }))
      .status,
    400,
  );
  const list = await request('/connectors', { cookie });
  const connector = list.data[0];
  assert.equal(connector.type, 'slack');
  assert.equal(connector.secret, undefined);
  assert.equal(JSON.stringify(list.data).includes('slack-access-private'), false);
  const credential = await store.db
    .prepare('SELECT payload FROM connector_credentials WHERE connector_id = ?')
    .get(connector.id);
  assert.equal(credential.payload.includes('slack-access-private'), false);
  assert.equal(
    (await request(`/connectors/${connector.id}/sync`, { cookie: other, body: {} })).status,
    404,
  );
});
test('Slack reads real adapter data, prevents forged grants, records failures, and revokes on delete', async () => {
  const cookie = await signup();
  const { connector } = await authorize('slack', cookie);
  assert.equal(
    (await request(`/connectors/${connector.id}/grants`, { cookie, body: { scope: 'chat:write' } }))
      .status,
    409,
  );
  const read = await request(`/connectors/${connector.id}/sync`, { cookie, body: {} });
  assert.equal(read.status, 200);
  assert.equal(read.data.channels[0].name, 'general');
  const saved = await request(`/connectors/${connector.id}/snapshot`, { cookie });
  assert.equal(saved.data.data.channels.length, 1);
  failRead = true;
  assert.equal(
    (await request(`/connectors/${connector.id}/sync`, { cookie, body: {} })).status,
    502,
  );
  failRead = false;
  assert.equal(
    (await request(`/connectors/${connector.id}`, { cookie, method: 'DELETE' })).status,
    204,
  );
  assert.ok(calls.some((c) => c.url.includes('auth.revoke')));
  assert.equal((await request(`/connectors/${connector.id}/snapshot`, { cookie })).status, 404);
});
test('Salesforce uses PKCE and imports bounded contacts and opportunities', async () => {
  const cookie = await signup();
  const { connector, url } = await authorize('salesforce', cookie);
  assert.equal(url.searchParams.get('code_challenge_method'), 'S256');
  assert.ok(url.searchParams.get('code_challenge'));
  assert.ok(
    calls.some((c) => c.url.includes('/oauth2/token') && c.options.body.get('code_verifier')),
  );
  const r = await request(`/connectors/${connector.id}/sync`, { cookie, body: {} });
  assert.equal(r.status, 200);
  assert.equal(r.data.contacts[0].Name, 'Sample record');
  assert.equal(r.data.opportunities.length, 1);
  assert.equal(r.data.contacts[0].attributes, undefined);
  assert.equal(
    (await request(`/connectors/${connector.id}`, { cookie, method: 'DELETE' })).status,
    204,
  );
});
