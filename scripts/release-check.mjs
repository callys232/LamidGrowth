import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';

if (existsSync('.env')) process.loadEnvFile('.env');

// Release checks must not silently skip database integration tests.
if (!process.env.TEST_DATABASE_URL || process.env.TEST_DATABASE_URL === process.env.DATABASE_URL) {
  console.error('Release checks require a dedicated TEST_DATABASE_URL distinct from DATABASE_URL.');
  process.exit(1);
}
const steps = [
  ['npm', ['run', 'build']],
  ['node', ['tests/deep-engine-audit.mjs']],
  ['node', ['--test', '--test-concurrency=2', 'tests/*.test.mjs']],
  ['node', ['tests/demo-browser.mjs']],
  ['node', ['tests/deep-demo-browser.mjs']],
  ['node', ['tests/public-browser.mjs']],
  ['node', ['tests/audit-fixes-browser.mjs']],
  ['node', ['tests/scoping-commerce-browser.mjs']],
  ['node', ['tests/demo-save-recovery-browser.mjs']],
  ['node', ['tests/project-message-loop-audit.mjs']],
  ['node', ['tests/accessibility-regression.mjs']],
];
for (const [command, args] of steps) {
  const result = spawnSync(
    command === 'npm' && process.platform === 'win32' ? 'npm.cmd' : command,
    args,
    { stdio: 'inherit', shell: command === 'npm' && process.platform === 'win32' },
  );
  if (result.error || result.status !== 0) {
    console.error(`Release check failed: ${command} ${args.join(' ')}`);
    process.exit(result.status || 1);
  }
}
console.log(
  'Release checks passed. Production routing and inbox delivery still require deployment verification.',
);
