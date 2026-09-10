import { m, useReducedMotion } from 'motion/react';
import type { ReactNode } from 'react';
export function Button({
  children,
  onClick,
  variant = 'primary',
  disabled = false,
  type = 'button',
  className = '',
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'light';
  disabled?: boolean;
  type?: 'button' | 'submit';
  className?: string;
}) {
  const reduced = useReducedMotion();
  return (
    <m.button
      type={type}
      className={`button button-${variant} ${className}`}
      onClick={onClick}
      disabled={disabled}
      whileTap={reduced || disabled ? undefined : { scale: 0.985 }}
    >
      {children}
    </m.button>
  );
}
