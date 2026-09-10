import type { useActionsPage } from '../hooks/useActionsPage';

export function ActionsFiltersSlide({
  filter,
  setFilter,
  statuses,
  setView,
  view,
}: Pick<
  ReturnType<typeof useActionsPage>,
  'filter' | 'setFilter' | 'statuses' | 'setView' | 'view'
>) {
  return (
    <>
      <div className="view-toolbar">
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
