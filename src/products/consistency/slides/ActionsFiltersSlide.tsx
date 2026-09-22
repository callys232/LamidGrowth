import type { useActionsPage } from '../hooks/useActionsPage';

export function ActionsFiltersSlide({
  filter,
  setFilter,
  statuses,
  setView,
  view,
  objectiveId,
  setObjectiveId,
  state,
}: Pick<
  ReturnType<typeof useActionsPage>,
  | 'filter'
  | 'setFilter'
  | 'statuses'
  | 'setView'
  | 'view'
  | 'objectiveId'
  | 'setObjectiveId'
  | 'state'
>) {
  return (
    <>
      <div className="view-toolbar">
        <label className="inline-select">
          Goal
          <select value={objectiveId} onChange={(e) => setObjectiveId(e.target.value)}>
            <option value="">All goals</option>
            {objectiveId && !state.objectives.some((item) => item.id === objectiveId) && (
              <option value={objectiveId}>Unavailable goal</option>
            )}
            {state.objectives.map((item) => (
              <option key={item.id} value={item.id}>
                {item.title}
              </option>
            ))}
          </select>
        </label>
        <label className="inline-select">
          Status
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option>All</option>
            {statuses.map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </label>
        <div className="segmented">
          <button
            onClick={() => setView('list')}
            className={view === 'list' ? 'selected' : ''}
            aria-pressed={view === 'list'}
          >
            List
          </button>
          <button
            onClick={() => setView('board')}
            className={view === 'board' ? 'selected' : ''}
            aria-pressed={view === 'board'}
          >
            Board
          </button>
        </div>
      </div>
    </>
  );
}
