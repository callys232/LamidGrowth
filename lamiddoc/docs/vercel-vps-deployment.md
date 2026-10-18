# Vercel frontend and VPS API

The repository includes Vercel SPA routing in `vercel.json`. Vercel builds the static frontend; the Express API, PostgreSQL connections, mail queue and scheduled workers stay on the VPS. The same application can also serve the frontend from the VPS.

Set `VITE_API_BASE_URL` in Vercel to your actual HTTPS API origin, without `/api` or a trailing slash, and rebuild. This value is public. Never put database, Resend, Paystack or account encryption secrets in a `VITE_` variable. JSON requests and document/export links use this API origin.

On the VPS set `FRONTEND_ORIGINS` to the exact frontend origins, `ACCOUNT_PUBLIC_ORIGIN` and `DEMO_PUBLIC_ORIGIN` to the frontend origin, and `PUBLIC_ORIGIN` to the API origin. Keep `ACCOUNT_SECURITY_KEY` stable across releases. Configure Resend, Paystack and webhook secrets on the VPS. Use Paystack test credentials for deployment verification first. Set `TRUST_PROXY_HOPS` to the actual trusted proxy chain; the supplied nginx setup uses one proxy. Incorrect proxy trust changes which IP the single-use demo rule sees.

Use HTTPS on both hosts. The API already issues secure production cookies and allows credentialed requests only from configured origins. Prefer frontend and API custom domains under the same parent domain. A `vercel.app` frontend paired with an unrelated API domain may encounter browser third-party-cookie restrictions; verify sign-in in the browsers you support before launch.

After manually deploying both hosts, run `npm run deployment:check` on the VPS and `npm run deployment:smoke` with `DEPLOY_API_ORIGIN` and `DEPLOY_FRONTEND_ORIGIN` set to the real origins. Check direct navigation to `/guides`, `/verify` and `/os/commercial/projects`, verification and returning demo links, sign-in persistence, an invoice PDF download, and receipt of an actual Resend email. Complete Paystack test checkout, signed success/reversal/refund webhooks and reconciliation before enabling real payments.

No deployment or live settlement is certified by local tests. Vercel's SPA fallback is documented at https://vercel.com/docs/frameworks/frontend/vite. Provider refund fields are documented at https://paystack.com/docs/payments/refunds/.

`npm run prune-test-schemas` lists disposable schemas in the dedicated test database without deleting anything. Removing one requires both `--apply` and its exact `--schema=test_...` name. It never targets `public` or the production database URL.
