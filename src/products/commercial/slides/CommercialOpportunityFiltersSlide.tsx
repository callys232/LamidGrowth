import { Field } from '../../../shared/ui/Field';
import type { useCommercialPage } from '../hooks/useCommercialPage';

export function CommercialOpportunityFiltersSlide({
  balance,
  options,
  view,
  setView,
  setOffset,
  state,
  query,
  setQuery,
  error,
}: Pick<
  ReturnType<typeof useCommercialPage>,
  | 'balance'
  | 'options'
  | 'view'
  | 'setView'
  | 'setOffset'
  | 'state'
  | 'query'
  | 'setQuery'
  | 'error'
>) {
  return (
    <>
      <p>
        {balance ?? '…'} development points available. Posting costs {options?.jobPostCost ?? 40};
        bidding costs {options?.bidCost ?? 20}. Points are an internal usage allowance. Proposals are
        drafts and create no contract or payment.
      </p>
      <div className="view-toolbar">
        <div className="segmented">
          <button
            aria-pressed={view === 'workspace'}
            onClick={() => {
              setView('workspace');
              setOffset(0);
            }}
          >
            Workspace posts
          </button>
          <button
            aria-pressed={view === 'marketplace'}
            disabled={state.user.demo}
            onClick={() => {
              setView('marketplace');
              setOffset(0);
            }}
          >
            Open opportunities
          </button>
        </div>
        {view === 'marketplace' && (
          <Field label="Search opportunities">
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setOffset(0);
              }}
              maxLength={200}
            />
          </Field>
        )}
      </div>
      {state.user.demo && (
        <p>
          Sample posts stay within this sample workspace. Create an account to participate in open
          opportunities.
        </p>
      )}
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
    </>
  );
}
