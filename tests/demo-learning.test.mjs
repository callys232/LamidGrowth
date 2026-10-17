import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

// Execute the actual TypeScript handlers without creating emitted source files. Only type
// syntax is removed; api.ts (including the real ApiError) and router.ts are used unchanged.
const moduleUrl = (source) =>
  `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
const compile = (path) =>
  ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
  }).outputText;
const apiUrl = moduleUrl(compile('../src/api.ts'));
const load = (path, apiImport) =>
  import(moduleUrl(compile(path).replace(`from '${apiImport}'`, `from '${apiUrl}'`)));
const { learningRoutes } = await load(
  '../src/products/workspace/sandbox/handlers/learning.ts',
  '../../../../api',
);
const { createSandboxRouter } = await load(
  '../src/products/workspace/sandbox/router.ts',
  '../../../api',
);
function fixture() {
  let serialized = JSON.stringify({
    state: { user: { id: 'visitor' }, workspace: { context: 'Technology' } },
  });
  const store = {
    read: () => JSON.parse(serialized),
    write: (data) => {
      serialized = JSON.stringify(data);
    },
  };
  const router = createSandboxRouter(learningRoutes, store);
  return {
    store,
    request: (path, body, method = body === undefined ? 'GET' : 'POST') =>
      router({ path, body, method }),
  };
}
test('demo learning persists a complete lifecycle without real points or credentials', async () => {
  const { request, store } = fixture();
  const path = await request('/learning/paths', { title: 'Audit training', pointsCost: 500 });
  const module = await request(`/learning/paths/${path.id}/modules`, {
    title: 'Assessment',
    format: 'assessment',
  });
  const enrolled = await request(`/learning/paths/${path.id}/enroll`, {});
  assert.equal(enrolled.progress, 0);
  const complete = await request(`/learning/modules/${module.id}/complete`, { score: 85 });
  assert.equal(complete.progress, 100);
  assert.equal(complete.status, 'completed');
  const cert = await request(`/learning/enrollments/${enrolled.id}/certificate`, {});
  assert.equal(cert.demo, true);
  await request(`/learning/paths/${path.id}/feedback`, { rating: 4, comment: 'Useful' });
  await request(`/learning/paths/${path.id}/feedback`, { rating: 5, comment: 'Updated' });
  const restored = createSandboxRouter(learningRoutes, store);
  const catalog = await restored({ path: '/learning/paths', method: 'GET' });
  assert.equal(catalog[0].feedback.count, 1);
  assert.equal(catalog[0].feedback.average, 5);
  assert.deepEqual(store.read().learning.completions[module.id], { score: 85, graded: false });
  assert.equal(store.read().state.user.points_balance, undefined);
  assert.equal(store.read().credentials, undefined);
  assert.equal((await request('/learning/certificates/mine'))[0].id, cert.id);
});
test('demo learning enforces sequencing, author ownership and valid assessment scores', async () => {
  const { request } = fixture();
  const reject = (path, body, status = 400) =>
    assert.rejects(request(path, body), (error) => error.status === status);
  await reject('/learning/paths', { title: ' ' });
  await reject('/learning/paths', { title: 'Invalid', estimatedHours: 0 });
  await reject('/learning/paths', { title: 'Invalid', pointsCost: 1.5 });
  await reject('/learning/paths/demo-path-0/modules', { title: 'Wrong author' }, 403);
  await reject('/learning/enrollments/demo-enrollment-0/certificate', {});
  await reject('/learning/paths/demo-path-0/feedback', { rating: 5 });
  const path = await request('/learning/paths', { title: 'Training' });
  await reject(`/learning/paths/${path.id}/enroll`, {});
  await reject(`/learning/paths/${path.id}/modules`, { title: 'Module', format: 'unknown' });
  const module = await request(`/learning/paths/${path.id}/modules`, {
    title: 'Assessment',
    format: 'assessment',
  });
  await reject(`/learning/modules/${module.id}/complete`, { score: 85 });
  const enrolled = await request(`/learning/paths/${path.id}/enroll`, {});
  await reject(`/learning/paths/${path.id}/enroll`, {});
  await reject(`/learning/paths/${path.id}/modules`, { title: 'Late module' }, 409);
  for (const score of [undefined, null, -1, 101, 1.5, NaN, Infinity, '85'])
    await reject(`/learning/modules/${module.id}/complete`, { score });
  await request(`/learning/modules/${module.id}/complete`, { score: 85 });
  await reject(`/learning/modules/${module.id}/complete`, { score: 85 });
  for (const rating of [0, 6, 1.5, '5'])
    await reject(`/learning/paths/${path.id}/feedback`, { rating });
  await request(`/learning/enrollments/${enrolled.id}/certificate`, {});
  await reject(`/learning/enrollments/${enrolled.id}/certificate`, {});
  await reject('/learning/modules/missing/complete', {}, 404);
  await reject('/learning/enrollments/missing/certificate', {}, 404);
});
