import type { HTMLMotionProps } from 'motion/react';
import { LazyMotion, MotionConfig, domAnimation, m, useReducedMotion } from 'motion/react';
import type { ReactNode } from 'react';

export function MotionProvider({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={domAnimation} strict>
      <MotionConfig
        reducedMotion="user"
        transition={{ type: 'tween', duration: 0.28, ease: [0.22, 0.61, 0.36, 1] }}
      >
        {children}
      </MotionConfig>
    </LazyMotion>
  );
}

/** A small entrance signals new context; never loops or delays interaction. */
export function MotionSurface({ children, className = '', ...props }: HTMLMotionProps<'div'>) {
  const reduced = useReducedMotion();
  return (
    <m.div
      {...props}
      className={className}
      initial={reduced ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduced ? 0 : 0.32 }}
    >
      {children}
    </m.div>
  );
}
