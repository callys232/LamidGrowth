import { useRef, useState, type FormEvent } from 'react';
import { api } from '../../../api';
import { Button } from '../../../shared/ui/Button';
import { Field } from '../../../shared/ui/Field';
import { Modal } from '../../../shared/ui/Modal';
import type { Options } from '../types';

type EstimateResponse =
  | {
      available: true;
      budgetMin: number;
      budgetMax: number;
      currency: string;
      basis: string;
      sampleSize: number;
      note?: string;
    }
  | { available: false; sampleSize: number; message: string };

export function JobForm({
  options,
  onClose,
  onSaved,
}: {
  options: Options;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [category, setCategory] = useState(options.categories[0] ?? '');
  const [projectType, setProjectType] = useState(options.projectTypes[0] ?? '');
  const [description, setDescription] = useState('');
  const [deliverables, setDeliverables] = useState('');
  const [tagsText, setTagsText] = useState('');
  const [budgetMin, setBudgetMin] = useState('');
  const [budgetMax, setBudgetMax] = useState('');
  const [estimate, setEstimate] = useState<EstimateResponse | null>(null);
  const [estimating, setEstimating] = useState(false);
  const key = useRef(crypto.randomUUID());

  const tags = tagsText
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);

  async function runEstimate() {
    setEstimating(true);
    setEstimate(null);
    try {
      const result = await api<EstimateResponse>('/jobs/estimate', { category, projectType, tags });
      setEstimate(result);
      if (result.available) {
        setBudgetMin(String(result.budgetMin));
        setBudgetMax(String(result.budgetMax));
      }
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setEstimating(false);
    }
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    const data = Object.fromEntries(new FormData(event.currentTarget));
    try {
      await api(
        '/jobs',
        {
          ...data,
          budgetMin: Number(budgetMin),
          budgetMax: Number(budgetMax),
          tags,
        },
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
          <select name="category" value={category} onChange={(e) => setCategory(e.target.value)}>
            {options.categories.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </Field>
        <Field label="Project type">
          <select
            name="projectType"
            value={projectType}
            onChange={(e) => setProjectType(e.target.value)}
          >
            {options.projectTypes.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </Field>
        <Field label="Project description">
          <textarea
            name="description"
            required
            minLength={20}
            maxLength={10000}
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </Field>
        <Field label="Deliverables">
          <textarea
            name="deliverables"
            required
            maxLength={5000}
            value={deliverables}
            onChange={(e) => setDeliverables(e.target.value)}
          />
        </Field>
        <Field
          label="Smart tags"
          hint="Comma-separated, e.g. mobile-app, react-native — narrows the estimate within this category"
        >
          <input
            value={tagsText}
            onChange={(e) => setTagsText(e.target.value)}
            placeholder="mobile-app, react-native"
          />
        </Field>
        <Button
          type="button"
          variant="secondary"
          disabled={estimating}
          onClick={() => void runEstimate()}
        >
          {estimating ? 'Estimating…' : 'Estimate budget from real platform data'}
        </Button>
        {estimate && (
          <p style={{ fontSize: 12 }}>
            {estimate.available ? (
              <>
                Based on {estimate.sampleSize} real{' '}
                {estimate.basis === 'tag-matched-history' ? 'tag-matched' : 'category'} job
                {estimate.sampleSize === 1 ? '' : 's'}: {estimate.budgetMin}–{estimate.budgetMax}{' '}
                {estimate.currency}.{estimate.note ? ` ${estimate.note}` : ''} This is a starting
                suggestion — adjust it below as needed.
              </>
            ) : (
              estimate.message
            )}
          </p>
        )}
        <div className="form-grid">
          <Field label="Minimum budget">
            <input
              name="budgetMin"
              type="number"
              min={0}
              max={100000000}
              required
              value={budgetMin}
              onChange={(e) => setBudgetMin(e.target.value)}
            />
          </Field>
          <Field label="Maximum budget">
            <input
              name="budgetMax"
              type="number"
              min={1}
              max={100000000}
              required
              value={budgetMax}
              onChange={(e) => setBudgetMax(e.target.value)}
            />
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
