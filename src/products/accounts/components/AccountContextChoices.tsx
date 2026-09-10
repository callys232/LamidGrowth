import { Check } from 'lucide-react';
import { contexts } from '../../../shared/lib/contexts';
import { icons } from '../components/contextIcons';
import type { useAuthPage } from '../hooks/useAuthPage';
export function AccountContextChoices({
  context,
  setContext,
}: Pick<ReturnType<typeof useAuthPage>, 'context' | 'setContext'>) {
  return (
    <>
      <div className="context-selector">
        {contexts.map((item, i) => {
          const Icon = icons[i];
          return (
            <button
              key={item}
              className={context === item ? 'selected' : ''}
              onClick={() => setContext(item)}
              aria-pressed={context === item}
            >
              <Icon size={19} strokeWidth={1.5} />
              <span>{item}</span>
              {context === item && <Check size={15} />}
            </button>
          );
        })}
      </div>
    </>
  );
}
