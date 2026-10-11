// Writes the public engine catalog and coverage report to a JSON snapshot for the demo sandbox,
// which never calls /api. Run after changing the engine registry; `--check` fails on drift (used by
// tests/browser/sandbox-crawl.spec.ts).
import { readFileSync, writeFileSync } from 'node:fs';
import { catalogCoverage, catalogSummary } from '../src/app/engines.mjs';

const target = new URL('../src/products/workspace/sandbox/engineCatalog.json', import.meta.url);
const next = `${JSON.stringify({ catalog: catalogSummary(), coverage: catalogCoverage() }, null, 2)}\n`;
if (process.argv.includes('--check')) {
  const current = readFileSync(target, 'utf8');
  if (current !== next) {
    console.error(
      'Engine catalog snapshot is out of date: run node scripts/engine-catalog-snapshot.mjs',
    );
    process.exit(1);
  }
  console.log('Engine catalog snapshot is current.');
} else {
  writeFileSync(target, next);
  console.log('Wrote', target.pathname);
}
