import type { ReactNode } from 'react';
import type { Domain } from '../domains';

/** A small status label tinted with a domain colour, or neutral grey. */
export function StatusPill({ tone, children }: { tone: Domain | 'neutral'; children: ReactNode }) {
  return (
    <span className="ws-pill" data-domain={tone === 'neutral' ? undefined : tone}>
      {children}
    </span>
  );
}
