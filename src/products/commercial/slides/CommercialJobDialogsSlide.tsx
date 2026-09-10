import { JobDetail } from '../components/JobDetail';
import { JobForm } from '../components/JobForm';
import type { useCommercialPage } from '../hooks/useCommercialPage';

export function CommercialJobDialogsSlide({
  creating,
  options,
  state,
  setCreating,
  setRevision,
  selected,
  setSelected,
}: Pick<
  ReturnType<typeof useCommercialPage>,
  'creating' | 'options' | 'state' | 'setCreating' | 'setRevision' | 'selected' | 'setSelected'
>) {
  return (
    <>
      {creating && options && (
        <JobForm
          options={options}
          demo={state.user.demo}
          onClose={() => setCreating(false)}
          onSaved={() => {
            setCreating(false);
            setRevision((n) => n + 1);
          }}
        />
      )}
      {selected && (
        <JobDetail
          job={selected}
          owner={selected.client_user_id === state.user.id}
          onClose={() => setSelected(null)}
          onSaved={() => setRevision((n) => n + 1)}
        />
      )}
    </>
  );
}
