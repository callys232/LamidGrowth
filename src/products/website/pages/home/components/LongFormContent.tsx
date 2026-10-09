import type { ReactNode } from 'react';
import { Compass, Layers3, ListChecks } from 'lucide-react';
import type { CopySection } from '../../../../../shared/content/types';
import { LongFormArt } from './LongFormArt';

/** Opened layouts for the homepage long-form cards. The copy is the source copy word for word
 * (content.json, each piece keeping its data-source-paragraph); only its presentation varies — a
 * lead, short beats, tags, term cards, a product window and a pull-quote — so the reading rhythm
 * changes as you go instead of running as one block of paragraphs. */
type Line = CopySection['paragraphs'][number];

const src = (line: Line) => ({ 'data-source-paragraph': line.sourceParagraph });
/** Split a line of short sentences ("No noise. No overwhelm.") into its sentences, verbatim. */
const sentences = (text: string) => text.match(/[^.]+\./g)?.map((s) => s.trim()) ?? [text];
const bullet = (text: string) => text.replace(/^-\s*/, '');

function Window({ index, children }: { index: number; children?: ReactNode }) {
  return (
    <div className="lfc-window">
      <div className="lfc-window-bar" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <div className="lfc-window-body">
        <div className="lfc-screen">
          <LongFormArt index={index} />
        </div>
        {children}
      </div>
    </div>
  );
}

/** 1 · Growth feels complicated. It doesn't have to. */
function Complicated({ p }: { p: Line[] }) {
  const [, lead, intro, a, b, c, beats, close] = p;
  return (
    <div className="lfc lfc-split">
      <div className="lfc-col">
        <p className="lfc-lead" {...src(lead)}>
          {lead.text}
        </p>
        <ul className="lfc-beats" {...src(beats)}>
          {sentences(beats.text).map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
        <blockquote className="lfc-quote" {...src(close)}>
          {close.text}
        </blockquote>
      </div>
      <Window index={0}>
        <p className="lfc-window-label" {...src(intro)}>
          {intro.text}
        </p>
        <ul className="lfc-checks">
          {[a, b, c].map((line) => (
            <li key={line.sourceParagraph} {...src(line)}>
              {bullet(line.text)}
            </li>
          ))}
        </ul>
      </Window>
    </div>
  );
}

const PILLAR_ICONS = { Clarity: Compass, Capability: Layers3, Execution: ListChecks } as const;

/** 2 · A guided environment built around how humans grow. */
function Guided({ p }: { p: Line[] }) {
  const [, nots, lead, intro, ...rest] = p;
  const pillars = rest.slice(0, 3);
  const close = rest[3];
  return (
    <div className="lfc">
      <div className="lfc-split">
        <div className="lfc-col">
          <ul className="lfc-nots" {...src(nots)}>
            {sentences(nots.text).map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
          <p className="lfc-lead" {...src(lead)}>
            {lead.text}
          </p>
        </div>
        <Window index={1} />
      </div>
      <p className="lfc-label" {...src(intro)}>
        {intro.text}
      </p>
      <ul className="lfc-pillars">
        {pillars.map((line) => {
          const [term, ...words] = line.text.split(' ');
          const Icon = PILLAR_ICONS[term as keyof typeof PILLAR_ICONS] ?? Compass;
          return (
            <li key={line.sourceParagraph} {...src(line)}>
              <span className="lfc-pillar-icon" aria-hidden="true">
                <Icon size={20} strokeWidth={1.6} />
              </span>
              <strong>{term}</strong> <span>{words.join(' ')}</span>
            </li>
          );
        })}
      </ul>
      <p className="lfc-stack" {...src(close)}>
        {sentences(close.text).map((s) => (
          <span key={s}>{s}</span>
        ))}
      </p>
    </div>
  );
}

/** 3 · Human-directed intelligence. */
function Directed({ p }: { p: Line[] }) {
  const [, shoulds, lead, intro, ...rest] = p;
  const principles = rest.slice(0, 5);
  const close = rest[5];
  return (
    <div className="lfc lfc-split lfc-split-reverse">
      <div className="lfc-col">
        <p className="lfc-stack lfc-stack-sm" {...src(shoulds)}>
          {sentences(shoulds.text).map((s) => (
            <span key={s}>{s}</span>
          ))}
        </p>
        <p className="lfc-lead" {...src(lead)}>
          {lead.text}
        </p>
        <blockquote className="lfc-quote" {...src(close)}>
          {close.text}
        </blockquote>
      </div>
      <Window index={2}>
        <p className="lfc-window-label" {...src(intro)}>
          {intro.text}
        </p>
        <ul className="lfc-principles">
          {principles.map((line) => {
            const [chosen, over] = bullet(line.text).split(' over ');
            return (
              <li key={line.sourceParagraph} {...src(line)}>
                <strong>{chosen}</strong> <em>over</em> <span>{over}</span>
              </li>
            );
          })}
        </ul>
      </Window>
    </div>
  );
}

const LAYOUTS = [Complicated, Guided, Directed];

export function LongFormContent({ section, index }: { section: CopySection; index: number }) {
  const Layout = LAYOUTS[index];
  return Layout ? <Layout p={section.paragraphs} /> : null;
}
