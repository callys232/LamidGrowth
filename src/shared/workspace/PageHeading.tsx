import type { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { sourcePage } from '../content/sourcePage';
import { Eyebrow } from '../ui/Eyebrow';
import { MotionSurface } from '../visuals/Motion';

/** A workspace page's heading in the shared page-header style (see ui/PageHeader): eyebrow with the
 * tool's domain colour, title and description from canonical copy when present, and actions. */
export function PageHeading({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children?: ReactNode;
}) {
  const source = sourcePage(useLocation().pathname);
  return (
    <MotionSurface className="ws-page-header">
      <div className="ws-page-header-top">
        <div className="ws-page-header-copy">
          <Eyebrow>{eyebrow}</Eyebrow>
          <h1>{source?.title || title}</h1>
          <p>{source?.description || description}</p>
        </div>
        {children && <div className="ws-page-header-actions">{children}</div>}
      </div>
    </MotionSurface>
  );
}
