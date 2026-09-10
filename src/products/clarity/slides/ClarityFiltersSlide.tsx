import type { useClarityPage } from '../hooks/useClarityPage';

export function ClarityFiltersSlide({
  filter,
  setFilter,
  state,
}: Pick<ReturnType<typeof useClarityPage>, 'filter' | 'setFilter' | 'state'>) {
  return (
    <>
      <div className="view-toolbar">
        <div className="segmented">
          {['All', 'High', 'Medium', 'Low'].map((x) => (
            <button
              className={filter === x ? 'selected' : ''}
              onClick={() => setFilter(x)}
              key={x}
              aria-pressed={filter === x}
            >
              {x === 'All' ? 'All objectives' : `${x} priority`}
            </button>
          ))}
        </div>
        <span>{state.objectives.length} objectives</span>
      </div>
    </>
  );
}
