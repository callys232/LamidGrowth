import { useState } from 'react';
import './talk-chapter.css';

interface Item {
  title: string;
  line: string;
}

/** Line icons, cycled by position, on a 24 grid. */
const icons = [
  <>
    <circle cx="12" cy="12" r="8" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="12" cy="12" r="0.8" />
  </>,
  <>
    <rect x="3" y="4" width="7" height="7" rx="2" />
    <rect x="14" y="4" width="7" height="7" rx="2" />
    <rect x="8.5" y="14" width="7" height="7" rx="2" />
  </>,
  <>
    <path d="M4 7h16M4 12h16M4 17h10" />
    <circle cx="18" cy="17" r="2" />
  </>,
  <>
    <path d="M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6-5.4-3-5.4 3 1.2-6L3.3 9.3l6.1-.7z" />
  </>,
  <>
    <path d="M4 18c3-9 7-9 8-4s5 3 8-8" />
  </>,
];
const Icon = ({ i, size = 22 }: { i: number; size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.7"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {icons[i % icons.length]}
  </svg>
);

/** Loop-style chapter: tag, accent headline, steady accordion beside a layered asset stage. */
export function TalkChapter({
  tag,
  headline,
  intro,
  items,
  clip,
  onCompose,
}: {
  onCompose?: () => void;
  tag: string;
  headline?: string;
  intro?: string;
  items: readonly Item[];
  clip?: string;
}) {
  const [open, setOpen] = useState(0);
  const [first = '', ...rest] = (headline ?? '').split(' ');
  return (
    <section className="tc" aria-label={tag}>
      <div className="tc-tag">
        <span>{tag}</span>
      </div>
      {headline && (
        <h2 className="tc-head">
          <em>{first}</em> {rest.join(' ')}
        </h2>
      )}
      {intro && <p className="tc-intro">{intro}</p>}
      {onCompose && (
        <button type="button" className="prod-btn prod-btn-solid tc-compose" onClick={onCompose}>
          Send inquiry
        </button>
      )}
      <div className="tc-body">
        <ul className="tc-list">
          {items.map((item, i) => (
            <li key={item.title}>
              <button
                type="button"
                aria-expanded={open === i}
                onClick={() => setOpen(i)}
                onMouseEnter={() => setOpen(i)}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
                  <path
                    d="M6 3l5 5-5 5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span className={`tc-ico c${i % 4}`}>
                  <Icon i={i} size={18} />
                </span>
                <h2>{item.title}</h2>
              </button>
              <div className="tc-more">
                <div>
                  <p>{item.line}</p>
                </div>
              </div>
            </li>
          ))}
        </ul>
        <div className="tc-stage" aria-hidden="true">
          {clip && (
            <video className="tc-clip" muted loop playsInline autoPlay preload="metadata">
              <source src={clip} type="video/webm" />
              <source src={clip.replace(/\.webm$/, '.mp4')} type="video/mp4" />
            </video>
          )}
          <svg className="tc-art" viewBox="0 0 400 320" preserveAspectRatio="xMidYMid slice">
            <circle cx="330" cy="60" r="90" />
            <circle cx="330" cy="60" r="54" />
            <circle cx="330" cy="60" r="22" />
            <path d="M-10 90c70-50 120 40 200-10" />
            <path d="M-10 120c70-50 120 40 200-10" />
            <circle cx="60" cy="40" r="4" />
            <circle cx="110" cy="70" r="3" />
            <circle cx="40" cy="100" r="3" />
          </svg>
          {items.map((item, i) => (
            <div key={item.title} className={`tc-card c${i % 4}${open === i ? ' is-on' : ''}`}>
              <span className="tc-card-ico">
                <Icon i={i} size={26} />
              </span>
              <strong>{item.title}</strong>
              <p>{item.line}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
