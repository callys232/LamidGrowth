import fs from 'node:fs';
// Domain tests exercise spending from an existing funded account, not signup rewards.
for (const file of fs
  .readdirSync('tests')
  .filter(
    (n) => n.endsWith('.test.mjs') && !['launch-hardening.test.mjs', 'ai.test.mjs'].includes(n),
  )) {
  const path = `tests/${file}`;
  let source = fs.readFileSync(path, 'utf8');
  if (!source.includes("'/auth/signup'") && !source.includes('/api/auth/signup')) continue;
  source = source.replace(
    "import { createApp } from '../src/app/app.mjs';",
    "import { createFundedTestApp as createApp } from './support/funded-app.mjs';",
  );
  fs.writeFileSync(path, source);
}
