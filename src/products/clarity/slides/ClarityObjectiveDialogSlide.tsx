import { ObjectiveEditor } from '../components/ObjectiveEditor';
import type { useClarityPage } from '../hooks/useClarityPage';

export function ClarityObjectiveDialogSlide({
  selected,
  setSelected,
}: Pick<ReturnType<typeof useClarityPage>, 'selected' | 'setSelected'>) {
  return (
    <>{selected && <ObjectiveEditor objective={selected} onClose={() => setSelected(null)} />}</>
  );
}
