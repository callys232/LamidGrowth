import { useState } from 'react';
import { Button } from '../../../shared/ui/Button';
import './engine-forms.css';

/** Fallback for the `narrative` kind — engines with no numeric compute by design (the server
 * says so honestly via a warning rather than pretending to score free text). */
export function NarrativeForm({
  onSubmit,
  submitting,
}: {
  onSubmit: (input: { notes: string }) => void;
  submitting: boolean;
}) {
  const [notes, setNotes] = useState('');

  return (
    <form
      className="engine-form"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({ notes });
      }}
    >
      <label>
        Notes
        <textarea rows={6} maxLength={4000} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </label>
      <Button type="submit" disabled={submitting || !notes.trim()}>
        {submitting ? 'Running…' : 'Structure this input'}
      </Button>
    </form>
  );
}
