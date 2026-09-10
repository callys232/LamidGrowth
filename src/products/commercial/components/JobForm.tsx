import { useRef, useState, type FormEvent } from 'react';
import { api } from '../../../api';
import { Button } from '../../../shared/ui/Button';
import { Field } from '../../../shared/ui/Field';
import { Modal } from '../../../shared/ui/Modal';
import type { Options } from '../types';
export function JobForm({
  options,
  demo,
  onClose,
  onSaved,
}: {
  options: Options;
  demo: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const key = useRef(crypto.randomUUID());
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    const data = Object.fromEntries(new FormData(event.currentTarget));
    try {
      await api(
        '/jobs',
        { ...data, budgetMin: Number(data.budgetMin), budgetMax: Number(data.budgetMax) },
        'POST',
        key.current,
      );
      onSaved();
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title="Post a scoped job" onClose={onClose}>
      <p>
        {demo
          ? 'This post stays in your sample workspace.'
          : 'This post will be visible to signed-in accounts in open opportunities.'}{' '}
        Posting uses {options.jobPostCost} points.
      </p>
      <form
        onSubmit={save}
        onChange={() => {
          key.current = crypto.randomUUID();
        }}
      >
        <Field label="Job title">
          <input name="title" required maxLength={500} />
        </Field>
        <Field label="Category">
          <select name="category">
            {options.categories.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </Field>
        <Field label="Project type">
          <select name="projectType">
            {options.projectTypes.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </Field>
        <Field label="Project description">
          <textarea name="description" required minLength={20} maxLength={10000} rows={3} />
        </Field>
        <Field label="Deliverables">
          <textarea name="deliverables" required maxLength={5000} />
        </Field>
        <div className="form-grid">
          <Field label="Minimum budget">
            <input
              name="budgetMin"
              type="number"
              min={0}
              max={100000000}
              required
              defaultValue={0}
            />
          </Field>
          <Field label="Maximum budget">
            <input name="budgetMax" type="number" min={1} max={100000000} required />
          </Field>
        </div>
        <Field label="Currency">
          <input name="currency" defaultValue="USD" pattern="[A-Z]{3}" required maxLength={3} />
        </Field>
        <Field label="Timeline">
          <input name="timeline" required maxLength={200} />
        </Field>
        {error && (
          <p role="alert" className="form-error">
            {error}
          </p>
        )}
        <Button type="submit" disabled={busy}>
          Post job · {options.jobPostCost} points
        </Button>
      </form>
    </Modal>
  );
}
