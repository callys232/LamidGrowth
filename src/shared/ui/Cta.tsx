import { ArrowUpRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
export function Cta({
  children,
  to,
  secondary = false,
}: {
  children: ReactNode;
  to: string;
  secondary?: boolean;
}) {
  return (
    <Link className={`button button-${secondary ? 'secondary' : 'primary'}`} to={to}>
      {children}
      <ArrowUpRight size={16} />
    </Link>
  );
}
