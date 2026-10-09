import { useEffect, useRef, useState, type ComponentType } from 'react';
import { useInView, useReducedMotion } from 'motion/react';
import { Pause, Play } from 'lucide-react';
import { SIGNUP_DURATION, SignupVideo } from './demoVideos/SignupVideo';
import {
  FinanceVideo,
  OptionsVideo,
  PurposeVideo,
  RootCauseVideo,
  TOOL_DURATION,
} from './demoVideos/ToolVideos';
import type { VideoProps } from './demoVideos/timeline';

type Chapter = {
  key: string;
  label: string;
  caption: string;
  duration: number;
  Video: ComponentType<VideoProps>;
};

const CHAPTERS: Chapter[] = [
  {
    key: 'signup',
    label: 'Sign up',
    caption: 'From choosing your context to your first dashboard.',
    duration: SIGNUP_DURATION,
    Video: SignupVideo,
  },
  {
    key: 'S01',
    label: 'Purpose & Direction',
    caption: 'Six rated questions become a maturity score and a weakest area.',
    duration: TOOL_DURATION,
    Video: PurposeVideo,
  },
  {
    key: 'F01',
    label: 'Financial Health',
    caption: 'Two months of figures become margins, growth and revenue per head.',
    duration: TOOL_DURATION,
    Video: FinanceVideo,
  },
  {
    key: 'Q21',
    label: 'Option Comparison',
    caption: 'Weighted criteria pick a winner — and show how fragile the win is.',
    duration: TOOL_DURATION,
    Video: OptionsVideo,
  },
  {
    key: 'R25',
    label: 'Root Cause',
    caption: 'Candidate causes become a tested chain to the most probable root.',
    duration: TOOL_DURATION,
    Video: RootCauseVideo,
  },
];

/** "See it in motion": one screen that plays each chapter and moves on by itself, looping after
 * the last. Plays only while on screen and the tab is visible; the visitor can pause or jump to
 * any chapter. With reduced motion it shows each chapter's finished frame and never advances. */
export function DemoVideoPlayer() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.35 });
  const reduced = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [t, setT] = useState(0);
  const [paused, setPaused] = useState(false);
  const [tabVisible, setTabVisible] = useState(true);

  useEffect(() => {
    const onVisibility = () => setTabVisible(document.visibilityState === 'visible');
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  const chapter = CHAPTERS[index];
  const playing = !reduced && !paused && inView && tabVisible;

  // Playback time lives in a ref so the frame loop can advance chapters without side effects
  // inside a state updater; `t` mirrors it for rendering.
  const time = useRef(0);
  useEffect(() => {
    if (!playing) return;
    let frame: number;
    let last = performance.now();
    const tick = (now: number) => {
      time.current += now - last;
      last = now;
      if (time.current >= chapter.duration) {
        time.current = 0;
        setIndex((i) => (i + 1) % CHAPTERS.length);
      }
      setT(time.current);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, chapter.duration]);

  const go = (i: number) => {
    time.current = 0;
    setIndex(i);
    setT(0);
  };
  const shownT = reduced ? chapter.duration : t;
  const { Video } = chapter;

  return (
    <div className="dv-player" ref={ref}>
      <div className="dv-window" role="img" aria-label={`${chapter.label}: ${chapter.caption}`}>
        <div className="dv-window-bar" aria-hidden="true">
          <span />
          <span />
          <span />
          <strong>LAMID ONE</strong>
          <em>{chapter.label}</em>
        </div>
        <div className="dv-screen" aria-hidden="true">
          <Video key={chapter.key} t={shownT} />
        </div>
      </div>

      <div className="dv-controls">
        <p className="dv-caption" aria-live="polite">
          {chapter.caption}
        </p>
        {!reduced && (
          <button
            type="button"
            className="dv-pause"
            onClick={() => setPaused((p) => !p)}
            aria-label={paused ? 'Play the videos' : 'Pause the videos'}
          >
            {paused ? (
              <Play size={16} aria-hidden="true" />
            ) : (
              <Pause size={16} aria-hidden="true" />
            )}
          </button>
        )}
      </div>

      <ol className="dv-chapters">
        {CHAPTERS.map((c, i) => {
          const fill = i < index ? 1 : i > index ? 0 : Math.min(1, shownT / c.duration);
          return (
            <li key={c.key}>
              <button
                type="button"
                aria-current={i === index ? 'step' : undefined}
                onClick={() => go(i)}
              >
                <span className="dv-chapter-num">{String(i + 1).padStart(2, '0')}</span>
                <span className="dv-chapter-label">{c.label}</span>
                <span className="dv-chapter-track" aria-hidden="true">
                  <i style={{ transform: `scaleX(${fill})` }} />
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
