import { Link } from 'react-router-dom';
import { Mark } from './Mark';
export function Brand({ light = false, compact = false }: { light?: boolean; compact?: boolean }) {
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
