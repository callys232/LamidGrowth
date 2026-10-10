import { createHash } from 'node:crypto';

const fail = (message, status = 502) => {
  throw Object.assign(new Error(message), { status });
};
export function salesforceOrigin(value) {
  const url = new URL(value);
  if (
    url.protocol !== 'https:' ||
    url.port ||
    url.username ||
    url.password ||
    url.pathname !== '/' ||
    url.search ||
    url.hash ||
    !url.hostname.endsWith('.salesforce.com')
  )
    fail('Invalid Salesforce instance URL.', 502);
  return url.origin;
}

export function createConnectorProviders({ env = process.env, fetchImpl = fetch } = {}) {
  const origin = env.PUBLIC_ORIGIN;
  const callbackOrigin = env.CONNECTOR_CALLBACK_ORIGIN || origin;
  const keyReady = /^[a-f0-9]{64}$/i.test(env.ACCOUNT_SECURITY_KEY || '');
  const validOrigin = (value) => {
    try {
      const url = new URL(value);
      return (
        !url.username &&
        !url.password &&
        url.pathname === '/' &&
        !url.search &&
        !url.hash &&
        (url.protocol === 'https:' ||
          (url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname)))
      );
    } catch {
      return false;
    }
  };
  const configured = (name) =>
    Boolean(
      keyReady &&
      validOrigin(origin) &&
      validOrigin(callbackOrigin) &&
      env[`${name.toUpperCase()}_CLIENT_ID`] &&
      env[`${name.toUpperCase()}_CLIENT_SECRET`],
    );
  const request = async (url, options) => {
    const response = await fetchImpl(url, {
      ...options,
      redirect: 'error',
      signal: AbortSignal.timeout(15000),
    });
    let data;
    try {
      data = await response.json();
    } catch {
      fail('The provider returned an invalid response.');
    }
    if (!response.ok || data.ok === false || data.error)
      fail('The provider request failed. Reconnect or check access permissions.');
    return data;
  };
  const tokenRequest = (name, values) =>
    request(
      name === 'slack'
        ? 'https://slack.com/api/oauth.v2.access'
        : `${sfLogin}/services/oauth2/token`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: env[`${name.toUpperCase()}_CLIENT_ID`],
          client_secret: env[`${name.toUpperCase()}_CLIENT_SECRET`],
          ...values,
        }),
      },
    );
  const sfLogin =
    env.SALESFORCE_SANDBOX === 'true'
      ? 'https://test.salesforce.com'
      : 'https://login.salesforce.com';
  const providers = {
    slack: {
      name: 'Slack',
      scopes: ['channels:read'],
      description: 'Read the names and details of public Slack channels.',
      authorize(state) {
        const url = new URL('https://slack.com/oauth/v2/authorize');
        url.search = new URLSearchParams({
          client_id: env.SLACK_CLIENT_ID,
          scope: 'channels:read',
          redirect_uri: this.callback,
          state,
        }).toString();
        return url.href;
      },
      async exchange(code) {
        const data = await tokenRequest('slack', { code, redirect_uri: this.callback });
        return {
          accessToken: data.access_token,
          refreshToken: data.refresh_token,
          expiresAt: data.expires_in ? Date.now() + data.expires_in * 1000 : null,
          account: data.team?.name || 'Slack workspace',
          scopes: (data.scope || '').split(',').filter(Boolean),
        };
      },
      async refresh(token) {
        const data = await tokenRequest('slack', {
          grant_type: 'refresh_token',
          refresh_token: token.refreshToken,
        });
        return {
          ...token,
          accessToken: data.access_token,
          refreshToken: data.refresh_token || token.refreshToken,
          expiresAt: data.expires_in ? Date.now() + data.expires_in * 1000 : null,
        };
      },
      async read(token) {
        const data = await request(
          'https://slack.com/api/conversations.list?types=public_channel&exclude_archived=true&limit=100',
          { headers: { Authorization: `Bearer ${token.accessToken}` } },
        );
        return {
          channels: (data.channels || []).map((c) => ({
            id: c.id,
            name: c.name,
            members: c.num_members,
          })),
          hasMore: Boolean(data.response_metadata?.next_cursor),
        };
      },
      async revoke(token) {
        await request('https://slack.com/api/auth.revoke', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token.accessToken}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({ token: token.accessToken }),
        });
      },
    },
    salesforce: {
      name: 'Salesforce',
      scopes: ['api', 'refresh_token'],
      description:
        'Read a snapshot of contacts and opportunities from your Salesforce organization.',
      authorize(state, verifier) {
        const url = new URL(`${sfLogin}/services/oauth2/authorize`);
        url.search = new URLSearchParams({
          client_id: env.SALESFORCE_CLIENT_ID,
          response_type: 'code',
          scope: 'api refresh_token',
          redirect_uri: this.callback,
          state,
          code_challenge: createHash('sha256').update(verifier).digest('base64url'),
          code_challenge_method: 'S256',
        }).toString();
        return url.href;
      },
      async exchange(code, verifier) {
        const data = await tokenRequest('salesforce', {
          grant_type: 'authorization_code',
          code,
          redirect_uri: this.callback,
          code_verifier: verifier,
        });
        return {
          accessToken: data.access_token,
          refreshToken: data.refresh_token,
          instance: salesforceOrigin(data.instance_url),
          account: 'Salesforce organization',
          scopes: (data.scope || '').split(' ').filter(Boolean),
        };
      },
      async refresh(token) {
        const data = await tokenRequest('salesforce', {
          grant_type: 'refresh_token',
          refresh_token: token.refreshToken,
        });
        return {
          ...token,
          accessToken: data.access_token,
          refreshToken: data.refresh_token || token.refreshToken,
          instance: salesforceOrigin(data.instance_url || token.instance),
        };
      },
      async read(token) {
        const instance = salesforceOrigin(token.instance);
        const versions = await request(`${instance}/services/data/`, {
          headers: { Authorization: `Bearer ${token.accessToken}` },
        });
        const version = versions.at(-1)?.version;
        if (!/^\d+\.\d+$/.test(version || '')) fail('Salesforce API version was not available.');
        const query = async (q) =>
          request(`${instance}/services/data/v${version}/query?q=${encodeURIComponent(q)}`, {
            headers: { Authorization: `Bearer ${token.accessToken}` },
          });
        const contacts = await query('SELECT Id, Name, Email FROM Contact LIMIT 100');
        const opportunities = await query(
          'SELECT Id, Name, StageName, Amount, CloseDate FROM Opportunity LIMIT 100',
        );
        return {
          contacts: (contacts.records || []).map(({ attributes, ...record }) => record),
          opportunities: (opportunities.records || []).map(({ attributes, ...record }) => record),
          hasMore: contacts.totalSize > 100 || opportunities.totalSize > 100,
        };
      },
      async revoke(token) {
        const response = await fetchImpl(`${sfLogin}/services/oauth2/revoke`, {
          method: 'POST',
          redirect: 'error',
          signal: AbortSignal.timeout(15000),
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({ token: token.refreshToken || token.accessToken }),
        });
        if (!response.ok) fail('Salesforce could not revoke access. Try again.');
      },
    },
  };
  for (const [id, provider] of Object.entries(providers)) {
    provider.configured = configured(id);
    provider.callback = validOrigin(callbackOrigin)
      ? `${new URL(callbackOrigin).origin}/api/connectors/oauth/${id}/callback`
      : '';
  }
  return { providers, key: keyReady ? Buffer.from(env.ACCOUNT_SECURITY_KEY, 'hex') : null, origin };
}
