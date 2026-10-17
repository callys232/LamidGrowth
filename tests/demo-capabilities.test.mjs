import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { demoToolCatalog } from '../src/app/demoAccess.mjs';
import policy from '../src/shared/demoCapabilities.json' with { type: 'json' };
import { PLANS } from '../src/app/plans.mjs';

const url = (source) => `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
const compile = (path) =>
  ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
  }).outputText;
const api = url(compile('../src/api.ts'));
test('demo tiers and advertised capabilities use the shared policy and live plans', () => {
  for (const [tier, planId] of Object.entries(policy.tiers)) {
    const catalog = demoToolCatalog(tier);
    assert.equal(catalog.plan, PLANS[planId].id);
    assert.deepEqual(catalog.capabilities, policy.features);
    assert.equal(catalog.coverage.validation.calculationTested, 63);
    assert.equal(catalog.engines.length + catalog.locked.length, 63);
  }
  assert.throws(() => demoToolCatalog('unknown'));
});
test('demo public catalog is matched before engine detail, and quotes only included tools', async () => {
  const catalog = demoToolCatalog('individual');
  const access = url(
    `export async function demoRequest(path) { if (path !== 'engines/catalog') throw new Error('Catalog was incorrectly routed to engine detail'); return ${JSON.stringify(catalog)}; }`,
  );
  const session = url(`export function readDemoSession() { return { tier: 'individual' }; }`);
  const tools = compile('../src/products/workspace/sandbox/handlers/tools.ts')
    .replace("from '../../../../api'", `from '${api}'`)
    .replace("from '../demoAccess'", `from '${access}'`)
    .replace("from '../demoSession'", `from '${session}'`);
  const { toolRoutes } = await import(url(tools));
  const { createSandboxRouter } = await import(
    url(
      compile('../src/products/workspace/sandbox/router.ts').replace(
        "from '../../../api'",
        `from '${api}'`,
      ),
    )
  );
  const request = createSandboxRouter(toolRoutes, {
    read() {
      throw new Error('Catalog should not read saved snapshots');
    },
  });
  const all = await request({ path: '/engines/catalog', method: 'GET' });
  assert.equal(all.count, 63);
  assert.equal(new Set(all.engines.map((engine) => engine.code)).size, 63);
  const included = await request({ path: '/engines', method: 'GET' });
  assert.equal(included.count, 40);
  const quote = await request({ path: '/billables', method: 'GET' });
  assert.deepEqual(
    quote.tools.map((tool) => tool.id),
    catalog.engines.map((engine) => engine.code),
  );
  const coverage = await request({ path: '/engines/catalog/coverage', method: 'GET' });
  assert.equal(coverage.validation.calculationTested, 63);
});
