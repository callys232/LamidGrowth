import express from 'express';
import { randomUUID } from 'node:crypto';
import { createApp } from '../../src/app/app.mjs';

/** Commercial/domain fixtures start with a funded wallet independently of signup incentives.
 * Real onboarding/reward eligibility is tested without this helper in launch-hardening.test.mjs.
 * This helper is never imported by the application or the browser test server.
 */
export async function createFundedTestApp(options = {}) {
  const instance = await createApp({ securityKey: 'ac'.repeat(32), publicOrigin: 'https://test.example', mailProvider: null, ...options });
  const app = express();
  app.use((req, res, next) => {
    const json = res.json.bind(res);
    // Not awaited by the route handler that calls it (res.json(result) is fire-and-forget from
    // its point of view) — but the actual response bytes are only written once this async
    // function's own control flow reaches `json(body)`, so the funding write still always
    // completes before the client sees the 201. The explicit .catch prevents an unhandled
        // rejection if the funding write itself ever fails.
    res.json = (body) => {
      const send = async () => {
        if (req.path === '/api/auth/signup' && res.statusCode === 201) {
          const user = await instance.store.db.prepare('SELECT id FROM users WHERE email = ?').get(req.body.email.trim().toLowerCase());
          await instance.store.transaction(async () => {
            await instance.store.db.prepare('UPDATE users SET points_balance = 100000 WHERE id = ?').run(user.id);
            await instance.store.db.prepare("INSERT INTO points_ledger VALUES (?, ?, NULL, 100000, 'test_fixture_funding', NULL, ?)").run(randomUUID(), user.id, Date.now());
            await instance.store.db.prepare("INSERT INTO welcome_claims VALUES (?, ?, NULL, NULL, 'legacy', 'Explicitly funded domain-test fixture', ?)").run(user.id, `test:${user.id}`, Date.now());
          });
        }
        return json(body);
      };
      return send().catch((error) => {
        console.error('Test fixture funding failed:', error);
        return json(body);
      });
    };
    next();
  });
  app.use(instance.app);
  return { ...instance, app };
}
