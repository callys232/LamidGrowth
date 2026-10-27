import './workflow-art.css';

interface NodeProps {
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  step: number;
  children?: React.ReactNode;
}

const stepStyle = (step: number) => ({ animationDelay: `${step * 1.2}s` });

function Node({ x, y, w, h, color, step, children }: NodeProps) {
  return (
    <g className="wf-node" style={stepStyle(step)}>
      <rect x={x} y={y} width={w} height={h} rx="10" className="wf-card" />
      <path d={`M${x + 1} ${y + 14} V${y + h - 14}`} stroke={color} className="wf-accent" />
      {children}
    </g>
  );
}

function Token({ path, begin }: { path: string; begin: number }) {
  return (
    <circle r="3.5" className="wf-token">
      <animateMotion
        dur="7.2s"
        begin={`${begin}s`}
        repeatCount="indefinite"
        path={path}
        keyPoints="0;1;1"
        keyTimes="0;0.14;1"
        calcMode="linear"
      />
      <animate
        attributeName="opacity"
        dur="7.2s"
        begin={`${begin}s`}
        repeatCount="indefinite"
        values="0;1;1;0;0"
        keyTimes="0;0.02;0.12;0.15;1"
      />
    </circle>
  );
}

export function WorkflowArt() {
  return (
    <svg className="wf-art" viewBox="0 0 520 420" aria-hidden="true" focusable="false">
      <defs>
        <pattern id="wf-grid" width="24" height="24" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="0.9" className="wf-grid-dot" />
        </pattern>
        <marker
          id="wf-arrow"
          viewBox="0 0 8 8"
          refX="6"
          refY="4"
          markerWidth="7"
          markerHeight="7"
          orient="auto-start-reverse"
        >
          <path d="M1 1 L6 4 L1 7" className="wf-arrow" />
        </marker>
        <clipPath id="wf-clip">
          <rect x="10" y="10" width="500" height="400" rx="14" />
        </clipPath>
      </defs>

      <rect x="10" y="10" width="500" height="400" rx="14" className="wf-panel" />
      <g clipPath="url(#wf-clip)">
        <rect x="10" y="48" width="500" height="362" fill="url(#wf-grid)" />
      </g>
      <circle cx="30" cy="29" r="3.5" className="wf-ghost" />
      <circle cx="44" cy="29" r="3.5" className="wf-ghost" />
      <circle cx="58" cy="29" r="3.5" className="wf-ghost" />
      <rect x="84" y="24" width="120" height="10" rx="5" className="wf-ghost" />
      <path d="M10 48 H510" className="wf-rule" />

      <g className="wf-lines">
        <path d="M184 122 H252" markerEnd="url(#wf-arrow)" />
        <path d="M348 122 H384" markerEnd="url(#wf-arrow)" />
        <path d="M300 172 V200 H109 V232" markerEnd="url(#wf-arrow)" />
        <path d="M300 172 V200 H260 V232" markerEnd="url(#wf-arrow)" />
        <path d="M436 156 V232" markerEnd="url(#wf-arrow)" />
      </g>

      <Node x={34} y={74} w={150} h={96} color="#c12129" step={0}>
        <rect x="52" y="92" width="64" height="7" rx="3.5" className="wf-ink" />
        <rect x="52" y="106" width="90" height="5" rx="2.5" className="wf-ghost" />
        <rect x="52" y="140" width="12" height="16" rx="2" className="wf-ghost" />
        <rect x="70" y="134" width="12" height="22" rx="2" className="wf-ghost" />
        <rect x="88" y="128" width="12" height="28" rx="2" className="wf-ghost" />
        <rect x="106" y="122" width="12" height="34" rx="2" className="wf-ghost" />
        <rect x="124" y="116" width="12" height="40" rx="2" fill="#c12129" className="wf-bar-up" />
      </Node>

      <g className="wf-node" style={stepStyle(1)}>
        <path d="M300 72 L348 122 L300 172 L252 122 Z" className="wf-card" />
        <g className="wf-icon" stroke="#2f6f73">
          <circle cx="300" cy="106" r="3" />
          <circle cx="288" cy="136" r="3" />
          <circle cx="312" cy="136" r="3" />
          <path d="M300 109 V120 M300 120 L289 133 M300 120 L311 133" />
        </g>
      </g>

      <Node x={384} y={88} w={104} h={68} color="#b8923a" step={2}>
        <rect x="384" y="88" width="104" height="68" rx="10" className="wf-gate-ring" />
        <path
          d="M436 100 l16 6 v10 c0 10 -6 17 -16 22 c-10 -5 -16 -12 -16 -22 v-10 z"
          className="wf-icon"
          stroke="#b8923a"
        />
        <path d="M429 116 l5 5 l9 -10" className="wf-icon" stroke="#b8923a" />
      </Node>

      <Node x={34} y={232} w={150} h={134} color="#6b7a3a" step={3}>
        <rect x="52" y="248" width="54" height="7" rx="3.5" className="wf-ink" />
        <g className="wf-icon" stroke="#6b7a3a">
          <rect x="52" y="270" width="14" height="14" rx="3" />
          <path d="M55 277 l3 3 l5 -6" />
          <rect x="52" y="296" width="14" height="14" rx="3" />
          <path d="M55 303 l3 3 l5 -6" />
        </g>
        <rect x="52" y="324" width="14" height="14" rx="3" className="wf-box" />
        <path d="M55 331 l3 3 l5 -6" className="wf-icon wf-tick" stroke="#6b7a3a" pathLength={1} />
        <rect x="76" y="274" width="80" height="6" rx="3" className="wf-ghost" />
        <rect x="76" y="300" width="60" height="6" rx="3" className="wf-ghost" />
        <rect x="76" y="328" width="70" height="6" rx="3" className="wf-ghost" />
      </Node>

      <Node x={205} y={232} w={110} h={134} color="#2f6f73" step={4}>
        <circle cx="260" cy="292" r="32" className="wf-track" />
        <circle cx="260" cy="292" r="32" className="wf-ring" />
        <path d="M260 278 v14 l9 5" className="wf-hand" />
        <rect x="236" y="340" width="48" height="6" rx="3" className="wf-ghost" />
      </Node>

      <g className="wf-node" style={stepStyle(5)}>
        <rect x="346" y="232" width="142" height="134" rx="10" className="wf-done" />
        <circle cx="417" cy="290" r="24" className="wf-done-ring" />
        <path d="M406 291 l8 8 l15 -17" className="wf-done-check" pathLength={1} />
        <rect x="383" y="334" width="68" height="6" rx="3" className="wf-done-bar" />
        <rect
          x="397"
          y="348"
          width="40"
          height="5"
          rx="2.5"
          className="wf-done-bar"
          opacity="0.5"
        />
      </g>

      <rect x="34" y="388" width="454" height="4" rx="2" className="wf-ghost" />
      <g className="wf-tokens">
        <Token path="M184 122 H252" begin={0.9} />
        <Token path="M348 122 H384" begin={2.1} />
        <Token path="M300 172 V200 H109 V232" begin={2.1} />
        <Token path="M300 172 V200 H260 V232" begin={2.1} />
        <Token path="M436 156 V232" begin={3.3} />
      </g>

      <g className="wf-progress">
        <rect x="34" y="388" width="150" height="4" rx="2" fill="#6b7a3a" />
        <rect x="184" y="388" width="140" height="4" fill="#2f6f73" />
        <rect x="324" y="388" width="164" height="4" rx="2" fill="#b8923a" />
      </g>
    </svg>
  );
}
