import { outcome, pillars } from './pillars';
import './brand.css';

const stops = [...pillars, outcome];

/** The Path motif: one continuous line through Decide, Build, Deliver and the outcome, Grow. */
export function PathLine({ title = 'Decide, build, deliver, grow' }: { title?: string }) {
  const xs = [90, 297, 503, 710];
  return (
    <svg className="brand-path" viewBox="0 0 800 120" role="img" aria-label={title}>
      <path className="brand-path-line" d="M 40 50 H 760" />
      {stops.map((pillar, i) => (
        <path
          key={pillar.id}
          className="brand-path-progress"
          pathLength={1}
          stroke={pillar.color}
          d={`M ${i === 0 ? 40 : xs[i] - 105} 50 H ${xs[i]}`}
          style={{ animationDelay: `${i * 0.5}s` }}
        />
      ))}
      {stops.map((pillar, i) => (
        <g key={pillar.id}>
          <circle className="brand-path-node" cx={xs[i]} cy={50} r={11} stroke={pillar.color} />
          <text className="brand-path-label" x={xs[i]} y={88} textAnchor="middle">
            {pillar.verb}
          </text>
          <text className="brand-path-sub" x={xs[i]} y={106} textAnchor="middle">
            {pillar.name}
          </text>
        </g>
      ))}
    </svg>
  );
}
