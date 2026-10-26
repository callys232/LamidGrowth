import { ChevronDown } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CopyLine } from '../../../../shared/content/CopyLine';
import { SkeletonCards, SkeletonLine } from '../../../../shared/ui/Skeleton';
import content from './content.json';
import { formatMinor, type Billables, type Bundle } from './usePublicBillables';

/** HubSpot-style pricing flow for /pricing: light centred hero → sticky plan bar → tier cards →
 * live price cards → bundle calculator → compare table → closing band. Tier names and lines are
 * the canonical copy; every price is the live price list the app bills against. Plan tiers carry
 * no prices of their own until commercially approved (see content.json gates), so none are
 * invented here — the tier cards point to the live prices instead. */

const [, lede, heroActions] = content.hero.paragraphs;

export const pricingAnchors = [
  { id: 'plans', label: 'Plans' },
  { id: 'billables', label: 'Prices' },
  { id: 'bundle', label: 'Build a bundle' },
  { id: 'compare', label: 'Every billable' },
] as const;

export function PricingHero() {
  return (
    <section className="pricing-hero section-wrap" aria-labelledby="pricing-title">
      <span className="pricing-eyebrow">{content.name.toLowerCase()}</span>
      <h1 id="pricing-title" data-source-paragraph={content.hero.paragraphs[0].sourceParagraph}>
        {content.title}
      </h1>
      <p data-source-paragraph={lede.sourceParagraph}>{lede.text}</p>
      <CopyLine text={heroActions.text} paragraph={heroActions.sourceParagraph} />
    </section>
  );
}

/** Sticky bar under the header that tracks where you are in the pricing flow. */
export function PricingNav() {
  const [active, setActive] = useState<string>('plans');
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length) setActive(visible[0].target.id);
      },
      { rootMargin: '-80px 0px -60% 0px' },
    );
    for (const { id } of pricingAnchors) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, []);
  return (
    <nav className="pricing-nav" aria-label="Pricing">
      <div className="section-wrap">
        {pricingAnchors.map(({ id, label }) => (
          <a
            key={id}
            href={`#${id}`}
            aria-current={active === id ? 'location' : undefined}
            onClick={() => setActive(id)}
          >
            {label}
          </a>
        ))}
      </div>
    </nav>
  );
}

/** The five plans, mirrored from the billing source of truth (src/app/plans.mjs). */
const plans = [
  {
    name: 'Free',
    forWho: 'To try LamidOne',
    price: '$0',
    note: '500-point welcome reward once verified',
    includes: ['Strategy and decision engines', '1 person'],
    cta: 'Get started',
    to: '/signup',
  },
  {
    name: 'Personal',
    forWho: 'For individuals and creators',
    price: '$25',
    note: 'per month, or $250 a year',
    includes: [
      'Everything in Free, plus:',
      'Operations, risk and governance engines',
      '600 points a month',
    ],
    cta: 'Get started',
    to: '/signup',
  },
  {
    name: 'Professional',
    forWho: 'For professionals and founders',
    price: '$39',
    note: 'per month, or $390 a year',
    includes: [
      'Everything in Personal, plus:',
      'Growth, change and finance engines',
      '1,500 points a month',
    ],
    cta: 'Get started',
    to: '/signup',
  },
  {
    name: 'Team',
    forWho: 'For teams and small businesses',
    price: '$29',
    note: 'per person a month, for 3 to 10 people',
    includes: ['Every engine, including people', '1,000 points per person a month'],
    cta: 'Get started',
    to: '/signup',
  },
  {
    name: 'Enterprise',
    forWho: 'For organisations and institutions',
    price: 'Custom',
    note: 'by agreement',
    includes: ['Every engine', 'Up to 200 people or more', 'Expert advisers'],
    cta: 'Talk to our team',
    to: '/contact',
  },
] as const;

