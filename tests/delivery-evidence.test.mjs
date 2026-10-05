// Section 9 of the 2026-10-05 engine audit plan: delivery flow evidence is read from the
// project's real tasks, not typed in, and says plainly what it could not measure.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildFlowEvidence } from '../src/app/delivery.mjs';

const NOW = '2026-10-05T12:00:00.000Z';
const day = (d) => new Date(Date.parse(NOW) - d * 86_400_000).toISOString();
const task = (
  id,
  createdDaysAgo,
  completedDaysAgo,
  status = completedDaysAgo == null ? 'open' : 'done',
) => ({
  id,
  status,
  created_at: day(createdDaysAgo),
  updated_at: day(completedDaysAgo ?? 0),
  completed_at: completedDaysAgo == null ? null : day(completedDaysAgo),
});

test('weekly periods come from completion timestamps, oldest first', () => {
  const tasks = [
    task('a', 30, 20), // finished 3 weeks ago, 10-day cycle
    task('b', 16, 12), // 2 weeks ago, 4 days
    task('c', 12, 10), // 2 weeks ago, 2 days
    task('d', 6, 2), // this week, 4 days
    task('e', 3), // still open
  ];
  const ev = buildFlowEvidence(tasks, { now: NOW, weeks: 4 });
  assert.equal(ev.sufficient, true);
  assert.equal(ev.input.periodDays, 7);
  assert.deepEqual(
    ev.input.periods.map((p) => [p.throughput, p.cycleTimeDays]),
    [
      [1, 10],
      [2, 3],
      [1, 4],
    ],
  );
  // At the end of this week only "e" is unfinished.
  assert.equal(ev.input.periods.at(-1).wip, 1);
  assert.equal(ev.coverage.emptyWeeks, 1);
  assert.ok(ev.limitations.some((l) => /no finished tasks/.test(l)));
});

test('too little delivery history is insufficient evidence, with what is missing', () => {
  const ev = buildFlowEvidence([task('a', 10, 3), task('b', 2)], { now: NOW, weeks: 6 });
  assert.equal(ev.sufficient, false);
  assert.ok(ev.missingEvidence.length >= 1);
});

test('done tasks without a completion time and cancelled tasks are left out, and counted', () => {
  const legacy = { ...task('x', 20, 15), completed_at: null };
  const cancelled = task('y', 20, 15, 'cancelled');
  const ev = buildFlowEvidence([legacy, cancelled], { now: NOW, weeks: 4 });
  assert.equal(ev.coverage.doneWithoutCompletionTime, 1);
  assert.equal(ev.coverage.cancelled, 1);
  assert.equal(ev.sufficient, false);
});
