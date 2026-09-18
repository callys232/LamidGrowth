import { useState } from 'react';
import { Button } from '../../../shared/ui/Button';
import { RowListForm, type Row, defaultRow, type FieldDef } from './RowListForm';
import './engine-forms.css';

const FIELDS: FieldDef[] = [
  { key: 'name', label: 'Pathway name', type: 'text' },
  {
    key: 'quadrant',
    label: 'Ansoff quadrant',
    type: 'select',
    options: [
      { value: 'penetration', label: 'Penetration — existing offer, existing market' },
      { value: 'market_development', label: 'Market development — existing offer, new market' },
      { value: 'product_development', label: 'Product development — new offer, existing market' },
      { value: 'diversification', label: 'Diversification — new offer, new market' },
    ],
    default: 'penetration',
  },
  {
    key: 'horizon',
    label: 'Horizon',
    type: 'select',
    options: [
      { value: '1', label: '1 — defend the core' },
      { value: '2', label: '2 — build the emerging' },
      { value: '3', label: '3 — option on the future' },
    ],
    default: '1',
  },
  { key: 'marketAttractiveness', label: 'Market attractiveness (0-5)', type: 'number', min: 0, max: 5, default: 3 },
  { key: 'capabilityFit', label: 'Capability fit (0-5)', type: 'number', min: 0, max: 5, default: 3 },
  { key: 'investmentLevel', label: 'Investment level (0-5)', type: 'number', min: 0, max: 5, default: 2 },
  { key: 'timeToRevenueMonths', label: 'Months to revenue', type: 'number', min: 0, default: 6 },
  {
    key: 'confidence',
    label: 'Confidence',
    type: 'select',
    options: [
      { value: '0', label: 'Asserted' },
      { value: '1', label: 'Indicative' },
      { value: '2', label: 'Evidenced' },
    ],
    default: '1',
  },
];

/** G03 — candidate growth pathways compared against each other under a capacity constraint. */
export function GrowthPathwaysForm({
  onSubmit,
  submitting,
}: {
  onSubmit: (input: { pathways: unknown[]; capacity: number }) => void;
  submitting: boolean;
}) {
  const [rows, setRows] = useState<Row[]>([defaultRow(FIELDS, 0)]);
  const [capacity, setCapacity] = useState(3);

  return (
    <form
      className="engine-form"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({
          pathways: rows.map((r) => ({
            ...r,
            horizon: Number(r.horizon),
            confidence: Number(r.confidence),
          })),
          capacity,
        });
      }}
    >
      <label>
        Execution capacity (slots)
        <input type="number" min={1} value={capacity} onChange={(e) => setCapacity(Number(e.target.value))} />
      </label>
      <RowListForm fields={FIELDS} rows={rows} onChange={setRows} addLabel="Add pathway" />
      <Button type="submit" disabled={submitting || rows.length === 0}>
        {submitting ? 'Running…' : 'Run diagnostic'}
      </Button>
    </form>
  );
}
