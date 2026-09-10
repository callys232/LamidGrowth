import { Orbit } from 'lucide-react';
import type { ReactNode } from 'react';
export function Empty({
  title,
  children,
  action,
}: {
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <Orbit size={32} strokeWidth={1} />
      <h3>{title}</h3>
      <p>{children}</p>
      {action}
    </div>
  );
}
