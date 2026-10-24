import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';

if (existsSync('.env')) process.loadEnvFile('.env');

// Release checks must not silently skip database integration tests.
if (!process.env.TEST_DATABASE_URL || process.env.TEST_DATABASE_URL === process.env.DATABASE_URL) {
  console.error('Release checks require a dedicated TEST_DATABASE_URL distinct from DATABASE_URL.');
  process.exit(1);
}
const steps = [
  ['build', 'npm', ['run', 'build']],
  ['engine audit', 'node', ['tests/deep-engine-audit.mjs']],
  ['API and integration tests', 'node', ['--test', '--test-concurrency=2', 'tests/*.test.mjs']],
  ['demo browser tests', 'node', ['tests/demo-browser.mjs']],
  ['deep demo browser tests', 'node', ['tests/deep-demo-browser.mjs']],
  ['public browser tests', 'node', ['tests/public-browser.mjs']],
  ['audit regression tests', 'node', ['tests/audit-fixes-browser.mjs']],
  ['scoping and commerce tests', 'node', ['tests/scoping-commerce-browser.mjs']],
  ['demo recovery tests', 'node', ['tests/demo-save-recovery-browser.mjs']],
  ['project message audit', 'node', ['tests/project-message-loop-audit.mjs']],
  ['accessibility regression tests', 'node', ['tests/accessibility-regression.mjs']],
  ['clarity browser tests', 'node', ['tests/clarity-browser.mjs']],
  ['payment support tests', 'node', ['tests/payment-support-browser.mjs']],
];
for (const [name, command, args] of steps) {
  const startedAt = Date.now();
  console.log(`\n[release-check] START ${name}`);
  const result = spawnSync(
    command === 'npm' && process.platform === 'win32' ? 'npm.cmd' : command,
    args,
    { stdio: 'inherit', shell: command === 'npm' && process.platform === 'win32' },
  );
  if (result.error || result.status !== 0) {
    console.error(
      `[release-check] FAIL ${name} after ${((Date.now() - startedAt) / 1000).toFixed(1)}s: ${command} ${args.join(' ')}`,
    );
    process.exit(result.status || 1);
  }
  console.log(`[release-check] PASS ${name} in ${((Date.now() - startedAt) / 1000).toFixed(1)}s`);
}
console.log(
  'Release checks passed. Production routing and inbox delivery still require deployment verification.',
);
