import { test } from 'node:test';
import assert from 'node:assert/strict';
import { suggestGoalPathway } from '../src/app/goalPathways.mjs';

test('pathways fit goal families and keep success and constraints visible', () => {
  for (const [title, expected] of [
    ['Grow my business', /demand/],
    ['Learn a new skill', /capability/],
    ['Make a difficult decision', /options/],
    ['Build an intentional week', /small/],
  ]) {
    const result = suggestGoalPathway({
      title,
      description: '',
      success: 'Three completed trials',
      constraints: 'Two hours a week',
    });
    assert.equal(result.source, 'template');
    assert.match(result.approach, expected);
    assert.equal(result.steps.length, 5);
    assert.match(result.steps[0].notes, /Three completed trials/);
    assert.match(result.steps.at(-1).notes, /Two hours a week/);
    assert.equal(new Set(result.steps.map((step) => step.title)).size, 5);
  }
});

test('suggestion notes remain within action limits for maximum length inputs', () => {
  const result = suggestGoalPathway({
    title: 'x'.repeat(500),
    description: '',
    success: 's'.repeat(5000),
    constraints: 'c'.repeat(5000),
  });
  assert.ok(result.steps.every((step) => step.title.length <= 500 && step.notes.length <= 5000));
});
