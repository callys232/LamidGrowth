import { Link } from 'react-router-dom';
export function Brand({ light = false, compact = false }: { light?: boolean; compact?: boolean }) {
  return (
    <Link className={`brand ${light ? 'brand-light' : ''}`} to="/" aria-label="LAMID ONE home">
      <span className="brand-mark">
        <span />
      </span>
      <span>
        LAMID <b>ONE</b>
        {!compact && <small>HUMAN JUDGMENT. INFINITE POSSIBILITY.</small>}
      </span>
    </Link>
  );
}
