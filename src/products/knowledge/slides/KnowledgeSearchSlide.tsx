import { Field } from '../../../shared/ui/Field';
import type { useKnowledgePage } from '../hooks/useKnowledgePage';

export function KnowledgeSearchSlide({
  query,
  setQuery,
  setOffset,
  error,
}: Pick<ReturnType<typeof useKnowledgePage>, 'query' | 'setQuery' | 'setOffset' | 'error'>) {
  return (
    <>
      <Field label="Search knowledge">
        <input
          value={query}
          maxLength={200}
          onChange={(e) => {
            setQuery(e.target.value);
            setOffset(0);
          }}
        />
      </Field>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
    </>
  );
}
