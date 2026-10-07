import fs from 'node:fs';
import { spawn } from 'node:child_process';

if (fs.existsSync('.env')) process.loadEnvFile('.env');
const testUrl = process.env.TEST_DATABASE_URL;
const productionUrl = process.env.DATABASE_URL;
if (!testUrl) throw new Error('No isolated TEST_DATABASE_URL configured; integration checks were not started.');
const test = new URL(testUrl);
const live = productionUrl ? new URL(productionUrl) : null;
if (live && test.hostname === live.hostname && test.port === live.port && test.pathname === live.pathname) {
  throw new Error('Test and runtime database targets match; integration checks were not started.');
}
const env = { ...process.env };
for (const key of ['OPENAI_API_KEY','ANTHROPIC_API_KEY','GEMINI_API_KEY','PAYSTACK_SECRET_KEY','RESEND_API_KEY','SENDGRID_API_KEY','KYC_WEBHOOK_SECRET']) env[key] = '';
console.log('Test target differs from runtime database; live AI, payment, mail and KYC provider credentials disabled for this test process.');
const files = [
  'tests/api.test.mjs', 'tests/user-acceptance.test.mjs', 'tests/payments.test.mjs',
  'tests/launch-hardening.test.mjs', 'tests/workflows.test.mjs', 'tests/projects.test.mjs',
  'tests/files-security.test.mjs', 'tests/au03-entitlement-separation.test.mjs',
];
const log = fs.openSync('audit-results/release-readiness-2026-10-06/integration-tests.log', 'w');
const child = spawn(process.execPath, ['--test', '--test-concurrency=1', ...files], { env, stdio: ['ignore', log, log], windowsHide: true });
child.on('error', error => { console.error(error.message); process.exitCode = 1; });
child.on('exit', code => {
  fs.closeSync(log);
  console.log(fs.readFileSync('audit-results/release-readiness-2026-10-06/integration-tests.log','utf8').split(/\r?\n/).slice(-18).join('\n'));
  process.exitCode = code ?? 1;
});
