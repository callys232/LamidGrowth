import { spawn } from 'node:child_process';
import {
  mkdirSync,
  readdirSync,
  existsSync,
  copyFileSync,
  readFileSync,
  writeFileSync,
  createWriteStream,
  unlinkSync,
} from 'node:fs';
import { resolve, relative, dirname, sep } from 'node:path';
const root = resolve('.');
const out = resolve('audit-results/2026-09-23');
const artifacts = resolve('artifacts');
const before = resolve(out, 'before-artifacts');
function files(dir) {
  return existsSync(dir)
    ? readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
        e.isDirectory() ? files(resolve(dir, e.name)) : [resolve(dir, e.name)],
      )
    : [];
}
function copy(from, to) {
  mkdirSync(dirname(to), { recursive: true });
  copyFileSync(from, to);
}
const original = files(artifacts);
for (const file of original) copy(file, resolve(before, relative(artifacts, file)));
writeFileSync(
  resolve(out, 'artifact-baseline.json'),
  JSON.stringify(
    original.map((f) => relative(artifacts, f)),
    null,
    2,
  ),
);
const env = {
  ...process.env,
  NODE_OPTIONS: `--require=${resolve(out, 'environment.cjs').replaceAll('\\', '/')}`,
};
const steps = [
  ['build', 'npm.cmd', ['run', 'build'], true],
  ['backend', process.execPath, ['--test', '--test-concurrency=3', 'tests/*.test.mjs']],
  ...['stress-worker-races', 'stress-reward-claims', 'stress-spending'].map((n) => [
    n,
    process.execPath,
    [`scripts/${n}.mjs`],
  ]),
  [
    'browser',
    process.execPath,
    [
      'node_modules/@playwright/test/cli.js',
      'test',
      `--output=${relative(root, out)}/browser-artifacts`,
    ],
  ],
  ...['usability', 'paid-path', 'deep-coverage', 'human-pace', 'click-everything'].map((n) => [
    n,
    process.execPath,
    [
      'node_modules/@playwright/test/cli.js',
      'test',
      `--config=${n}.config.ts`,
      `--output=${relative(root, out)}/${n}-artifacts`,
    ],
  ]),
  ['format', 'npm.cmd', ['run', 'format:check'], true],
];
const statuses = [];
try {
  for (const [name, command, args, shell = false] of steps) {
    console.log(`START ${name}`);
    const start = Date.now();
    const log = createWriteStream(resolve(out, `${name}.log`));
    const result = await new Promise((resolveResult) => {
      const child = spawn(command, args, { cwd: root, env, shell, windowsHide: true });
      child.stdout.pipe(log, { end: false });
      child.stderr.pipe(log, { end: false });
      child.on('error', (error) => resolveResult({ exitCode: null, error: error.message }));
      child.on('close', (code) => resolveResult({ exitCode: code }));
    });
    await new Promise((r) => log.end(r));
    statuses.push({ name, ...result, seconds: Math.round((Date.now() - start) / 1000) });
    writeFileSync(resolve(out, 'status.json'), JSON.stringify(statuses, null, 2));
    console.log(`END ${name}: ${JSON.stringify(statuses.at(-1))}`);
  }
} finally {
  // Preserve new evidence, restoring only the exact artifact files changed by this audit.
  for (const file of files(artifacts)) {
    if (!file.startsWith(artifacts + sep)) throw new Error('Artifact escaped workspace');
    const rel = relative(artifacts, file);
    const saved = resolve(before, rel);
    if (!existsSync(saved) || !readFileSync(saved).equals(readFileSync(file))) {
      copy(file, resolve(out, 'generated', rel));
      if (existsSync(saved)) copy(saved, file);
      else unlinkSync(file);
    }
  }
  for (const file of original)
    if (!existsSync(file)) copy(resolve(before, relative(artifacts, file)), file);
  console.log('Artifact baseline restored. Full audit finished.');
}
