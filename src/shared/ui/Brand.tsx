import { Link } from 'react-router-dom';
import { Mark } from './Mark';
import './brand-logo.css';
export function Brand({
  light = false,
  compact = false,
  logo = false,
}: {
  light?: boolean;
  compact?: boolean;
  logo?: boolean;
}) {
  if (logo) {
    // Ink lettering on light backgrounds, white lettering on dark ones; brand-logo.css picks
    // the right one for the current theme (the footer is always dark).
    const alt = 'LAMID Consulting — International Management Consultants';
    return (
      <Link className="brand brand-logo" to="/" aria-label="LAMID ONE home">
        <img
          className="brand-logo-ink"
          src="/brand/lamid-logo-ink.png"
          alt={alt}
          width={1333}
          height={414}
        />
        <img
          className="brand-logo-white"
          src="/brand/lamid-logo.png"
          alt=""
          width={1333}
          height={414}
        />
      </Link>
    );
  }
  return (
    <Link className={`brand ${light ? 'brand-light' : ''}`} to="/" aria-label="LAMID ONE home">
      <Mark className="brand-mark" size={32} />
      <span>
        LAMID <b>ONE</b>
        {!compact && <small>HUMAN JUDGMENT. INFINITE POSSIBILITY.</small>}
      </span>
    </Link>
  );
}
