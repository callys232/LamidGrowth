import { test } from 'node:test';
import assert from 'node:assert/strict';
import { collectAgentSources } from '../src/app/agentSources.mjs';
import { scopeAIPayload } from '../src/app/aiRules.mjs';

/** A database with no saved tool results. */
const noResults = { prepare: () => ({ all: async () => [], get: async () => undefined }) };

test('stored records without a kind remain usable under human data-sharing rules', async () => {
  const store = {
    db: noResults,
    records: async (workspace, kind) => {
      assert.equal(workspace, 'workspace');
      return [
        {
          id: kind,
          version: 1,
          title: `A ${kind}`,
          ...(kind === 'knowledge' ? { kind: 'objective' } : {}),
        },
      ];
    },
  };
  const sources = await collectAgentSources(store, 'workspace', ['knowledge']);
  assert.deepEqual(
    sources.map((source) => source.kind),
    ['objective', 'action', 'knowledge'],
  );
  const payload = scopeAIPayload(
    { rules: { allowedSources: ['objective'] } },
    { question: 'Help', sources },
    'specialists',
  );
  assert.deepEqual(
    payload.sources.map((source) => source.id),
    ['objective'],
  );
});

test('an empty workspace can request suggestions without falsely reporting blocked data', async () => {
  const sources = await collectAgentSources(
    { db: noResults, records: async () => [] },
    'empty-workspace',
  );
  const payload = scopeAIPayload(
    { rules: { allowedSources: [] } },
    { question: 'Help me define a goal', sources },
    'specialists',
  );
  assert.deepEqual(payload.sources, []);
  assert.equal(payload.question, 'Help me define a goal');
});

test('current tool results reach the agent with their status, and data rules can exclude them', async () => {
  const row = {
    workspace_id: 'w',
    subject_kind: 'goal',
    subject_id: 'g1',
    agent_id: 'tool:T06',
    version: 2,
    status: 'provisional',
    conclusion: 'provisional: Throughput 7 a week',
    computed_at: '2026-10-05T00:00:00.000Z',
    expires_at: '2999-01-01T00:00:00.000Z',
    summary: JSON.stringify({ toolId: 'T06', status: 'provisional' }),
  };
  const db = {
    prepare: (sql) => ({
      all: async () => (/FROM intelligence_results/.test(sql) ? [row] : []),
      get: async () => undefined,
    }),
  };
  const sources = await collectAgentSources({ db, records: async () => [] }, 'w');
  const tool = sources.find((s) => s.kind === 'tool_result');
  assert.equal(tool.data.tool, 'T06');
  assert.equal(tool.data.status, 'provisional');
  const blocked = scopeAIPayload(
    { rules: { allowedSources: ['objective'] } },
    { question: 'Why late?', sources: [...sources, { id: 'o', kind: 'objective' }] },
    'specialists',
  );
  assert.ok(!blocked.sources.some((s) => s.kind === 'tool_result'));
});
