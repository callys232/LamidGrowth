import { ActionDetail } from '../components/ActionDetail';
import type { useActionsPage } from '../hooks/useActionsPage';

export function ActionsActionDialogSlide({
  selected,
  setSelected,
}: Pick<ReturnType<typeof useActionsPage>, 'selected' | 'setSelected'>) {
  return <>{selected && <ActionDetail action={selected} onClose={() => setSelected(null)} />}</>;
}
