/**
 * The LAMID ONE monogram — inline SVG rather than a static file (was
 * `<img src="/favicon.svg">`), so it costs no separate network request and
 * can be resized/reused consistently from code, the same reasoning behind
 * LamidOne's `components/ui/Mark.tsx`. `/public/favicon.svg` stays as its
 * own file for the actual browser-tab favicon — that use case still needs
 * a real file — this component is for everywhere the mark appears in the UI.
 *
 * Geometry and gradients are unchanged from the original favicon.svg: a red
 * "L" with a silver-white highlight on the foot. Kept as a fixed brand-red
 * gradient rather than switched to `currentColor` — the signature red stays
 * red in both themes by design (see design-system.css's --signature-red,
 * which is likewise never redefined per theme).
 */
import { useId } from 'react';

export function Mark({
  className = 'brand-mark',
  size = 32,
  title,
}: {
  className?: string;
  size?: number;
  /** Provide only when the mark stands alone with no adjacent wordmark. */
  title?: string;
}) {
  // SVG ids must be unique per document, not per element — this same component renders more than
  // once on most pages (header, footer, widget), so fixed ids on the gradients/clip path would
  // collide and every instance after the first would silently render with whichever definition
  // the browser resolves the duplicate id to. useId() scopes them per render instead.
  // React's useId() includes colons (e.g. ":r0:"), which are unreliable inside an SVG url(#...)
  // fragment reference across browsers — stripped here so the generated ids are plain [-\w] text.
  const uid = useId().replace(/:/g, '');
  const red = `mark-red-${uid}`;
  const white = `mark-white-${uid}`;
  const letter = `mark-letter-${uid}`;
  const clip = `mark-letter-clip-${uid}`;
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 32 32"
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      xmlns="http://www.w3.org/2000/svg"
    >
      {title && <title>{title}</title>}
      <defs>
        <linearGradient id={red} x1="0" y1="0" x2="1" y2="0.7">
          <stop stopColor="#F15A60" />
          <stop offset="0.4" stopColor="#C12129" />
          <stop offset="1" stopColor="#8E1420" />
        </linearGradient>
        <linearGradient id={white} x1="0" y1="0" x2="0.25" y2="1">
          <stop stopColor="#FFFFFF" />
          <stop offset="0.48" stopColor="#F5F8FC" />
          <stop offset="1" stopColor="#A8B9CB" />
        </linearGradient>
        <path
          id={letter}
          d="M7 3.5h4.4q1 0 1 1v16.2q0 1 1 1h9.1q1 0 1 1v4.8q0 1-1 1H7q-1 0-1-1v-23q0-1 1-1Z"
        />
        <clipPath id={clip}>
          <use href={`#${letter}`} />
        </clipPath>
      </defs>
      <use href={`#${letter}`} fill={`url(#${red})`} />
      <g clipPath={`url(#${clip})`}>
        <path d="M12.4 21.7H25v8H7.8Z" fill={`url(#${white})`} />
        <path d="m12.4 21.7-3.91 6.8" fill="none" stroke="#FFFFFF" strokeOpacity=".35" strokeWidth=".35" />
      </g>
      <use href={`#${letter}`} fill="none" stroke="#FFFFFF" strokeOpacity=".18" strokeWidth=".35" />
      <rect x="15.9" y="14.6" width="7.6" height="4.2" rx=".6" fill={`url(#${white})`} opacity=".48" />
    </svg>
  );
}
