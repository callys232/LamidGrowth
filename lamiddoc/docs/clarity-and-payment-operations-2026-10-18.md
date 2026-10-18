# Workspace clarity and payment operations

The chosen starting outcome is to diagnose a bottleneck and create an action plan. Homepage content and layout were left unchanged. The starting journey is implemented inside the workspace, signup guide and user guide.

## Six improvements

1. The dashboard introduces one objective, relevant evidence, then an action and review. Existing tools remain available; an assessment is optional.
2. Its next-action button uses saved objectives and action statuses to open objective/action creation or the appropriate work/review page. Clicking a button never marks work complete.
3. Assessment results distinguish successful calculation from verified evidence, explain limitations and show the submitted input snapshot. Users choose the resulting action themselves. Calculation algorithms were not changed.
4. Shared pricing guidance explains plan access, usage points, one-time bundles and separate project funding. Buying points does not unlock an excluded tool. Checkout remains authoritative for price and currency.
5. Finance now includes owner-reported payment cases and an operator investigation queue. Operators can take responsibility, leave customer-visible notes and inspect provider status. Reconciliation requires matching reference, full amount, currency and a supported final state. These operations do not initiate payments or send email.
6. Provider/settlement routes, webhook processing, payment integrity helpers and payment investigation responsibilities now have separate modules. This is a focused separation, not a complete rewrite of finance.

## Payment boundaries and deployment

Workspace owners can see/report their own cases; other workspaces cannot access them. Only configured ecosystem administrators can update investigations or reconcile. Updates use version checks and transactions. Uncertain payments cannot be manually marked resolved. Ambiguous evidence leaves financial state unchanged.

Failed/reversed payouts remain blocked until provider support confirms the disposition of funds. The console does not automatically retry payouts or assume money was returned. This workflow covers milestone funding and payouts; it is not a points-purchase reconciliation system. Pending can be normal processing, rather than a failure.

Payout references are persisted before contacting the provider, preserving a correlation key after an uncertain network response. An additive payment-review schema runs with existing startup migrations under the database advisory lock, including on existing installations. Deploy both API and frontend. A Vercel frontend still needs the separately configured API.

Inspection follows the official Paystack [transaction verification](https://paystack.com/docs/api/transaction/#verify), [transfer verification](https://paystack.com/docs/api/transfer/#verify) and [refund fetch](https://paystack.com/docs/api/refund/#fetch) APIs. Refund inspection correlates the provider transaction to the original payment reference. No raw provider customer/bank response is retained in the review record.

## Verification and remaining evidence

The full Node suite passed 100 tests, including tenant/operator authorization, stale updates, mismatched evidence, funding reconciliation, payouts and refunds. Production frontend build passed. Browser coverage exercises saved-state guidance, action creation, submitted assessment inputs, pricing/mobile layout and the payment support/operator controls. Browser payment responses are fixtures; integration tests use an isolated database and fake provider adapters.

No real money was moved, no live email was sent and no deployment was performed. Production routing, provider credentials/webhooks, live delivery and operational staffing still require deployment checks. A real customer pilot is still needed to establish whether the journey improves decisions and sustained follow-through; automated checks cannot establish product value.
