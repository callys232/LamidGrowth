import { Link } from 'react-router-dom';
import { destinations } from './destinations';
export function CopyLine({ text, paragraph }: { text: string; paragraph: number }) {
  if (/^(CTA:|Links?:)/.test(text)) {
    return (
      <div className="canonical-ctas" data-source-paragraph={paragraph}>
        {text
          .replace(/^(CTA:|Links?:)\s*/, '')
          .split('|')
          .map((raw, i) => {
            const label = raw.trim();
            const to = destinations[label];
            return to ? (
              <Link className="button button-primary" key={i} to={to}>
                {label}
              </Link>
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
