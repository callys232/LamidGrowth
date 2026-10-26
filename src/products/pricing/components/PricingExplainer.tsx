import { useState } from 'react';
import './pricing-explainer.css';

const items = [
  {
    id: 'access',
    title: 'Plan or tool access',
    gives: 'Permission to use the included tools in your workspace.',
    check: 'Check the included tools and any recurring billing terms at checkout.',
  },
  {
    id: 'points',
    title: 'Points',
    gives:
      'A balance used by billable tool runs. Buying points alone does not unlock an excluded tool.',
    check: 'The tool shows its points cost before submission. Repeat charged runs use more points.',
  },
  {
    id: 'bundle',
    title: 'One-time tool bundle',
    gives: 'The listed tool access and included points, after payment is confirmed.',
    check: 'No automatic renewal. Your points balance is shared by the tools you can access.',
  },
  {
    id: 'funding',
    title: 'Project funding',
    gives: 'A separate payment for a project milestone.',
    check:
      'Points do not pay contractors. Review the amount, currency, approval and refund terms separately.',
  },
] as const;

const Chevron = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
    <path
      d="M6 3l5 5-5 5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const Check = () => (
  <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true">
    <circle cx="14" cy="14" r="13" fill="none" stroke="currentColor" strokeWidth="1.5" />
    <path
      d="M8.5 14.5l3.8 3.8 7.2-8"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export function PricingExplainer({
  unitPriceMinor,
  currency = 'USD',
}: {
  unitPriceMinor?: number;
  currency?: string;
}) {
  const [open, setOpen] = useState(0);
  const [points, setPoints] = useState(100);
  const format = (n: number) =>
    new Intl.NumberFormat('en', { style: 'currency', currency }).format(n / 100);

  return (
    <section className="px" aria-labelledby="pricing-explained-title">
      <span className="px-eyebrow">Before you pay</span>
      <h2 id="pricing-explained-title">
        Understand <em>access and usage</em> before you pay
      </h2>
      <div className="px-body">
        <ul className="px-list">
          {items.map((item, i) => (
            <li key={item.id}>
              <button
                type="button"
                aria-expanded={open === i}
                aria-controls={`px-panel-${item.id}`}
                onClick={() => setOpen(i)}
              >
                <Chevron />
                {item.title}
              </button>
              <div className="px-more">
                <div>
                  <p>{item.gives}</p>
                </div>
              </div>
            </li>
          ))}
        </ul>
        <div className="px-stage" aria-live="polite">
          {items.map((item, i) => (
            <div
              key={item.id}
              id={`px-panel-${item.id}`}
              className={`px-panel${open === i ? ' is-on' : ''}`}
              aria-hidden={open !== i}
            >
              <div className="px-card px-card-a">
                <small>What it provides</small>
                <strong>{item.title}</strong>
                <p>{item.gives}</p>
              </div>
              <div className="px-card px-card-b">
                <Check />
                <small>What to check</small>
                <p>{item.check}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
      {unitPriceMinor !== undefined && (
        <div className="px-price">
          <div>
            <h3>Current points price</h3>
            <div className="px-price-calc">
              <output htmlFor="px-points">{format(points * unitPriceMinor)}</output>
              <span>
                for {points} points, at {format(unitPriceMinor)} per point
              </span>
            </div>
          </div>
          <div>
            <input
              id="px-points"
              type="range"
              min={10}
              max={1000}
              step={10}
              value={points}
              aria-label="Points to buy"
              onChange={(e) => setPoints(Number(e.target.value))}
            />
            <small>
              A tool priced at 35 points would use 35 of those points for a charged run; this
              example is not a quote for every tool.
            </small>
          </div>
        </div>
      )}
      <p className="px-foot">
        Check the checkout total and settlement currency before confirming. Access and points are
        added after confirmed payment. Demo runs use sample data and no real points.
      </p>
    </section>
  );
}
