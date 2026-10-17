# Email readiness audit — 16 October 2026

**17 October follow-up:** Delivery events, suppression, shared send throttling, retry-window protection, worker health, administrator recovery and opt-in retention are now implemented locally. The findings below describe the earlier audit state. Follow [Manual deployment and Resend activation](mail-deployment-2026-10-17.md) for remaining VPS/dashboard setup and real-inbox verification.

Resend itself is configured and can send. The main gaps are deployment of the demo backend, delivery/bounce integration, and a real end-to-end inbox test.

## Read-only findings

These checks used this workspace's environment and the configured Resend account/database. They did not establish what environment variables the VPS process currently uses. No email was sent, provider setting changed, migration applied to the configured database, or customer record modified.

| Check                             | Observed result                                                                                                                                                                                                                                                                                                                        |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Resend API credentials and sender | Configured; sender domain verified; sending capability enabled.                                                                                                                                                                                                                                                                        |
| SPF/DKIM                          | Provider reports verified records.                                                                                                                                                                                                                                                                                                     |
| DMARC                             | Native DNS timed out; independent HTTPS DNS lookup returned one sender-domain record with `p=reject`. Authentication does not guarantee inbox placement.                                                                                                                                                                               |
| Click/open tracking               | Both disabled on the sender domain.                                                                                                                                                                                                                                                                                                    |
| Resend webhooks                   | No enabled webhooks; no delivered, bounced or complained event subscription.                                                                                                                                                                                                                                                           |
| Webhook signing secret            | `RESEND_WEBHOOK_SECRET` absent in this environment. The app also has no dedicated Resend event receiver.                                                                                                                                                                                                                               |
| Recent provider email metadata    | Ten messages: five last marked delivered, five bounced. One bounced message used a recognized reserved/test recipient; four remain unclassified. This is a small account-level sample, not a measured customer bounce rate or proof that all messages originated in this app. No recipient addresses, subjects or bodies were printed. |
| Configured database account mail  | Eleven rows marked `sent`, one `failed`; none pending or holding an expired sending lease at inspection. `sent` means provider acceptance, not inbox delivery.                                                                                                                                                                         |
| Configured database demo mail     | `public.demo_mail_outbox` absent. The demo migration has not been applied to this database. This does not prove the table is absent from a different database used by the VPS.                                                                                                                                                         |
| Origin settings                   | `PUBLIC_ORIGIN` is `https://lamidconsulting.com`; no account/frontend origin was set in this workspace. Valid for same-origin hosting; incomplete evidence for the documented Vercel/API split.                                                                                                                                        |
| Live application reachability     | Previous configured `/api/health` check timed out. VPS deployment, worker health, production CORS and real mail links remain unverified.                                                                                                                                                                                               |

