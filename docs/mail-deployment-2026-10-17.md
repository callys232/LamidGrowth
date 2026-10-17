# Manual deployment and Resend activation

The frontend can run on Vercel. The Express API, PostgreSQL queues, mail worker and webhook receiver require the persistent VPS process. Deploy both from the same Git revision.

## Deploy

After the GitHub push, pull branch `lamidOne` on the VPS using your normal deployment workflow. Run `npm ci`, `npm run build`, then restart the PM2 service with refreshed environment variables. Normal API startup applies the additive demo and mail schemas. Keep `ACCOUNT_SECURITY_KEY` stable: it encrypts access payloads and hashes recipient suppression and IP identifiers.

Confirm the Vercel deployment uses that same revision. Configure these on the VPS, with your real origins:

```dotenv
PUBLIC_ORIGIN=https://api.example.com
FRONTEND_ORIGINS=https://app.example.com
DEMO_PUBLIC_ORIGIN=https://app.example.com
ACCOUNT_PUBLIC_ORIGIN=https://app.example.com
RESEND_API_KEY=your-existing-key
MAIL_FROM=Your Team <welcome@your-verified-domain.com>
RESEND_WEBHOOK_SECRET=whsec_value_from_resend
MAIL_REQUESTS_PER_SECOND=2
TRUST_PROXY_HOPS=1
```

Use the actual trusted proxy count. For a same-origin deployment, use that origin for both API and frontend. `MAIL_REQUESTS_PER_SECOND` is a shared send budget across clustered workers; choose a value within your Resend account limit and allow capacity for other applications using the same provider account.

## Activate delivery tracking

In the Resend dashboard, create a webhook pointing to `https://YOUR_API_HOST/api/webhooks/resend`. Subscribe to `email.sent`, `email.delivered`, `email.delivery_delayed`, `email.failed`, `email.bounced`, `email.complained` and `email.suppressed`. Copy its signing secret directly into the VPS environment and restart with refreshed environment variables. Never commit the secret.

The endpoint verifies signatures against the original request body, rejects stale signatures, deduplicates receipt IDs and matches provider IDs to hashed recipients. Events arriving before the send response are reconciled later. Complaints and permanent bounces prevent all later mail to that address; other bounces prevent optional follow-ups. A later delivery event cannot clear a complaint. See [Resend webhook verification](https://resend.com/docs/dashboard/webhooks/verify-webhooks-requests) and [event types](https://resend.com/docs/dashboard/webhooks/event-types).

Queue `sent` means the provider accepted the request; it does not prove inbox delivery. The provider outcome is shown separately. Retries pause before the provider's [24-hour idempotency window](https://resend.com/changelog/idempotency-keys) expires. Older retries without a recorded first attempt require manual review.

The API key must have permission to read sent messages for the administrator's provider-status check. A sending-only key can still send, but cannot perform that read. Webhook delivery tracking uses the separate signing secret.

## Verify and monitor

Run `npm run deployment:check`, then `npm run deployment:smoke` from the deployed environment. Run `node scripts/check-mail-health.mjs` after the worker starts. The health command opens a read-only database transaction, prints aggregate queue and heartbeat health, and exits nonzero for warnings. Connect that command to your existing monitoring or cron alerting; it does not send alerts itself. Missing tables mean the API migration has not been deployed. A new worker needs a successful tick before its heartbeat is healthy.

Ecosystem administrators can open **Settings → Demo leads** to inspect recent queue/provider outcomes. **Check provider status** reads Resend's existing record without sending mail. **Review result** records an audit note without confirming delivery or lifting suppression. **Fresh demo link** queues a new welcome message only to the registration's existing email, subject to suppression. An already in-flight email may still arrive.

Perform the final real-inbox check yourself with an email you control: register from an unused IP, receive the welcome message, reopen the demo link, save progress, and continue to account creation. Confirm the same name/email prefill and verified account conversion. The strict one-demo-per-IP rule remains in force. No real delivery or successful VPS deployment is claimed by local tests.

## Optional retention

Retention is disabled by default. To enable daily cleanup, explicitly choose both policies:

```dotenv
RETENTION_ENABLED=true
DEMO_RETENTION_DAYS=90
MAIL_RETENTION_DAYS=90
```

Each period must be 30–3650 whole days. Cleanup removes inactive demo registrations only after their access sessions and tokens expire, and removes old terminal queue records and unlinked provider receipts. It preserves IP claims and recipient suppression hashes. Review the chosen periods against your own data policy before enabling cleanup.

## Editable email content

Account access messages live in `src/app/emails/accountAccess.mjs`. Demo welcome and opt-in follow-up messages live in `src/app/emails/`. Edit those template files to change wording without changing queue or registration logic.
