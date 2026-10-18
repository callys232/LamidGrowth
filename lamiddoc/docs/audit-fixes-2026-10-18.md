# Product audit fixes — October 18, 2026

The confirmed defects from the interaction audit have code fixes and targeted regression coverage. These changes are local; deploying the API and frontend and verifying live providers remain separate steps.

| Finding                                                                | Change                                                                                                                                                                                                                                                                                               |
| ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Two simultaneous funding requests created two checkout sessions        | Funding creation locks the milestone row inside a transaction and checks for any active or uncertain funding before creating a claim. The claim remains present while the provider is responding. A concurrent request receives 409 and never calls the provider.                                    |
| Idle project page repeatedly fetched messages                          | Message and funding loaders use stable callbacks. Funding refreshes when project data changes, rather than on every render. Cancelled reads cannot overwrite newer funding state. Failed escrow reads show unavailable instead of pretending no funding exists.                                      |
| Selected tools disappeared at custom-bundle checkout                   | The browser sends tool IDs and extra points. The API validates and deduplicates IDs, calculates prices from the catalog, records an immutable custom bundle, and grants its tool entitlements only after a matching signed payment confirmation. Duplicate confirmations do not credit points again. |
| Custom bundle “Monthly” did not create a subscription                  | Custom bundles explicitly use one-time billing. Unsupported monthly bundle creation and purchase are refused. Legacy monthly bundles are omitted from the public purchase catalog until corrected. Actual subscription plans remain separate.                                                        |
| Refund webhook correlation rejected the documented reference field     | Refund events accept `transaction_reference`; pending and processing notifications are acknowledged. A processed refund must match the expected provider amount and currency before the entire funding is marked refunded. A mismatch requires reconciliation.                                       |
| Transfer reversal left the project marked paid                         | Reversal records the transfer as reversed, marks the milestone for payment review, and moves released funding into reconciliation. A delayed success notification cannot undo the reversal. No automatic second payout is attempted.                                                                 |
| Refund endpoint bypassed dispute agreement                             | A refund requires a recorded refund resolution accepted by the other party, as well as a disputed milestone and held funding. This enforces the existing mutual-agreement UI workflow.                                                                                                               |
| Invoice request charged points before approval                         | Authorization and milestone approval are checked before charging. An unapproved request returns 422 with zero points deducted.                                                                                                                                                                       |
| Demo job posting, estimation, scoping and team creation returned 501   | Dedicated sample handlers support those operations and saved results. Estimates use matching sample budgets and explicitly identify them as illustrative. Scoping supports suggestions, updates and publishing to a sample job. No real job, expert request or payment is dispatched.                |
| No demo contractor invoice path                                        | Saved demos gain a contractor project and an approved sample milestone without discarding existing sample work. Invoice generation produces a downloadable PDF clearly marked sample and not payable.                                                                                                |
| Rapid navigation falsely blocked later demo operations                 | When a save acknowledgement is lost, identical local and remote content is recognized as already saved. Different unsaved content with a stale revision remains blocked, preserving conflict protection.                                                                                             |
| Mobile search lacked an accessible name; contrast and landmarks failed | Search has an explicit label, flagged text colors are darker in light mode, support copy has a specific readable style, utility/demo controls have landmarks, engine headings follow hierarchy, and the homepage scroll region accepts keyboard focus.                                               |
| Separate Vercel frontend broke API download links and deep links       | PDF/export links use the configured API origin. `vercel.json` includes the SPA fallback. The deployment guide covers the persistent VPS backend, frontend origins, secure cookies and the real proxy chain.                                                                                          |
| Test-schema cleanup npm command pointed to a missing file              | The script now previews disposable schemas by default. Deleting one requires an exact validated schema name plus `--apply` and a dedicated test database.                                                                                                                                            |

## Verification

Completed checks include a production build; 98 Node tests with no failures or skips; 1,943 engine robustness checks across all 63 engines; and registration, email-link confirmation, restored demo progress, save retries and signup identity prefill browser checks. The first-signup guide test still passes.

All 27 profile/tier combinations passed team creation and reload, scoping start, estimator response, persisted job posting, contractor invoice PDF download and forced lost-save-acknowledgement recovery. The ten previously flagged public/workspace pages have no axe violations in the targeted mobile regression. The wider mobile inspection covered 110 routes without document-wide horizontal overflow.

Payment tests use actual handlers and a disposable PostgreSQL schema with fake providers. They prove a single provider initialization under overlapping requests, refusal of an unagreed refund, accepted-agreement dispatch, refund amount reconciliation, transfer reversal and replay handling, server-calculated custom pricing and payment-confirmed tool grants. They do **not** prove real money settlement.

The real-server invoice check confirmed HTTP 201 generation and an HTTP 200 PDF download containing a valid PDF header. A separate unapproved-invoice check confirmed HTTP 422 and zero points deducted. Funding and release browser controls reached their real API handlers with fake providers. The final isolated refund browser check loaded held funding and returned HTTP 201 with one fake-provider refund request; it uses a four-connection test pool and a bounded longer timeout because the remote test database was slow. This proves the interaction, not production throughput or real settlement.

Scoping suggestions, category selection, publishing, sample milestone funding, the displayed held status and messaging passed in all three tiers. Save-recovery tests also confirm that genuinely different unsaved content remains blocked. The final deep-demo regression passed 63 engine forms, 252 page checks and four lifecycle scenarios, with no uncaught errors or unexpected API calls. All 67 public-route browser checks passed. The final idle-project probe recorded one initial message read and zero additional reads in two seconds.

Reports are recorded in `test-results/full-ui/` with their actual outcomes; a completed exploratory script is not automatically a passed case. Early diagnostic failures included a test-listener variable error and fixture issues, which were corrected before the passing runs. Disposable schemas left by interrupted runs were verified against their synthetic fixtures and removed; unrelated test schemas were left alone.

Useful commands:

```sh
npm run build
npm test
node tests/deep-engine-audit.mjs
node tests/audit-fixes-browser.mjs
node tests/scoping-commerce-browser.mjs
node tests/demo-save-recovery-browser.mjs
node tests/project-message-loop-audit.mjs
node tests/accessibility-regression.mjs
node tests/server-commerce-audit.mjs
node tests/server-commerce-audit.mjs --invoice-prereq-only
```

The release-check script now includes the new browser regressions. Its database checks require a separate `TEST_DATABASE_URL`. Original exploratory control inventories contain disabled controls, blocked external boundaries and state-dependent failures; some late inventory visits overlapped local rebuilds. They are discovery evidence, not a claim that every page/state passed on the final build. Targeted post-fix reports are the verification evidence for these changes.

## Deployment checks still required

Follow [Vercel frontend and VPS API](vercel-vps-deployment.md). No reachable staging deployment was supplied. Actual Resend inbox delivery, real Paystack checkout/settlement and provider-originated webhooks, production cookies, cross-host downloads and real visitor IP handling must be verified after manual deployment. Local signed webhook fixtures exercise the handlers without contacting Paystack. Live AI remains disabled in sample workspaces.

Existing uncertain payments should be reconciled against provider records before retrying; this change does not rewrite historical transactions or automatically move money. Existing monthly-labelled bundles must have their terms corrected before they can be sold again.

Refund event fields were checked against [Paystack refunds](https://paystack.com/docs/payments/refunds/), and transfer reversal handling against [Paystack single transfers](https://paystack.com/docs/transfers/single-transfers/).