Provider events distinguish sending acceptance from delivery outcomes. Delivered/bounced/complained events are available for integration; receiving-server acceptance still does not prove inbox placement. [Resend event visibility](https://resend.com/changelog/webhook-event-visibility)

## Reproduced bugs fixed locally

1. **Final-attempt worker crash:** after a fifth claim, a worker crash left the row in `sending`, excluded from subsequent claims. A real isolated-Postgres test reproduced this before the fix. Exhausted leases now become `delivery_unknown`, with payload cleared and an operational log entry. The application cannot know whether the provider accepted that final attempt.
2. **Stale worker overwrites:** a late success or failure could overwrite cancellation or a newer worker's state. Success, failure and worker cancellation updates now require the matching status, attempt count and lease. Tests simulate both cancellation during send and a late failure after another send result.
3. **Retry policy:** permanent provider rejections previously consumed all five attempts, and throttling ignored `Retry-After`. Permanent HTTP rejections now stop immediately; throttling, server failures and concurrent idempotent requests remain retryable, with provider delay honored. HTTP status is retained without copying provider error text that may contain recipient data.
4. **Account links in split hosting:** verification and password-reset links previously used the API origin. They now use `ACCOUNT_PUBLIC_ORIGIN`, then the first `FRONTEND_ORIGINS` value, then the same-origin fallback. Integration tests verify both links target the configured frontend.
5. **In-flight cancellation bookkeeping:** unsubscribe, account conversion and superseding account challenges now cancel both pending and claimed messages. Conditional worker updates preserve cancellation. A request already accepted by Resend cannot be recalled by changing local queue state.
6. **Acceptance visibility:** the adapter returns provider message IDs, which are logged alongside the queue ID. Demo administration labels `sent` as provider acceptance with delivery unconfirmed, and labels exhausted crash outcomes explicitly. IDs are not yet persisted in the queue for delivery-event reconciliation.
7. **Editable account copy:** verification and recovery copy moved to `src/app/emails/accountAccess.mjs`, alongside the separate demo welcome/reminder templates. New queued messages use new copy; retries retain their original payload and idempotency key.

## Still missing, in priority order

1. **Deploy and verify the backend against the correct database.** Apply the existing demo migration through normal application startup, confirm the persistent mail worker runs, and resolve live health/readiness failures. No production migration was run during this audit.
2. **Delivery-event integration.** Build a raw-body, signature-verified Resend webhook receiver; deduplicate events; persist provider IDs and delivery outcomes; handle event ordering; and expose delivery/bounce/complaint status to administrators. Configure the receiver and signing secret in Resend and the VPS after the implementation is tested. [Resend webhook setup](https://github.com/resend/resend-skills/blob/main/skills/agent-email-inbox/references/webhook-setup.md)
3. **Bounce and complaint suppression.** Prevent optional follow-ups to suppressed recipients, reconcile provider suppression state, and investigate the four unclassified bounces. The app currently cannot react to those provider events.
4. **A genuine inbox journey.** Use a real visitor-provided address to check welcome receipt, spam placement, confirmation, resume on another device, signup prefilling, account verification and recovery. The audit's provider sends are mocked. Previously stored delivery records do not prove this new demo journey works.
5. **Queue recovery and monitoring.** Add persistent provider-ID correlation, oldest-due/lease alerts, explicit operator recovery for terminal/unknown messages, and a worker heartbeat. Provider-wide throttling across clustered workers and remaining sender quota also need operational verification.
6. **Long-outage duplicate protection.** The queue reuses stable idempotency keys, but Resend retains them for 24 hours. A worker outage beyond that window can make an ambiguous retry duplicate an accepted message, particularly for long-lived reminder rows. Persist a first-attempt boundary and require explicit reconciliation after the safety window instead of claiming exactly-once delivery. [Resend idempotency keys](https://resend.com/changelog/idempotency-keys)
7. **Retention automation.** Expired access/session tokens, old demo leads/progress/events, and terminal queue metadata have no scheduled retention cleanup. Manual lead deletion exists. Define retention periods before implementing a cleanup job; the strict IP-claim rule must remain intact.

Branded HTML and a confirmed support/reply inbox would improve presentation and support, but plain-text mail already works. They are separate from the deployment and delivery-reliability blockers above.

## Reproduce safely

Validation completed: production build, four provider/template tests, one real-Postgres queue-race/retry test, account-conversion/frontend-link integration, two demo-access/template tests, four production-configuration tests, and the confirmation/progress/signup browser journey passed. No tests were skipped in these runs. One demo-access run failed to connect to the test database; a subsequent full rerun passed. The wider engine/public-page audits were not repeated for these mail-only changes.

```sh
node scripts/check-resend.mjs
node scripts/audit-mail.mjs
node scripts/audit-mail.mjs --database
node tests/mail-provider.test.mjs
node tests/mail-reliability.test.mjs
node tests/demo-conversion.test.mjs
node tests/demo-access.test.mjs
```

The database audit uses an explicit read-only transaction and returns aggregate public-schema queue counts only. It does not initialize the schema. Automated database tests require a dedicated `TEST_DATABASE_URL` and use isolated schemas; they must never run against production. Credentials and email content are omitted from audit output.
