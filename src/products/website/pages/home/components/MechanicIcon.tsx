import type { ReactNode } from 'react';

/** Original line icons for the five How It Works mechanics, drawn in-house (no third-party
 * artwork). Every icon shares one 64×64 grid, one stroke weight and one accent, and renders in
 * the same square frame (.home-mechanics-icon in home.css), so the set reads as a family. */
const PATHS: Record<number, ReactNode> = {
  // 1. One Entry Point — several routes converge into a single portal.
  1: (
    <>
      <rect x="26" y="12" width="30" height="40" rx="9" />
      <path d="M6 16 L24 28 M6 32 H24 M6 48 L24 36" />
      <circle className="accent" cx="41" cy="32" r="7" />
    </>
  ),
  // 2. Guided Pathways — a route with waypoints that leads to a target.
  2: (
    <>
      <path className="dashed" d="M12 52 C 26 52 20 34 32 34 S 42 18 48 17" />
      <circle cx="12" cy="52" r="4" />
      <circle cx="32" cy="34" r="3" />
      <circle cx="50" cy="16" r="9" />
      <circle className="accent" cx="50" cy="16" r="4" />
    </>
  ),
  // 3. Integrated Workflows — separate pieces of work linked into one flow.
  3: (
    <>
      <rect x="6" y="8" width="20" height="14" rx="4" />
      <rect className="accent" x="38" y="25" width="20" height="14" rx="4" />
      <rect x="6" y="42" width="20" height="14" rx="4" />
      <path d="M26 15 C 34 15 32 32 38 32 M26 49 C 34 49 32 32 38 32" />
    </>
  ),
  // 4. Continuous Alignment — goals, actions and progress kept in line, in a loop.
  4: (
    <>
      {/* Clockwise loop from 3 o'clock round to 1 o'clock, arrowhead following the turn. */}
      <path d="M52 32 A 20 20 0 1 1 42 14.7" />
      <path d="M39.5 9.3 L42 14.7 L36 15.2" />
      <path d="M23 25 H41 M23 39 H41" />
      <path className="accent-stroke" d="M23 32 H37" />
    </>
  ),
  // 5. Human-Directed Intelligence — a person guides the intelligence, never the reverse.
  5: (
    <>
      <circle cx="22" cy="22" r="8" />
      <path d="M8 54 C 8 40 36 40 36 54" />
      <path className="dashed" d="M31 20 L44 20" />
      <path d="M48 20 L56 32 L46 40 Z" />
      <circle className="accent" cx="48" cy="20" r="3.5" />
      <circle className="accent" cx="56" cy="32" r="3.5" />
      <circle className="accent" cx="46" cy="40" r="3.5" />
    </>
  ),
};

export function MechanicIcon({ step }: { step: number }) {
  const art = PATHS[step];
  if (!art) return null;
  return (
    <span className="home-mechanics-icon" aria-hidden="true">
      <svg viewBox="0 0 64 64" width="46" height="46" focusable="false">
        {art}
      </svg>
    </span>
  );
}
