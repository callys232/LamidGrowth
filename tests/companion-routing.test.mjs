import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chooseAgent, planSpecialists } from '../src/app/companionRouting.mjs';

test('specific document requests are not captured by generic action verbs', () => {
  assert.equal(chooseAgent('start a proposal'), 'proposal-drafter');
  assert.equal(chooseAgent('write a statement of work'), 'sow-builder');
  assert.equal(chooseAgent('approve workflow abc'), 'workflow-orchestration');
  assert.equal(chooseAgent('show me my workflows'), 'workflow-orchestration');
});
test('follow-up routing retains safe context but never repeats a workflow command', () => {
  assert.equal(
    chooseAgent('tell me more', { previousAgent: 'market-intelligence' }),
    'market-intelligence',
  );
  assert.equal(
    chooseAgent('continue', { previousAgent: 'workflow-orchestration' }),
    'context-curator',
  );
  assert.equal(chooseAgent('what now', { page: '/os/learning' }), 'capability-mapper');
});
test('support and signup requests use free guidance; plans contain no write agents', () => {
  assert.equal(chooseAgent('I forgot my password'), 'support');
  assert.equal(chooseAgent('create my account'), 'onboarding');
  for (const goal of ['grow my business', 'deliver a project', 'my personal goal']) {
    const steps = planSpecialists(goal);
    assert.equal(steps.length, 3);
    assert.equal(steps.includes('workflow-orchestration'), false);
  }
});
