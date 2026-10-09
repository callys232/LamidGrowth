import { useState, type ReactNode } from 'react';
import { AnimatePresence, m, useReducedMotion } from 'motion/react';
import { Link } from 'react-router-dom';
import { Clock, ListChecks, Play, ShieldCheck } from 'lucide-react';
import { SkeletonList } from '../../../../shared/ui/Skeleton';
import { useEngineRun } from '../../../engines/hooks/useEngineRun';
import { EngineForm } from '../../../engines/pages/EnginesPage';
import { EngineResultView } from '../../../engines/components/EngineResultView';
import type { FeaturedTool } from './featuredTools';

export const EASE = [0.22, 0.61, 0.36, 1] as const;

/** One tool, presented: why it helps beside a start card; once started, the benefits shrink to a
 * row and the real tool takes the full width. The tool only loads
 * once the visitor asks for it, then runs for real via POST /engines/:code/demo-run (no account,
 * no charge, nothing saved). */
export function DemoToolPanel({
  tool,
  startOpen = false,
}: {
  tool: FeaturedTool;
  startOpen?: boolean;
}) {
  const [open, setOpen] = useState(startOpen);
  const reduced = useReducedMotion();

  return (
    <div className={open ? 'demo-panel is-open' : 'demo-panel'}>
      <header className="demo-panel-head">
        <h2>{tool.name}</h2>
        <p className="demo-panel-hook">{tool.hook}</p>
      </header>

      <ol className="demo-panel-benefits">
        {tool.benefits.map((b, i) => (
          <m.li
            key={b.title}
            initial={reduced ? false : { opacity: 0, y: -16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.15 }}
            transition={{ duration: 0.45, delay: i * 0.08, ease: EASE }}
          >
            <span className="demo-panel-num" aria-hidden="true">
              {String(i + 1).padStart(2, '0')}
            </span>
            <strong>{b.title}</strong>
            <AnimatePresence initial={false}>
              {!open && (
                <m.span
                  className="demo-panel-body"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: reduced ? 0 : 0.35, ease: EASE }}
                >
                  {b.body}
                </m.span>
              )}
            </AnimatePresence>
          </m.li>
        ))}
      </ol>

      <m.div
        className="demo-panel-tool"
        initial={reduced ? false : { opacity: 0, y: -16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.5, delay: 0.15, ease: EASE }}
      >
        {open ? (
          <PushDown reduced={reduced}>
            <LiveTool code={tool.code} />
          </PushDown>
        ) : (
          <div className="demo-panel-start">
            <span className="demo-panel-badge">
              <span className="demo-panel-pulse" aria-hidden="true" /> Live · no account needed
            </span>
            <h3>Run it on your own situation</h3>
            <ul className="demo-panel-facts">
              <li>
                <Clock aria-hidden="true" size={16} /> About {tool.minutes} minutes
              </li>
              <li>
                <ListChecks aria-hidden="true" size={16} /> {tool.input}
              </li>
              <li>
                <ShieldCheck aria-hidden="true" size={16} /> Nothing saved, nothing charged
              </li>
            </ul>
            <button
              type="button"
              className="button button-primary demo-panel-cta"
              onClick={() => setOpen(true)}
            >
              <Play aria-hidden="true" size={16} /> Start {tool.name}
            </button>
            <dl className="demo-panel-notes">
              <div>
                <dt>Based on</dt>
                <dd>{tool.basedOn}</dd>
              </div>
              <div>
                <dt>Good to know</dt>
                <dd>{tool.limit}</dd>
              </div>
            </dl>
          </div>
        )}
      </m.div>
    </div>
  );
}

/** A gentle push-down: new content opens from the top and eases the page below it down. */
export function PushDown({ children, reduced }: { children: ReactNode; reduced: boolean | null }) {
  // Clip only while opening, so focus rings and growing forms aren't cut off afterwards.
  const [opened, setOpened] = useState(Boolean(reduced));
  return (
    <m.div
      style={{ overflow: opened ? 'visible' : 'hidden' }}
      initial={reduced ? false : { opacity: 0, height: 0, y: -12 }}
      animate={{ opacity: 1, height: 'auto', y: 0 }}
      transition={{ duration: 0.55, ease: EASE }}
      onAnimationComplete={() => setOpened(true)}
    >
      {children}
    </m.div>
  );
}

function LiveTool({ code }: { code: string }) {
  const { manifest, running, result, error, run } = useEngineRun(code, true);

  return (
    <div className="demo-panel-live">
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {!manifest ? (
        !error && <SkeletonList rows={4} />
      ) : result ? (
        <m.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: EASE }}
        >
          <EngineResultView result={result.result} />
          <div className="demo-panel-signup">
            <p>That’s a real, computed result — not a screenshot.</p>
            <p>Create an account to save it and unlock everything.</p>
            <Link className="button button-primary" to="/signup">
              Create your account
            </Link>
          </div>
        </m.div>
      ) : (
        <EngineForm
          manifest={manifest}
          submitting={running}
          // run() already surfaces the failure through `error`.
          onSubmit={(input) => void run(input).catch(() => {})}
        />
      )}
    </div>
  );
}
