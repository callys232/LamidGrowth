import type { ProductEngineItem } from './ProductSuitePage';

export type VectorKind =
  | 'flow'
  | 'wave'
  | 'network'
  | 'bars'
  | 'funnel'
  | 'matrix';

export type ShadeTone = 'sky' | 'teal' | 'emerald' | 'amber' | 'violet' | 'indigo';
export type PatternKind = 'grid' | 'diag' | 'dots' | 'arcs';

const SHADES: ShadeTone[] = ['sky', 'teal', 'emerald', 'amber', 'violet', 'indigo'];
const PATTERNS: PatternKind[] = ['grid', 'diag', 'dots', 'arcs'];

export function getCardShade(index: number): ShadeTone {
  return SHADES[index % SHADES.length];
}

export function getCardPattern(index: number): PatternKind {
  return PATTERNS[index % PATTERNS.length];
}

export function getVectorKind(code: string, index: number): VectorKind {
  const c = code.toUpperCase();
  if (c.startsWith('R0') || c.startsWith('G0')) return 'flow';
  if (c.startsWith('Q1') || c.startsWith('F0')) return 'wave';
  if (c.startsWith('Q2') || c.startsWith('Q4') || c.startsWith('S0')) return 'matrix';
  if (c.startsWith('A0') || c.startsWith('C0')) return 'network';
  if (c.startsWith('R1') || c.startsWith('R2')) return 'funnel';
  const fallbacks: VectorKind[] = ['flow', 'wave', 'network', 'bars', 'funnel', 'matrix'];
  return fallbacks[index % fallbacks.length];
}

export function EngineVectorThumb({
  code,
  index,
}: {
  code: string;
  index: number;
}) {
  const kind = getVectorKind(code, index);
  return (
    <div className="suite-vec-thumb" aria-hidden="true">
      <svg viewBox="0 0 44 44" fill="none">
        {kind === 'flow' && (
          <>
            <path d="M6 28C14 28 16 14 24 14C31 14 32 22 38 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="M6 34H38" stroke="currentColor" strokeWidth="1.2" strokeDasharray="3 3" opacity="0.45" />
            <circle cx="15" cy="21" r="2.5" fill="currentColor" />
            <circle cx="26" cy="15" r="2.5" fill="currentColor" />
            <circle cx="37" cy="18" r="2.5" stroke="currentColor" strokeWidth="1.8" fill="none" />
          </>
        )}
        {kind === 'wave' && (
          <>
            <path d="M6 12H38M6 32H38" stroke="currentColor" strokeWidth="1.2" strokeDasharray="3 3" opacity="0.45" />
            <path d="M6 24L13 18L20 26L27 14L34 21L38 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="27" cy="14" r="2.5" fill="currentColor" />
          </>
        )}
        {kind === 'network' && (
          <>
            <path d="M11 13L22 22M33 13L22 22M22 22L14 33M22 22L32 32" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            <circle cx="11" cy="13" r="3" stroke="currentColor" strokeWidth="1.6" />
            <circle cx="33" cy="13" r="3" stroke="currentColor" strokeWidth="1.6" />
            <circle cx="22" cy="22" r="3.5" fill="currentColor" />
            <circle cx="14" cy="33" r="2.5" stroke="currentColor" strokeWidth="1.6" />
            <circle cx="32" cy="32" r="2.5" stroke="currentColor" strokeWidth="1.6" />
          </>
        )}
        {kind === 'bars' && (
          <>
            <path d="M8 34V10M8 34H36" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" opacity="0.5" />
            <path d="M14 34V22M21 34V16M28 34V20M34 34V12" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
          </>
        )}
        {kind === 'funnel' && (
          <>
            <path d="M8 12H36L26 24V34L18 31V24L8 12Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
            <path d="M13 18H31" stroke="currentColor" strokeWidth="1.2" strokeDasharray="2.5 2.5" opacity="0.6" />
          </>
        )}
        {kind === 'matrix' && (
          <>
            <rect x="8" y="8" width="28" height="28" rx="5" stroke="currentColor" strokeWidth="1.6" opacity="0.65" />
            <path d="M22 8V36M8 22H36" stroke="currentColor" strokeWidth="1.2" strokeDasharray="2.5 2.5" opacity="0.55" />
            <circle cx="29" cy="15" r="3.2" fill="currentColor" />
            <circle cx="15" cy="28" r="2.4" stroke="currentColor" strokeWidth="1.6" />
          </>
        )}
      </svg>
    </div>
  );
}

export function EngineVectorSchematic({
  engine,
  index,
}: {
  engine: ProductEngineItem;
  index: number;
}) {
  const kind = getVectorKind(engine.code, index);
  return (
    <div className="suite-vec-schematic">
      <svg className="suite-vec-schematic-svg" viewBox="0 0 280 56" fill="none" aria-hidden="true">
        <path d="M12 46H268" stroke="currentColor" strokeWidth="1" strokeDasharray="3 4" opacity="0.35" />
        {kind === 'wave' || kind === 'flow' ? (
          <>
            <path
              d="M16 38C46 38 62 18 96 22C130 26 148 12 184 16C218 20 236 10 264 12"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
            />
            <circle cx="96" cy="22" r="3.5" fill="currentColor" />
            <circle cx="184" cy="16" r="3.5" fill="currentColor" />
            <circle cx="264" cy="12" r="4" stroke="currentColor" strokeWidth="2" fill="none" />
          </>
        ) : kind === 'network' || kind === 'matrix' ? (
          <>
            <path d="M28 28H92M112 28H176M196 28H252" stroke="currentColor" strokeWidth="1.6" strokeDasharray="4 3" />
            <rect x="16" y="14" width="28" height="28" rx="6" stroke="currentColor" strokeWidth="1.8" />
            <polygon points="102,10 120,28 102,46 84,28" stroke="currentColor" strokeWidth="1.8" />
            <rect x="176" y="14" width="28" height="28" rx="6" stroke="currentColor" strokeWidth="1.8" />
            <circle cx="256" cy="28" r="8" fill="currentColor" fillOpacity="0.22" stroke="currentColor" strokeWidth="1.8" />
          </>
        ) : (
          <>
            <path d="M24 44V26M56 44V18M88 44V30M120 44V14M152 44V22M184 44V12M216 44V16M248 44V10" stroke="currentColor" strokeWidth="4" strokeLinecap="round" opacity="0.82" />
          </>
        )}
      </svg>
      <div className="suite-vec-schematic-copy">
        <span>Computes</span>
        <strong>{engine.computes}</strong>
      </div>
    </div>
  );
}
