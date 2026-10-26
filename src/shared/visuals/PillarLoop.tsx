import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { outcome, pillars } from '../brand/pillars';
import './pillar-loop.css';

const SIZE = { w: 640, h: 340 };

// A lemniscate, so the loop reads as continuous: Decide, Build, Deliver, then round again.
function loopPath() {
  const a = 270;
  const points: string[] = [];
  for (let i = 0; i <= 240; i += 1) {
    const t = (i / 240) * Math.PI * 2;
    const d = 1 + Math.sin(t) ** 2;
    const x = SIZE.w / 2 + (a * Math.cos(t)) / d;
    const y = SIZE.h / 2 + (a * Math.sin(t) * Math.cos(t)) / d;
    points.push(`${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`);
  }
  return `${points.join(' ')}Z`;
}

export function PillarLoop({ interval = 3600 }: { interval?: number }) {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [nodes, setNodes] = useState<{ x: number; y: number }[]>([]);
  const path = useMemo(loopPath, []);
  const pathId = useId().replace(/:/g, '');
  const [calm] = useState(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  const pathRef = useRef<SVGPathElement>(null);
  const current = pillars[active];

  useEffect(() => {
    const el = pathRef.current;
    if (!el) return;
    const total = el.getTotalLength();
    setNodes(
      pillars.map((_, i) => {
        const point = el.getPointAtLength(((i + 0.5) / pillars.length) * total);
        return { x: point.x, y: point.y };
      }),
    );
  }, []);

  useEffect(() => {
    if (paused || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const timer = window.setInterval(() => setActive((i) => (i + 1) % pillars.length), interval);
    return () => window.clearInterval(timer);
  }, [paused, interval]);

  return (
    <figure
      className="pl"
      style={{ '--pl-color': current.color } as React.CSSProperties}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <svg viewBox={`0 0 ${SIZE.w} ${SIZE.h}`} role="img" aria-label="The LamidOne loop">
        <defs>
          <radialGradient id={`${pathId}-g`} cx="38%" cy="32%" r="80%">
            <stop offset="0%" stopColor="#f7f5f2" />
            <stop offset="60%" stopColor="#d9d4cd" />
            <stop offset="100%" stopColor="#a39c93" />
          </radialGradient>
        </defs>
        <path className="pl-track" d={path} />
        <path
          id={pathId}
          ref={pathRef}
          className="pl-run"
          d={path}
          pathLength={3}
          strokeDasharray="1 2"
          strokeDashoffset={-active}
        />
        <g className="pl-pulse" transform={`translate(${SIZE.w / 2} ${SIZE.h / 2})`}>
          <circle r="64" />
          <circle r="64" />
        </g>
        {!calm &&
          [0, 1].map((n) => (
            <circle key={n} className="pl-dot" r={n ? 4 : 6}>
              <animateMotion
                dur={n ? '11s' : '7s'}
                begin={n ? '-4s' : '0s'}
                repeatCount="indefinite"
                keyPoints={n ? '1;0' : '0;1'}
                keyTimes="0;1"
                calcMode="linear"
              >
                <mpath href={`#${pathId}`} />
              </animateMotion>
            </circle>
          ))}
        <g className="pl-core" transform={`translate(${SIZE.w / 2} ${SIZE.h / 2})`}>
          <circle className="pl-sphere" r="62" fill={`url(#${pathId}-g)`} />
          {[50, 40, 30, 21].map((r) => (
            <circle key={r} className="pl-ring" r={r} />
          ))}
          <circle className="pl-one" r="17" />
          <text textAnchor="middle" dy="3.5">
            ONE
          </text>
        </g>

        {nodes.map((node, i) => (
          <g
            key={pillars[i].id}
            className={i === active ? 'pl-node is-active' : 'pl-node'}
            transform={`translate(${node.x} ${node.y})`}
          >
            <circle r="15" />
            <text textAnchor="middle" dy="4">
              0{i + 1}
            </text>
          </g>
        ))}
      </svg>
      <figcaption>
        <div className="pl-tabs" role="group" aria-label="Pillars">
          {pillars.map((pillar, i) => (
            <button
              key={pillar.id}
              type="button"
              aria-pressed={i === active}
              className={i === active ? 'is-active' : undefined}
              style={{ '--pl-color': pillar.color } as React.CSSProperties}
              onClick={() => setActive(i)}
            >
              {pillar.verb}
            </button>
          ))}
        </div>
        <p className="pl-name" aria-live="polite">
          <strong>{current.name}</strong>
          <span>{current.tagline}</span>
        </p>
        <p className="pl-outcome">
          Leads to <em>{outcome.name}</em>
        </p>
      </figcaption>
    </figure>
  );
}
