import type { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { sourcePage } from '../content/sourcePage';
import { Eyebrow } from '../ui/Eyebrow';
import { MotionSurface } from '../visuals/Motion';
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
    <MotionSurface className="page-heading">
      <div>
        <Eyebrow>{eyebrow}</Eyebrow>
        <h1>{source?.title || title}</h1>
        <p>{source?.description || description}</p>
      </div>
      {children}
    </MotionSurface>
  );
}
