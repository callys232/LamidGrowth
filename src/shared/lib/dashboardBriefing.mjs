const open = (action) => !['Done', 'Paused'].includes(action.status);

/** Calendar dates are compared in the viewer's time zone; due today is not overdue. */
export function attentionItems(objectives, actions, today) {
  const end = new Date(`${today}T12:00:00Z`);
  end.setUTCDate(end.getUTCDate() + 7);
  const upcoming = end.toISOString().slice(0, 10);
  const items = [];
  for (const action of actions.filter(open)) {
    const reasons = [];
    if (action.status === 'Needs review') reasons.push('Waiting for review');
    if (action.dueDate && action.dueDate < today) reasons.push(`Overdue since ${action.dueDate}`);
    else if (action.dueDate && action.dueDate <= upcoming) reasons.push(`Due ${action.dueDate}`);
    if (reasons.length)
      items.push({
        id: action.id,
        kind: 'action',
        title: action.title,
        reasons,
        date: action.dueDate || '',
        rank:
          action.dueDate && action.dueDate < today ? 0 : action.status === 'Needs review' ? 1 : 2,
      });
  }
  for (const objective of objectives.filter((item) => item.status === 'Active')) {
    const reasons = [];
    if (objective.targetDate && objective.targetDate < today)
      reasons.push(`Target date passed: ${objective.targetDate}`);
    else if (objective.targetDate && objective.targetDate <= upcoming)
      reasons.push(`Target date ${objective.targetDate}`);
    if (!actions.some((action) => action.objectiveId === objective.id && open(action)))
      reasons.push('No next action');
    if (reasons.length)
      items.push({
        id: objective.id,
        kind: 'objective',
        title: objective.title,
        reasons,
        date: objective.targetDate || '',
        rank: 3,
      });
  }
  return items.sort(
    (a, b) =>
      a.rank - b.rank ||
      (a.date || '9999').localeCompare(b.date || '9999') ||
      a.id.localeCompare(b.id),
  );
}

export function changedActions(actions, previous) {
  if (!previous) return { completed: [], reviews: [] };
  return {
    completed: actions.filter((a) => a.status === 'Done' && previous[a.id] !== 'Done'),
    reviews: actions.filter(
      (a) => a.status === 'Needs review' && previous[a.id] !== 'Needs review',
    ),
  };
}