/** Plan cards side by side, each stating who it is for and what it adds, as on HubSpot's tiers. */
export function PricingTiers() {
  return (
    <section className="pricing-block" id="plans" aria-label="Plans">
      <div className="pricing-tiers">
        {plans.map((plan, index) => (
          <article key={plan.name} className="pricing-tier">
            <span className="pricing-tier-dots" aria-hidden="true">
              {Array.from({ length: index + 1 }, (_, i) => (
                <span key={i} />
              ))}
            </span>
            <h2>{plan.name}</h2>
            <p className="pricing-tier-for">{plan.forWho}</p>
            <p className="pricing-tier-price">
              <strong>{plan.price}</strong>
              <small>{plan.note}</small>
            </p>
            <ul className="pricing-tier-list">
              {plan.includes.map((item) => {
                const lead = item.startsWith('Everything in ');
                const points = /points/i.test(item);
                return (
                  <li key={item} className={lead ? 'is-lead' : points ? 'is-points' : undefined}>
                    {item.replace(/, plus:$/, '')}
                    {lead && <span aria-hidden="true"> +</span>}
                  </li>
                );
              })}
            </ul>
            <Link
              className={`button ${index === plans.length - 1 ? 'button-primary' : 'button-secondary'}`}
              to={plan.to}
            >
              {plan.cta}
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}

/** Live price cards: pay-as-you-go points first, then every published bundle. */
export function PricingCards({
  billables,
  bundles,
  error,
}: {
  billables: Billables | null;
  bundles: Bundle[] | null;
  error: string;
}) {
  return (
    <section className="pricing-block" id="billables" aria-labelledby="pricing-prices-title">
      <header className="pricing-block-head">
        <h2 id="pricing-prices-title">Every billable, in the open</h2>
        <p>
          {billables ? (
            <>
              Points cover every engine call — 1 point costs{' '}
              {formatMinor(billables.pointsUnitPriceMinor, billables.currency)}. Tool access and
              points are separate: check that your plan or bundle includes the tool you want.
            </>
          ) : (
            <SkeletonLine width={320} height={12} />
          )}
        </p>
      </header>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {!billables && !error && <SkeletonCards count={3} />}
      {billables && (
        <div className="pricing-cards">
          <article className="pricing-card">
            <h3>Pay as you go</h3>
            <p>
              Top up usage for tools you already have access to. This points purchase is one-time
              and does not unlock excluded tools.
            </p>
            <div className="pricing-card-price">
              {formatMinor(billables.pointsUnitPriceMinor, billables.currency)}
              <span>/point</span>
            </div>
            <Link className="button button-secondary" to="/signup">
              Get started free
            </Link>
          </article>
          {bundles?.map((bundle) => (
            <article key={bundle.id} className="pricing-card is-bundle">
              <h3>{bundle.name}</h3>
              <p>{bundle.description || `${bundle.points_included} points included`}</p>
              <div className="pricing-card-price">
                {formatMinor(bundle.price_minor, bundle.currency)}
                <span>{bundle.billing_cycle === 'monthly' ? '/mo' : ' one-time'}</span>
              </div>
              <Link className="button button-primary" to="/signup">
                Buy now
              </Link>
              {bundle.items.length > 0 && (
                <>
                  <span className="pricing-card-label">Included</span>
                  <ul className="pricing-card-features" data-scroll-feedback="off">
                    <li>{bundle.points_included} points included</li>
                    {bundle.items.map((item) => (
                      <li key={item.id}>{item.name}</li>
                    ))}
                  </ul>
                </>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

const PREVIEW_ROWS = 8;

/** The full line-item list, filtered by engine; the first rows show, the rest open on request. */
export function PricingCompare({ billables }: { billables: Billables | null }) {
  const [filter, setFilter] = useState('all');
  const [open, setOpen] = useState(false);
  const engines = useMemo(
    () => (billables ? Array.from(new Set(billables.tools.map((t) => t.home_engine))).sort() : []),
    [billables],
  );
  const rows = useMemo(() => {
    if (!billables) return [];
    if (filter === 'all') return billables.tools;
    if (filter === 'free') return billables.tools.filter((t) => t.points_cost === 0);
    return billables.tools.filter((t) => t.home_engine === filter);
  }, [billables, filter]);
  const shown = open ? rows : rows.slice(0, PREVIEW_ROWS);
  const filters = [
    { id: 'all', label: 'All billables' },
    { id: 'free', label: 'Free engines' },
    ...engines.map((e) => ({ id: e, label: e })),
  ];

  return (
    <section className="pricing-block" id="compare" aria-labelledby="pricing-compare-title">
      <header className="pricing-block-head">
        <h2 id="pricing-compare-title">All billables</h2>
      </header>
      {!billables ? (
        <SkeletonCards count={2} />
      ) : (
        <>
          <div className="pricing-filters" role="group" aria-label="Filter billables">
            {filters.map((f) => (
              <button
                key={f.id}
                type="button"
                aria-pressed={filter === f.id}
                onClick={() => {
                  setFilter(f.id);
                  setOpen(false);
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="pricing-table-wrap">
            <table className="pricing-table">
              <thead>
                <tr>
                  <th>Engine</th>
                  <th>Suite</th>
                  <th>Oversight</th>
                  <th>Cost</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((tool) => (
                  <tr key={tool.id}>
                    <td>{tool.name}</td>
                    <td>{tool.home_engine}</td>
                    <td>
                      {tool.human_gate === 'none'
                        ? 'Runs autonomously'
                        : `Human ${tool.human_gate}`}
                    </td>
                    <td>
                      {tool.points_cost === 0
                        ? 'Free'
                        : `${tool.points_cost} pt${tool.points_cost === 1 ? '' : 's'}`}
                    </td>
                  </tr>
                ))}
                {(filter === 'all' || filter === 'free') &&
                  (open || rows.length <= PREVIEW_ROWS) && (
                    <tr>
                      <td>{billables.deepReview.name}</td>
                      <td>—</td>
                      <td>{billables.deepReview.description}</td>
                      <td>{billables.deepReview.pointsCost} pts</td>
                    </tr>
                  )}
              </tbody>
            </table>
          </div>
          {rows.length > PREVIEW_ROWS && (
            <button
              type="button"
              className="pricing-show-all"
              aria-expanded={open}
              onClick={() => setOpen((value) => !value)}
            >
              {open ? 'Show fewer' : `Show all ${rows.length}`}
              <ChevronDown size={16} aria-hidden="true" />
            </button>
          )}
        </>
      )}
    </section>
  );
}
