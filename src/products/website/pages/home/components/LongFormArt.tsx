/** Animated line illustrations for the homepage long-form cards, drawn in-house (no third-party
 * artwork). Purely decorative: motion is slow and low-contrast so it never competes with the copy,
 * and it holds still with reduced motion (home.css). One per card, in card order. */

// 1 · "Growth feels complicated. It doesn't have to." — a tangle resolves into one clear path.
const RESOLVE = 'M150 92 C 190 92 220 70 252 62 S 290 50 300 46';
// 2 · "A guided environment built around how humans grow." — a guided, rising path.
const GUIDED = 'M20 160 C 80 160 92 118 140 116 S 204 70 248 64 S 286 40 300 32';
// 3 · "Human-directed intelligence." — intelligence orbits the person, never the reverse.
const ORBIT = 'M70 100 A 90 52 0 1 1 250 100 A 90 52 0 1 1 70 100';

export function LongFormArt({ index }: { index: number }) {
  return (
    <svg className="lf-art" viewBox="0 0 320 180" aria-hidden="true" focusable="false">
      {index === 0 && (
        <>
          <path
            className="lf-draw"
            d="M20 120 C 40 40 70 160 92 84 S 124 30 112 112 S 140 150 150 92"
          />
          <path className="lf-base" d={RESOLVE} />
          <path className="lf-flow" d={RESOLVE} />
          <circle className="lf-node" cx="20" cy="120" r="4" />
          <circle className="lf-ring lf-pulse" cx="300" cy="46" r="12" />
          <circle className="lf-accent" cx="300" cy="46" r="5" />
          <circle className="lf-traveller" r="4" style={{ offsetPath: `path('${RESOLVE}')` }} />
        </>
      )}
      {index === 1 && (
        <>
          <path className="lf-faint" d="M20 170 H300 M20 130 H300 M20 90 H300 M20 50 H300" />
          <path className="lf-base" d={GUIDED} />
          <path className="lf-flow" d={GUIDED} />
          {[
            [20, 160],
            [140, 116],
            [248, 64],
          ].map(([cx, cy]) => (
            <circle key={cx} className="lf-node" cx={cx} cy={cy} r="5" />
          ))}
          <circle className="lf-ring lf-pulse" cx="300" cy="32" r="14" />
          <circle className="lf-ring lf-pulse lf-delay" cx="300" cy="32" r="22" />
          <circle className="lf-accent" cx="300" cy="32" r="6" />
          <circle className="lf-traveller" r="4.5" style={{ offsetPath: `path('${GUIDED}')` }} />
        </>
      )}
      {index === 2 && (
        <>
          <path className="lf-base lf-dashed" d={ORBIT} />
          {[
            [70, 100],
            [130, 51],
            [215, 58],
            [244, 120],
            [110, 146],
          ].map(([x, y]) => (
            <g key={x}>
              <path className="lf-spoke" d={`M160 100 L${x} ${y}`} />
              <circle className="lf-node" cx={x} cy={y} r="4.5" />
            </g>
          ))}
          <circle className="lf-person" cx="160" cy="88" r="11" />
          <path className="lf-person" d="M140 122 C 140 104 180 104 180 122" />
          <circle className="lf-traveller" r="5" style={{ offsetPath: `path('${ORBIT}')` }} />
        </>
      )}
    </svg>
  );
}
