import fs from 'node:fs';
for (const file of fs.readdirSync('tests/browser').filter(f => f.endsWith('.spec.ts'))) {
  const path = `tests/browser/${file}`;
  let source = fs.readFileSync(path, 'utf8');
  if (!source.includes("name: 'Create your workspace'")) continue;
  source = "import { verifySignup } from './auth-helpers';\n" + source;
  source = source.replace(/(await page\.getByRole\('button', \{ name: 'Create your workspace'(?:, exact: true)? \}\)\.click\(\);)/g, '$1\n  await verifySignup(page);');
  fs.writeFileSync(path, source);
}
const path = 'src/app/agents.mjs';
let source = fs.readFileSync(path, 'utf8').replaceAll('\r\n', '\n');
const start = source.indexOf('      // The agent still answers');
const end = source.indexOf('      return response;', start);
let block = source.slice(start, end).replaceAll('response.humanHandoffRequested', 'built.humanHandoffRequested').replaceAll('response.handoffId', 'built.handoffId');
source = source.slice(0, start) + source.slice(end);
const target = '        const built = { runId, agentId, pointsCharged: points, balance, ...result };';
source = source.replace(target, target + '\n' + block);
fs.writeFileSync(path, source);
