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
const tiers = content.sections.slice(0, 3);

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

/** Tier cards side by side; dots grow with depth, as on HubSpot's Free → Enterprise cards. */
export function PricingTiers() {
  return (
    <section className="pricing-block" id="plans" aria-label="Plans">
      <div className="pricing-tiers">
        {tiers.map((tier, index) => {
          const [name, line] = tier.paragraphs;
          const team = index === tiers.length - 1;
          return (
            <article
              key={tier.label}
              className="pricing-tier"
              id={`section-${name.sourceParagraph}`}
            >
              <span className="pricing-tier-dots" aria-hidden="true">
                {Array.from({ length: index + 1 }, (_, i) => (
                  <span key={i} />
                ))}
              </span>
              <h2 data-source-paragraph={name.sourceParagraph}>{tier.title}</h2>
              <p data-source-paragraph={line.sourceParagraph}>{line.text}</p>
              {team ? (
                <Link className="button button-primary" to="/enterprise/contact">
                  Talk to Our Team
                </Link>
              ) : (
                <a className="button button-secondary" href="#billables">
                  View Pricing
                </a>
              )}
            </article>
          );
        })}
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
              Points cover every tool and engine call — 1 point costs{' '}
              {formatMinor(billables.pointsUnitPriceMinor, billables.currency)}. No hidden tiers:
              this is the same price list the app bills against.
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
            <p>Buy only the points you need, whenever you need them. No subscription required.</p>
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
    { id: 'free', label: 'Free tools' },
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
                  <th>Tool</th>
                  <th>Engine</th>
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
