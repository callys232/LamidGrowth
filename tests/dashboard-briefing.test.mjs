import { test } from 'node:test';
import assert from 'node:assert/strict';
import { attentionItems, changedActions } from '../src/shared/lib/dashboardBriefing.mjs';
import { prepareDashboardBriefing } from '../src/app/dashboardBriefing.mjs';

test('attention handles calendar boundaries, reviews, paused tasks and goals without next steps', () => {
  const actions = [
    {
      id: 'yesterday',
      title: 'Late',
      status: 'Planned',
      dueDate: '2026-09-24',
      objectiveId: 'goal',
    },
    { id: 'today', status: 'Planned', dueDate: '2026-09-25' },
    { id: 'week', status: 'Planned', dueDate: '2026-10-02' },
    { id: 'later', status: 'Planned', dueDate: '2026-10-03' },
    { id: 'review', status: 'Needs review', dueDate: '' },
    { id: 'done', status: 'Done', dueDate: '2026-09-01' },
    { id: 'paused', status: 'Paused', dueDate: '2026-09-01', objectiveId: 'empty' },
  ];
  const result = attentionItems(
    [
      { id: 'goal', status: 'Active' },
      { id: 'empty', status: 'Active' },
      { id: 'closed', status: 'Complete' },
    ],
    actions,
    '2026-09-25',
  );
  assert.deepEqual(
    result.map((i) => i.id),
    ['yesterday', 'review', 'today', 'week', 'empty'],
  );
  assert.deepEqual(result.find((i) => i.id === 'today').reasons, ['Due 2026-09-25']);
  assert.deepEqual(result.at(-1).reasons, ['No next action']);
});

test('change counts compare statuses rather than lifetime totals and treat first visits separately', () => {
  const actions = [
    { id: 'old', status: 'Done' },
    { id: 'new', status: 'Done' },
    { id: 'review', status: 'Needs review' },
  ];
  assert.deepEqual(changedActions(actions, null), { completed: [], reviews: [] });
  const result = changedActions(actions, { old: 'Done', new: 'In progress', review: 'Planned' });
  assert.deepEqual(
    result.completed.map((a) => a.id),
    ['new'],
  );
  assert.deepEqual(
    result.reviews.map((a) => a.id),
    ['review'],
  );
});

function fixture(rules = {}) {
  const policy = { enabled: true, version: 1, dailyLimit: 10, rules };
  const requests = [];
  const store = {
    records: async (workspace, kind) => {
      assert.equal(workspace, 'workspace-one');
      if (kind === 'ai_policy') return [policy];
      if (kind === 'objective')
        return [
          { id: 'goal', title: 'Private goal', version: 1, status: 'Active', targetDate: '' },
        ];
      return [
        {
          id: 'action',
          title: 'Review proposal',
          version: 2,
          status: 'Needs review',
          dueDate: '2026-09-24',
        },
      ];
    },
    transaction: async (work) => work(),
    db: {
      prepare: (sql) => ({
        get: async () =>
          sql.includes('FROM users')
            ? { verified_at: 'today', demo: false }
            : sql.includes('workspace_members')
              ? { role: 'owner' }
              : { n: 0 },
        run: async () => ({ changes: 1 }),
      }),
    },
  };
  const provider = {
    review: async (payload) => {
      requests.push(payload);
      return {
        review: {
          summary: 'A proposal awaits review.',
          suggestions: [
            { title: 'Review proposal', rationale: 'It is overdue and needs a decision.' },
          ],
          assumptions: [],
          evidenceIds: ['action'],
        },
      };
    },
  };
  const input = { consent: true, rulesVersion: 1, today: '2026-09-25' };
  const run = (body = input, suppliedProvider = provider) =>
    prepareDashboardBriefing(store, suppliedProvider, 'workspace-one', 'user-one', body);
  return { policy, requests, run, input, provider };
}

test('briefing scopes workspace reads, includes computed facts and returns trusted evidence links', async () => {
  const f = fixture({ allowedSources: ['action'] });
  const result = await f.run();
  assert.deepEqual(result.sources, [
    { id: 'action', kind: 'action', version: 2, title: 'Review proposal' },
  ]);
  assert.ok(!JSON.stringify(f.requests).includes('Private goal'));
  assert.deepEqual(f.requests[0].sources[0].data.attention, [
    'Waiting for review',
    'Overdue since 2026-09-24',
  ]);
  assert.ok(result.generatedAt);
});

test('consent, version, feature, source and provider failures do not invoke AI', async () => {
  const f = fixture();
  await assert.rejects(f.run({ ...f.input, consent: false }));
  await assert.rejects(f.run({ ...f.input, today: '2026-02-30' }));
  await assert.rejects(f.run({ ...f.input, rulesVersion: 0 }), /rules changed/);
  await assert.rejects(f.run(f.input, null), /not configured/);
  f.policy.rules = { reviews: false };
  await assert.rejects(f.run(), /block reviews/);
  f.policy.rules = { allowedSources: [] };
  await assert.rejects(f.run(), /data rules/);
  f.policy.rules = {};
  f.policy.enabled = false;
  await assert.rejects(f.run(), /disabled/);
  assert.equal(f.requests.length, 0);
});

test('briefing rejects fabricated evidence and does not leak excluded action facts', async () => {
  const f = fixture({ allowedSources: ['objective'] });
  await assert.rejects(f.run(), /outside the selected context/);
  assert.ok(!JSON.stringify(f.requests).includes('Review proposal'));
  assert.ok(!JSON.stringify(f.requests).includes('No next action'));
});
