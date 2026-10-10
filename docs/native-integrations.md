# Slack and Salesforce connections

Both connections use provider account authorization. Workspace owners and managers can connect, import a read-only snapshot, view it, and disconnect. No scheduled sync or external record writes are enabled.

## Server configuration

Set `PUBLIC_ORIGIN` to the frontend origin. For a separate API host, set `CONNECTOR_CALLBACK_ORIGIN` to its HTTPS origin. Register these exact callback URLs with each provider:

- `{CONNECTOR_CALLBACK_ORIGIN or PUBLIC_ORIGIN}/api/connectors/oauth/slack/callback`
- `{CONNECTOR_CALLBACK_ORIGIN or PUBLIC_ORIGIN}/api/connectors/oauth/salesforce/callback`

Set `ACCOUNT_SECURITY_KEY` to the existing 64-character hexadecimal encryption key. OAuth tokens and temporary PKCE verifiers are encrypted with AES-256-GCM. Keep the key stable across restarts.

Slack requires `SLACK_CLIENT_ID` and `SLACK_CLIENT_SECRET` from a Slack app with bot scope `channels:read`. The app reads public-channel names, IDs, and membership counts; it does not read messages or post notifications. Token rotation is supported when the provider issues refresh tokens.

Salesforce requires `SALESFORCE_CLIENT_ID` and `SALESFORCE_CLIENT_SECRET` from an OAuth external client app or connected app, with the web-server flow, PKCE, `api`, and `refresh_token` access enabled. Set `SALESFORCE_SANDBOX=true` to authorize against a sandbox. The authorizing user needs API access and permission to read Contact and Opportunity.

Configuration values are server-only. Do not put secrets in frontend environment variables. Provider buttons stay disabled when setup is incomplete. Live provider connections require administrator registration and credentials; adapter tests use mock provider responses.

## Imports and disconnect

Click Import snapshot in `/os/integrations`. Each import reads up to 100 public Slack channels, or up to 100 Salesforce contacts and 100 opportunities. The snapshot is visible to workspace managers. Imports store snapshots separately from business records; they do not populate the CRM automatically. An event records collection counts, with no contact details copied into the event payload.

Delete disconnects the service by revoking provider access, then deleting local credentials, snapshot, and recorded grants. Revocation failures leave the connection in place so the user can retry.

OAuth requests expire after ten minutes, are single-use, and are bound to the initiating user, workspace, and provider. Token refresh and disconnect serialize on the credentials row.

References: [Slack OAuth](https://docs.slack.dev/reference/methods/oauth.v2.access/), [Slack channel listing](https://docs.slack.dev/reference/methods/conversations.list/), [Salesforce authorization](https://developer.salesforce.com/docs/platform/api-rest/guide/intro-oauth-and-connected-apps.html), [Salesforce queries](https://developer.salesforce.com/docs/platform/api-rest/guide/resources-query.html).
