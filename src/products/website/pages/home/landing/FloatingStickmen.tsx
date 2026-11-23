import { useEffect, useRef } from 'react';

type PathType = 'ellipse' | 'tilted' | 'figure8';

interface Runner {
  sz: number;
  alpha: number;
  path: PathType;
  t0: number;
  dir: number;
  scale: number;
  accent?: boolean;
}

const RUNNERS: Runner[] = [
  { sz: 11, alpha: 0.44, path: 'ellipse', t0: 0, dir: 1, scale: 0.96 },
  { sz: 9, alpha: 0.36, path: 'tilted', t0: Math.PI * 0.55, dir: 1, scale: 0.86, accent: true },
  { sz: 8.5, alpha: 0.3, path: 'figure8', t0: Math.PI, dir: 1, scale: 0.82 },
  { sz: 10, alpha: 0.34, path: 'ellipse', t0: Math.PI * 0.35, dir: -1, scale: 0.72, accent: true },
  { sz: 7.5, alpha: 0.26, path: 'tilted', t0: Math.PI * 1.4, dir: 1, scale: 0.78 },
];

function pathPos(
  type: PathType,
  t: number,
  cx: number,
  cy: number,
  width: number,
  height: number,
  scale = 1,
) {
  const rx = width * 0.42 * scale;
  const ry = height * 0.34 * scale;

  function raw(a: number) {
    if (type === 'ellipse') {
      return { x: cx + Math.cos(a) * rx, y: cy + Math.sin(a) * ry };
    }
    if (type === 'tilted') {
      const tilt = 0.46;
      const ex = Math.cos(a) * rx * 0.72;
      const ey = Math.sin(a) * ry * 0.58;
      return {
        x: cx + ex * Math.cos(tilt) - ey * Math.sin(tilt),
        y: cy + ex * Math.sin(tilt) + ey * Math.cos(tilt),
      };
    }
    const sc = 1 / (1 + Math.sin(a) ** 2);
    return {
      x: cx + rx * 0.85 * Math.cos(a) * sc,
      y: cy + ry * 0.65 * Math.sin(a) * Math.cos(a) * sc,
    };
  }

  const p = raw(t);
  const p1 = raw(t + 0.01);
  return { ...p, facingRight: p1.x >= p.x };
}

function drawRunner(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  phase: number,
  sz: number,
  strokeColor: string,
  facingRight: boolean,
) {
  const stride = Math.sin(phase);
  const legA = stride * 0.62;
  const armA = -stride * 0.54;
  const bounce = Math.abs(stride) * sz * 0.22;

  ctx.save();
  ctx.translate(x, y - bounce);
  if (!facingRight) ctx.scale(-1, 1);

  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = Math.max(sz * 0.14, 1.25);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Head
  ctx.beginPath();
  ctx.arc(0, -sz * 2.9, sz * 0.5, 0, Math.PI * 2);
  ctx.stroke();

  // Torso
  ctx.beginPath();
  ctx.moveTo(0, -sz * 2.4);
  ctx.lineTo(sz * 0.14, -sz * 0.85);
  ctx.stroke();

  // Arms
  ctx.beginPath();
  ctx.moveTo(sz * 0.06, -sz * 2.15);
  ctx.lineTo(sz * 0.06 + Math.sin(armA) * sz * 0.9, -sz * 2.15 + Math.cos(armA) * sz * 0.85);
  ctx.moveTo(sz * 0.06, -sz * 2.15);
  ctx.lineTo(sz * 0.06 - Math.sin(armA) * sz * 0.9, -sz * 2.15 + Math.cos(-armA) * sz * 0.85);
  ctx.stroke();

  // Legs
  const hipX = sz * 0.14;
  const hipY = -sz * 0.85;
  ctx.beginPath();
  ctx.moveTo(hipX, hipY);
  ctx.lineTo(hipX + Math.sin(legA) * sz * 1.15, hipY + Math.cos(legA) * sz * 1.15);
  ctx.moveTo(hipX, hipY);
  ctx.lineTo(hipX - Math.sin(legA) * sz * 1.15, hipY + Math.cos(-legA) * sz * 1.15);
  ctx.stroke();

  ctx.restore();
}

function isDarkTheme() {
  const theme = document.documentElement.dataset.theme;
  if (theme === 'dark') return true;
  if (theme === 'light') return false;
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
}

/** Floating stickman runners inspired by ProdLamid's HeroStickmen, adapted for the closing slide. */
export function FloatingStickmen() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    let raf = 0;
    let frame = 0;

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = parent.clientWidth;
      const h = parent.clientHeight;
      canvas.width = Math.max(1, Math.floor(w * dpr));
      canvas.height = Math.max(1, Math.floor(h * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const drawFrame = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const width = parent.clientWidth;
      const height = parent.clientHeight;
      ctx.clearRect(0, 0, width, height);

      const dark = isDarkTheme();
      const cx = width * 0.5;
      const cy = height * 0.52;

      // Subtle floating geometric accents
      ctx.save();
      ctx.strokeStyle = dark ? 'rgba(147, 197, 253, 0.14)' : 'rgba(13, 26, 43, 0.10)';
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 11]);
      ctx.beginPath();
      ctx.ellipse(cx, cy, width * 0.4, height * 0.32, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();

      const tBase = frame * 0.0024;
      for (let i = 0; i < RUNNERS.length; i++) {
        const r = RUNNERS[i];
        const t = r.t0 + tBase * r.dir;
        const pos = pathPos(r.path, t, cx, cy, width, height, r.scale);
        const color = r.accent
          ? dark
            ? `rgba(243, 200, 106, ${r.alpha})`
            : `rgba(193, 33, 41, ${r.alpha})`
          : dark
            ? `rgba(238, 241, 245, ${r.alpha})`
            : `rgba(13, 26, 43, ${r.alpha})`;
        drawRunner(ctx, pos.x, pos.y, frame * 0.08 + i * 1.4, r.sz, color, pos.facingRight);
      }
    };

    drawFrame();
    if (!reduceMotion) {
      const tick = () => {
        frame += 1;
        drawFrame();
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return <canvas ref={canvasRef} className="lg-stickmen-canvas" aria-hidden="true" />;
}
