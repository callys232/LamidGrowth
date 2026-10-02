/** A vector echo of the hero video's closing skyline, drawn behind the slide that follows
 * the video. Colours come from CSS (home-video-hero.css) so the city starts in the hero's
 * dark tone and dissolves into the page background as the hero scrolls away. */

const WIDTH = 1440;
const HEIGHT = 420;

type Tower = { x: number; w: number; h: number };

/** Deterministic pseudo-random sequence so the skyline is identical on every render. */
function sequence(seed: number) {
  let value = seed;
  return () => {
    value = (value * 9301 + 49297) % 233280;
    return value / 233280;
  };
}

function farTowers(): Tower[] {
  const random = sequence(7);
  const towers: Tower[] = [];
  for (let x = -20; x < WIDTH;) {
    const w = 28 + random() * 46;
    towers.push({ x, w, h: 70 + random() * 120 });
    x += w + 4 + random() * 10;
  }
  return towers;
}

/** The taller midground glass and stone towers seen from the office window. */
const nearTowers: Tower[] = [
  { x: 40, w: 74, h: 190 },
  { x: 128, w: 58, h: 238 },
  { x: 200, w: 86, h: 206 },
  { x: 318, w: 54, h: 300 },
  { x: 384, w: 40, h: 262 },
  { x: 536, w: 62, h: 284 },
  { x: 612, w: 70, h: 214 },
  { x: 676, w: 50, h: 270 },
  { x: 742, w: 82, h: 188 },
  { x: 838, w: 66, h: 232 },
  { x: 922, w: 52, h: 286 },
  { x: 990, w: 60, h: 246 },
  { x: 1150, w: 64, h: 258 },
  { x: 1228, w: 88, h: 204 },
  { x: 1330, w: 70, h: 236 },
];

function base(h: number) {
  return HEIGHT - h;
}

export function HomeSkyline() {
  const far = farTowers();
  return (
    <div className="home-skyline" aria-hidden="true">
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} preserveAspectRatio="xMidYMax slice">
        <defs>
          <pattern id="home-skyline-windows" width="9" height="12" patternUnits="userSpaceOnUse">
            <rect className="home-skyline-window" x="2" y="3" width="4" height="6" />
          </pattern>
        </defs>

        {/* Distant city and river line */}
        <g className="home-skyline-far">
          {far.map((t) => (
            <rect key={t.x} x={t.x} y={base(t.h)} width={t.w} height={t.h} />
          ))}
        </g>
        <line className="home-skyline-river" x1="0" x2={WIDTH} y1={HEIGHT - 64} y2={HEIGHT - 64} />

        {/* Midground towers with window grids */}
        <g className="home-skyline-near">
          {nearTowers.map((t) => (
            <g key={t.x}>
              <rect x={t.x} y={base(t.h)} width={t.w} height={t.h} />
              <rect
                className="home-skyline-grid"
                x={t.x + 4}
                y={base(t.h) + 8}
                width={t.w - 8}
                height={t.h - 8}
                fill="url(#home-skyline-windows)"
              />
            </g>
          ))}
        </g>

        {/* Stepped art-deco tower with a spire, like the one left of centre in the video */}
        <g className="home-skyline-landmark">
          <rect x="434" y={base(220)} width="84" height="220" />
          <rect x="448" y={base(282)} width="56" height="62" />
          <rect x="460" y={base(328)} width="32" height="46" />
          <rect x="469" y={base(352)} width="14" height="24" />
          <line x1="476" x2="476" y1={base(352)} y2={base(398)} />
          <rect
            className="home-skyline-grid"
            x="440"
            y={base(214)}
            width="72"
            height="206"
            fill="url(#home-skyline-windows)"
          />
        </g>

        {/* Tapered glass tower with an antenna, the tallest on the right of the video */}
        <g className="home-skyline-landmark">
          <polygon points={`1052,${HEIGHT} 1128,${HEIGHT} 1112,${base(372)} 1068,${base(372)}`} />
          <polyline
            className="home-skyline-facet"
            points={`1052,${HEIGHT} 1090,${base(372)} 1128,${HEIGHT}`}
          />
          <rect x="1078" y={base(386)} width="24" height="14" />
          <line x1="1090" x2="1090" y1={base(386)} y2={base(418)} />
        </g>
      </svg>
    </div>
  );
}
