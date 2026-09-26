import { readFileSync, writeFileSync } from 'node:fs';
const raw = readFileSync('audit-results/backend.log');
const log = raw.toString(raw[0] === 255 ? 'utf16le' : 'utf8');
const failures = [...log.matchAll(/^not ok (\d+) - (.*)\r?\n([\s\S]*?)^  \.\.\./gm)].map((m) => ({
  number: Number(m[1]),
  name: m[2].trim(),
  location: m[3].match(/location: (.*)/)?.[1].trim(),
  details: m[3]
    .split(/\r?\n/)
    .filter((l) => !l.includes('duration_ms:'))
    .join('\n'),
}));
writeFileSync('audit-results/backend-failures.json', JSON.stringify(failures, null, 2));
const inventory = [
  '# Executed test inventory',
  '',
  'Original full-run results; targeted reruns are recorded separately in REPORT.md.',
  '',
  '## Backend',
  '',
];
for (const m of log.matchAll(/^(ok|not ok) (\d+) - (.*)$/gm)) {
  inventory.push(`- ${m[1] === 'ok' ? 'PASS' : 'FAIL'} ${m[2]}: ${m[3].trim()}`);
}
for (const suite of [
  'browser',
  'usability',
  'paid-path',
  'deep-coverage',
  'human-pace',
  'click-everything',
]) {
  const data = readFileSync(`audit-results/${suite}.log`);
  const content = data.toString(data[0] === 255 ? 'utf16le' : 'utf8');
  inventory.push('', `## ${suite}`, '');
  for (const m of content.matchAll(/^\s+(ok|x)\s+(\d+)\s+(tests\\browser\\.*)$/gm)) {
    inventory.push(`- ${m[1] === 'ok' ? 'PASS' : 'FAIL'} ${m[2]}: ${m[3].trim()}`);
  }
}
writeFileSync('audit-results/test-inventory.md', inventory.join('\n') + '\n');
console.log(
  JSON.stringify({
    backendFailures: failures.length,
    inventoryEntries: inventory.filter((l) => l.startsWith('- ')).length,
  }),
);
