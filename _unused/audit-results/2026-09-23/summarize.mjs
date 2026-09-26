import { readFileSync, writeFileSync, existsSync } from 'node:fs';
const dir = 'audit-results/2026-09-23';
const inventory = [
  '# Repeat audit test inventory',
  '',
  'Full-run results; reruns are reported separately.',
  '',
];
const results = [];
for (const name of [
  'backend',
  'browser',
  'usability',
  'paid-path',
  'deep-coverage',
  'human-pace',
  'click-everything',
]) {
  if (!existsSync(`${dir}/${name}.log`)) continue;
  const log = readFileSync(`${dir}/${name}.log`, 'utf8');
  const cases =
    name === 'backend'
      ? [...log.matchAll(/^(ok|not ok) (\d+) - (.*)$/gm)].map((m) => ({
          passed: m[1] === 'ok',
          name: m[3].trim(),
        }))
      : [...log.matchAll(/^[ \t]+(ok|x|✓|✘)[ \t]+\d+[ \t]+(tests\\browser\\.*)$/gm)].map((m) => ({
          passed: ['ok', '✓'].includes(m[1]),
          name: m[2].trim(),
        }));
  results.push({
    name,
    passed: cases.filter((c) => c.passed).length,
    failed: cases.filter((c) => !c.passed).length,
    failures: cases.filter((c) => !c.passed).map((c) => c.name),
  });
  inventory.push(
    `## ${name}`,
    '',
    ...cases.map((c) => `- ${c.passed ? 'PASS' : 'FAIL'} ${c.name}`),
    '',
  );
}
writeFileSync(`${dir}/test-inventory.md`, inventory.join('\n'));
writeFileSync(`${dir}/results.json`, JSON.stringify(results, null, 2));
console.log(JSON.stringify(results, null, 2));
