import { Link, useLocation } from 'react-router-dom';
import { destinations } from './destinations';

/** A handful of canonical CTAs point at the very page they're written on (e.g. "View Pricing" on
 * /pricing itself) — a plain <Link> to your own current URL is a no-op, previously reported as
 * "not clicking"/"doesn't scroll". A few of those got a specific #anchor in destinations.ts; for
 * every other self-referential CTA (site-wide sweep found ~25), this generic fallback scrolls to
 * the named anchor if one exists, otherwise to the next content block after the CTA, so clicking
 * always visibly does something instead of silently going nowhere. */
function scrollForSelfLink(trigger: HTMLElement, hash: string) {
  const target = hash && document.getElementById(hash.slice(1));
  if (target) {
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    return;
  }
  const container = trigger.closest('section');
  const next = container?.nextElementSibling;
  if (next instanceof HTMLElement) next.scrollIntoView({ behavior: 'smooth', block: 'start' });
  else window.scrollBy({ top: window.innerHeight * 0.85, behavior: 'smooth' });
}

export function CopyLine({ text, paragraph }: { text: string; paragraph: number }) {
  const { pathname } = useLocation();
  if (/^(CTA:|Links?:)/.test(text)) {
    return (
      <div className="canonical-ctas" data-source-paragraph={paragraph}>
        {text
          .replace(/^(CTA:|Links?:)\s*/, '')
          .split('|')
          .map((raw, i) => {
            const label = raw.trim();
            const to = destinations[label];
            const external = to && /^(mailto:|https?:)/.test(to);
            const [toPath, toHash] = to ? to.split('#') : [];
            const selfLink = to && !external && toPath === pathname;
            return to ? (
              external ? (
                <a className="button button-primary" key={i} href={to}>
                  {label}
                </a>
              ) : (
                <Link
                  className="button button-primary"
                  key={i}
                  to={to}
                  onClick={
                    selfLink
                      ? (e) => scrollForSelfLink(e.currentTarget, toHash ? `#${toHash}` : '')
                      : undefined
                  }
                >
                  {label}
                </Link>
              )
            ) : (
              <span className="canonical-cta-label" key={i}>
                {label}
              </span>
            );
          })}
      </div>
    );
  }
  return <p data-source-paragraph={paragraph}>{text}</p>;
}
