import { Link } from 'react-router-dom';
import './brand-logo.css';

export function Brand({
  light = false,
  compact: _compact = false,
  logo = false,
  full = false,
}: {
  light?: boolean;
  compact?: boolean;
  logo?: boolean;
  full?: boolean;
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

  if (full) {
    return (
      <Link className="brand brand-lamidone-full" to="/" aria-label="LAMID ONE home">
        <img
          className="brand-full-logo-img"
          src="/brand/lamidone-full-logo.png"
          alt="LAMID ONE"
          width={958}
          height={182}
        />
      </Link>
    );
  }

  return (
    <Link className={`brand brand-icon-alone ${light ? 'brand-light' : ''}`} to="/" aria-label="LAMID ONE home">
      <img
        className="brand-icon-alone-img"
        src="/brand/lamidone-icon.png"
        alt="LAMID ONE"
        width={40}
        height={40}
      />
    </Link>
  );
}
