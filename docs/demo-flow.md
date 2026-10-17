# Demo registration and account handoff

Visitors enter their name and email, and optionally request one reminder. Profile and workspace-size
choices stay inside the demo. Registration queues the welcome email and shows an inbox confirmation. It does not
create an account or grant access before email verification.

Only one demo registration is allowed per IP address. The server reserves a keyed hash of the
normalized client IP in the same transaction as registration and email queueing, so parallel
requests cannot create two registrations. The same registration may request another access email
within existing rate limits and resume its demo. A different email from the same IP is rejected.
The IP claim is retained after lead deletion so deletion does not reset this allowance. Raw IP
addresses are not saved in the claim table. Existing registrations made before this policy take
an IP claim when they next request an access email; historical addresses cannot be reconstructed.
On the VPS, `TRUST_PROXY_HOPS` must match the actual trusted reverse proxy setup so the app sees
the visitor's address rather than the proxy's address.

The welcome email contains a personal link valid for 30 days. Opening it shows a confirmation
button; pressing that button verifies email ownership and exchanges the link for a demo session.
The link can be reopened on another device to resume the same visitor's latest profile and progress.
It grants access only to sample demo data, never a paid account. Link and session secrets are stored
as hashes on the server. Link credentials use URL fragments and are removed from browser history.

Workspace changes are kept in the current tab and synchronized to encrypted server snapshots for
each visitor/profile/size combination. Revision checks reject stale writes from other tabs or devices.
The workspace shows save failures and offers retry or an explicit reload of the latest server copy.
Pending local changes survive a reload in the same tab. Closing the tab before a failed save is
retried can lose those unsynchronized changes. Standalone public engine previews are not saved as
workspace progress. The legacy classic demo URL now redirects to the saved workspace demo.

Creating an account prefills the verified demo name, email, and matching starting context.
Visitors can edit those details and choose a password. Account verification remains required.
After account verification, a matching demo registration is marked converted and its pending reminder
is cancelled. Sample workspace contents are not copied into the real workspace.

## Tools available in the demo

Demo engines use the selected tier's plan tools: Individual maps to Personal (Clarity and
Consistency); Team and Enterprise use their corresponding plan seats. Every included catalogue
engine can load its normal form and run the real calculator without charging account points.
The verified demo API checks tier access on both manifest and execution requests. Other tiers'
tools remain listed as locked. Calculator inputs are sent to the API to produce results.

## Editing emails

- `src/app/emails/demoWelcome.mjs`: welcome subject, message, demo link and account signup link.
- `src/app/emails/demoFollowup.mjs`: optional reminder subject, message and unsubscribe link.

Both messages are plain text. Variables are filled in when queued. Already queued messages keep
their original wording; template edits apply to newly queued messages.

## Delivery and reminders

The existing server mail worker drains separate encrypted account and demo mail queues. Failed
delivery is retried up to five attempts with increasing delays. Resend retries keep the same provider
idempotency key. SendGrid does not provide equivalent deduplication guarantees. A provider accepting
an email does not establish that it reached the inbox.

Only visitors who checked the reminder box and verified their demo email get a reminder, scheduled
two days after verification. No reminder is queued by default. Reminders can be stopped from the demo
or through the email's unsubscribe link. A final consent/conversion check runs before sending.
An email already handed to the provider cannot be recalled.

## Administration

Ecosystem administrators see a **Demo leads** link in the workspace header at
`/os/settings/demo-leads`. The server checks `ECOSYSTEM_ADMIN_EMAILS` for every administration request.
The dashboard shows registrations, verification, last activity, email queue status and conversion.
Activity includes workspace opening, page views, successful tool/mutation usage and signup clicks;
it does not record form text or the contents of user-entered goals as analytics events.

Administrators can inspect recent activity or delete a registration. Deletion also removes its
personal links, sessions, snapshots, queued emails and events. A deletion audit record remains.

## Configuration and rollout

The API requires `ACCOUNT_SECURITY_KEY`, `MAIL_FROM` and either `RESEND_API_KEY` or `SENDGRID_API_KEY`.
Set `DEMO_PUBLIC_ORIGIN` to the public frontend HTTPS origin. It falls back to the first entry in
`FRONTEND_ORIGINS`, then `PUBLIC_ORIGIN`. Do not regenerate the encryption key during deployment.

Deploy both frontend and API. API startup applies `server/demoSchema.mjs` to both fresh and existing
databases. The long-running mail worker in `server/index.mjs` must be running for queued emails
and scheduled reminders to be delivered.

Validate a live rollout by registering an address you control, opening its welcome link on two
devices, changing a sample objective, and checking that signup carries the same email. Confirm
the registration and delivery status in Demo leads. Only request a reminder when testing reminders.

## Automated checks

Demo learning now supports saved sample paths, modules, enrollment, completion, feedback and
sample certificates. The shared capability policy explains which features are interactive or
previews. See [release readiness](release-readiness.md) for the full release gate, diagnostics,
reference cases for every engine, performance changes and deployment checks.

- `npm run test:demo-access`: real Postgres integration tests against `TEST_DATABASE_URL` only.
  Includes email retries, token verification, encrypted progress, stale writes, administrator access,
  consent, deletion, account conversion and migration reapplication. Emails use a fake provider.
- `npm run test:demo-browser`: builds the site and checks the visitor journey in local Chromium
  against a fake API, including cross-device progress, failed-save retry and signup prefilling.

Neither automated check sends real mail or deploys the application.
