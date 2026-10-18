import { mkdirSync, writeFileSync } from 'node:fs';
import {
  catalogSummary,
  demoEngineDetail,
  resolve,
  runEngine,
  REGISTERED_CODES,
} from '../src/app/engines.mjs';
import { demoToolCatalog } from '../src/app/demoAccess.mjs';

const report = { checks: 0, engines: [], failures: [], aliases: { resolved: 0, retired: 0 } };
const clone = (value) => structuredClone(value);
function finite(value) {
  if (typeof value === 'number' && !Number.isFinite(value))
    throw new Error('Non-finite number in result');
  if (value && typeof value === 'object') Object.values(value).forEach(finite);
}
function check(engine, scenario, input, reject = false) {
  report.checks++;
  const before = JSON.stringify(input);
  try {
    const result = runEngine(resolve(engine.code).ref, input);
    finite(result);
    if (JSON.stringify(input) !== before) throw new Error('Calculator mutated its input');
    if (reject) throw new Error('Invalid input was accepted');
    return result;
  } catch (error) {
    if (error.status === 400) {
      if (!reject && scenario === 'worked example')
        report.failures.push({
          code: engine.code,
          name: engine.engineName,
          scenario,
          error: error.message,
        });
      return;
    }
    report.failures.push({
      code: engine.code,
      name: engine.engineName,
      scenario,
      error: error.message,
    });
  }
}
for (const engine of catalogSummary().engines) {
  const detail = demoEngineDetail(engine.code);
  const example = clone(detail.example);
  const baseline = check(engine, 'worked example', clone(example));
  const repeated = check(engine, 'repeatability', clone(example));
  if (baseline && repeated && JSON.stringify(baseline.summary) !== JSON.stringify(repeated.summary))
    report.failures.push({
      code: engine.code,
      scenario: 'repeatability',
      error: 'Different figures for the same input',
    });
  check(engine, 'empty input', {});
  report.engines.push({
    code: engine.code,
    name: engine.engineName,
    kind: detail.inputs.kind,
    examplePass: Boolean(baseline),
  });
  if (detail.inputs.kind === 'schema') {
    const mutateField = (field, path) => {
      const change = (value, label, reject = false) => {
        const input = clone(example);
        let parent = input;
        for (const key of path.slice(0, -1)) parent = parent[key];
        parent[path.at(-1)] = value;
        check(engine, `${path.join('.')}: ${label}`, input, reject);
      };
      if (field.required) change('', 'required empty', true);
      if (['number', 'percent', 'integer'].includes(field.type)) {
        change('not-a-number', 'non-numeric', true);
        change(Infinity, 'infinite', true);
        change(NaN, 'NaN', true);
        const min = field.min ?? (field.type === 'percent' ? 0 : undefined);
        const max = field.max ?? (field.type === 'percent' ? 100 : undefined);
        if (min !== undefined) change(min - 1, 'below minimum', true);
        if (max !== undefined) change(max + 1, 'above maximum', true);
        if (field.type === 'integer') change(1.5, 'fractional integer', true);
        change(0, 'zero');
        change(1e150, 'extreme finite');
      } else if (field.type === 'select') change('invalid-enum-value', 'unknown selection', true);
      else if (field.type === 'date') change('2026-02-31', 'invalid calendar day', true);
      else if (['text', 'longtext'].includes(field.type)) {
        for (const text of [
          '__proto__',
          'constructor',
          'toString',
          'Ålex 李 😀',
          '<script>alert(1)</script>',
        ])
          change(text, `text ${text}`);
      }
    };
    for (const field of detail.inputs.fields) mutateField(field, [field.key]);
    for (const table of detail.inputs.tables) {
      if (example[table.key]?.length) {
        for (const field of table.columns) mutateField(field, [table.key, 0, field.key]);
        const over = clone(example);
        over[table.key] = Array.from({ length: (table.maxRows ?? 200) + 1 }, () =>
          clone(example[table.key][0]),
        );
        check(engine, `${table.key}: too many rows`, over, true);
      }
      if ((table.minRows ?? 1) > 0) {
        const empty = clone(example);
        empty[table.key] = [];
        check(engine, `${table.key}: missing rows`, empty, true);
      }
    }
  } else if (detail.inputs.kind === 'anchored') {
    const id = Object.keys(example.answers)[0];
    for (const [property, value] of [
      ['level', 6],
      ['level', -1],
      ['evidence', 3],
      ['evidence', -1],
    ]) {
      const bad = clone(example);
      bad.answers[id][property] = value;
      check(engine, `invalid ${property} ${value}`, bad, true);
    }
    const unknown = clone(example);
    unknown.answers.unknown_question = { level: 3, evidence: 2 };
    check(engine, 'unknown question', unknown, true);
  } else {
    for (const key of Object.keys(example)) {
      for (const value of [
        null,
        'wrong-type',
        {},
        [],
        ...(Array.isArray(example[key]) ? [[null], [1], ['wrong-type'], [{}]] : []),
      ]) {
        const altered = clone(example);
        altered[key] = value;
        check(engine, `${key}: malformed ${JSON.stringify(value)}`, altered);
      }
    }
  }
}
for (const code of REGISTERED_CODES) {
  const resolved = resolve(code);
  if (resolved.error) report.aliases.retired++;
  else {
    report.aliases.resolved++;
    const detail = demoEngineDetail(code);
    if (!detail.inputs)
      report.failures.push({ code, scenario: 'legacy alias', error: 'Manifest missing' });
  }
}
report.tiers = Object.fromEntries(
  ['individual', 'team', 'enterprise'].map((tier) => [
    tier,
    { available: demoToolCatalog(tier).count, locked: demoToolCatalog(tier).locked.length },
  ]),
);
mkdirSync('lamiddoc/test-results', { recursive: true });
writeFileSync('lamiddoc/test-results/deep-engine-audit.json', JSON.stringify(report, null, 2));
console.log(
  JSON.stringify(
    {
      engines: report.engines.length,
      checks: report.checks,
      failures: report.failures,
      tiers: report.tiers,
      aliases: report.aliases,
    },
    null,
    2,
  ),
);
if (report.failures.length) process.exitCode = 1;
