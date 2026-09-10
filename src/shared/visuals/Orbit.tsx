import { useReducedMotion } from 'motion/react';
import { useEffect, useRef } from 'react';

export function OrbitVisual({ small = false }: { small?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  useEffect(() => {
    const host = ref.current;
    if (!host) return;
    let disposed = false;
    let cleanup: (() => void) | undefined;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        void import('./createOrbitScene')
          .then(({ createOrbitScene }) => {
            if (!disposed) cleanup = createOrbitScene(host, Boolean(reduced));
          })
          .catch(() => {
            if (!disposed) host.dataset.renderer = 'fallback';
          });
      },
      { rootMargin: '80px' },
    );
    observer.observe(host);
    return () => {
      disposed = true;
      observer.disconnect();
      cleanup?.();
    };
  }, [reduced]);
  return (
    <div
      ref={ref}
      className={`orbit-visual ${small ? 'orbit-small' : ''}`}
      aria-label="Context, intelligence, and authorized work connected around human judgment"
      role="img"
    >
      <div className="orbit-grid" />
      <div className="orbit-coordinate coord-top">CONTEXT IN MOTION</div>
      <div className="orbit-coordinate coord-bottom">HUMAN JUDGMENT AT THE CENTER</div>
      <div className="orbital orbital-outer" />
      <div className="orbital orbital-middle" />
      <div className="orbital orbital-inner" />
      <div className="orbit-sphere">
        <div className="sphere-ring ring-one" />
        <div className="sphere-ring ring-two" />
        <div className="sphere-ring ring-three" />
        <span className="one-core">ONE</span>
      </div>
      <span className="three-core-label" aria-hidden="true">
        ONE
      </span>
      <span className="orbit-dot dot-one" />
      <span className="orbit-dot dot-two" />
      <span className="orbit-dot dot-three" />
      <div className="orbit-label label-context">
        <span className="live-dot" /> Clarity
        <span className="orbit-label-sub">Understand what matters</span>
      </div>
      <div className="orbit-label label-capability">
        <span className="gold-dot" /> Capability
        <span className="orbit-label-sub">Build what comes next</span>
      </div>
      <div className="orbit-label label-consistency">
        <span className="blue-dot" /> Consistency
        <span className="orbit-label-sub">Keep progress moving</span>
      </div>
      <div className="orbit-caption">
        <span>01 — 03</span>
        <span>
          ONE CONTINUOUS CYCLE <span>↗</span>
        </span>
      </div>
    </div>
  );
}
