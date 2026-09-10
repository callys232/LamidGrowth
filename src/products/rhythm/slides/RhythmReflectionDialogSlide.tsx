import { Check } from 'lucide-react';
import { Button } from '../../../shared/ui/Button';
import { Field } from '../../../shared/ui/Field';
import { Modal } from '../../../shared/ui/Modal';
import type { useRhythmPage } from '../hooks/useRhythmPage';

export function RhythmReflectionDialogSlide({
  open,
  setOpen,
  save,
  error,
  busy,
}: Pick<ReturnType<typeof useRhythmPage>, 'open' | 'setOpen' | 'save' | 'error' | 'busy'>) {
  return (
    <>
      {open && (
        <Modal title="Pause. Reflect. Move forward." onClose={() => setOpen(false)}>
          <form onSubmit={save}>
            <Field label="What moved forward?">
              <textarea
                name="progressed"
                maxLength={500}
                rows={3}
                required
                placeholder="The progress worth recognizing…"
              />
            </Field>
            <Field label="What changed or taught you something?">
              <textarea
                name="learned"
                maxLength={5000}
                rows={3}
                placeholder="An assumption, a blocker, a useful insight…"
              />
            </Field>
            <Field label="What will you carry into the next cycle?">
              <textarea
                name="next"
                maxLength={500}
                rows={3}
                required
                placeholder="Your next priority or adjustment…"
              />
            </Field>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <Button type="submit" disabled={busy}>
              {busy ? 'Saving…' : 'Save reflection'}
              <Check size={16} />
            </Button>
          </form>
        </Modal>
      )}
    </>
  );
}
