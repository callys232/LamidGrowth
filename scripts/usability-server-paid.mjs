import { existsSync } from 'node:fs';
// Same safe pattern as server/index.mjs — a real .env dotenv parse, not shell sourcing (which
// mangles connection strings containing shell metacharacters like '&').
if (existsSync('.env')) process.loadEnvFile('.env');

import { createApp } from '../src/app/app.mjs';
import { mountFrontend } from '../src/app/frontend.mjs';

// Same as scripts/usability-server.mjs, except a stub AI provider stands in for a real OpenAI
// key so the paid specialist path can be exercised before a real key is added. The stub grounds
// its summary in the actual sources it was given, so "grounds in the real job/objective" style
// checks still mean something.
// A fixed schema name (not ':memory:') so the Playwright script can connect to it directly by
// name to top up a test account's points — ':memory:' creates a randomly-named schema per run
// that nothing outside this process could discover.
const { app, store } = await createApp({
  filename: 'paid_demo',
  paymentProvider: () => null,
  welcomeIpVelocityLimit: 10000,
  rateLimits: { api: { max: 10000 }, auth: { max: 10000 }, mutation: { max: 10000 }, spend: { max: 10000 } },
  aiProvider: {
    name: 'Simulated OpenAI',
    model: 'gpt-simulated',
    async review(context) {
      const source = (context.sources || [])[0];
      const grounding = source ? `${source.kind} "${source.data.title || source.id}"` : 'the provided context';
      return {
        review: {
          summary: `Based on ${grounding}, here is a grounded response to: "${context.question}"\n\nKey points:\n1. This reflects the actual workspace data supplied, not a generic answer.\n2. A real OpenAI key will replace this simulated summary with model-generated text once configured.`,
          assumptions: ['This is a simulated AI response for pre-launch testing.'],
          suggestions: [],
          evidenceIds: (context.sources || []).map((s) => s.id),
        },
      };
    },
  },
});
const port = Number(process.env.E2E_PORT || 3131);
const frontend = await mountFrontend(app, { hmrPort: port + 1 });
const server = app.listen(port, '127.0.0.1');
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close(async () => {
  await frontend.close();
  await store.dropSchema();
  process.exit(0);
}));
