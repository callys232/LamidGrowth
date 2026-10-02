import {
  ChevronDown,
  Compass,
  Layers3,
  LineChart,
  ShieldCheck,
  Sparkles,
  Target,
  Users,
  Workflow,
} from 'lucide-react';
import { useId, useState, type ReactNode } from 'react';
import { CopyLine } from '../CopyLine';
import type { CopySection, DocumentPageProps } from '../types';
import './document-section.css';

type Line = CopySection['paragraphs'][number];
type Block =
  | { kind: 'text'; lines: Line[] }
  | { kind: 'label'; lines: Line[] }
  | { kind: 'list'; lines: Line[] }
  | { kind: 'steps'; lines: Line[] }
  | { kind: 'actions'; lines: Line[] };

const isAction = (t: string) => /^(CTA:|Links?:)/.test(t);
const isBullet = (t: string) => /^[•\-–]\s/.test(t);
const isStep = (t: string) => /^\d+\.\s/.test(t);
const icons = [Compass, Layers3, Target, Workflow, LineChart, Users, ShieldCheck, Sparkles];

function iconFor(title: string) {
  let value = 0;
  for (const char of title) value = (value * 31 + char.charCodeAt(0)) >>> 0;
  return icons[value % icons.length];
}

/** Groups the section body, in source order, into runs of the same kind. */
function toBlocks(lines: Line[]): Block[] {
  const blocks: Block[] = [];
  lines.forEach((line, i) => {
    const t = line.text;
    const next = lines[i + 1]?.text ?? '';
    const kind: Block['kind'] = isAction(t)
      ? 'actions'
      : isBullet(t)
        ? 'list'
        : isStep(t)
          ? 'steps'
          : t.trim().endsWith(':') && t.length < 90 && (isBullet(next) || isStep(next))
            ? 'label'
            : 'text';
    const last = blocks[blocks.length - 1];
    if (last && last.kind === kind && kind !== 'text' && kind !== 'label') last.lines.push(line);
    else blocks.push({ kind, lines: [line] } as Block);
  });
  return blocks;
}

/** A list item keeps its exact source text; a leading "Label - " is set in bold. */
function ListItem({ line }: { line: Line }) {
  const text = line.text.replace(/^[•\-–]\s*/, '');
  const divider = text.search(/ [-–—] /);
  return (
    <li data-source-paragraph={line.sourceParagraph}>
      <span className="doc-list-dot" aria-hidden="true" />
      <span>
        <span className="sr-only">{line.text.slice(0, line.text.length - text.length)}</span>
        {divider > 0 && divider < 60 ? (
          <>
            <strong>{text.slice(0, divider)}</strong>
            {text.slice(divider)}
          </>
        ) : (
          text
        )}
      </span>
    </li>
  );
}

function StepItem({ line }: { line: Line }) {
  const [, number, rest] = line.text.match(/^(\d+)\.\s*(.*)$/s) ?? [, '', line.text];
  return (
    <li data-source-paragraph={line.sourceParagraph}>
      <span className="doc-step-number" aria-hidden="true">
        {number.padStart(2, '0')}
      </span>
      <p>
        <span className="sr-only">{number}. </span>
        {rest}
      </p>
    </li>
  );
}

function renderBlock(block: Block, key: number): ReactNode {
  switch (block.kind) {
    case 'list':
      return (
        <ul className="doc-list" key={key}>
          {block.lines.map((line) => (
            <ListItem key={line.sourceParagraph} line={line} />
          ))}
        </ul>
      );
    case 'steps':
      return (
        <ol className="doc-steps" key={key}>
          {block.lines.map((line) => (
            <StepItem key={line.sourceParagraph} line={line} />
          ))}
        </ol>
      );
    case 'label':
      return (
        <p className="doc-label" key={key} data-source-paragraph={block.lines[0].sourceParagraph}>
          {block.lines[0].text}
        </p>
      );
    case 'actions':
      return (
        <div className="doc-actions" key={key}>
          {block.lines.map((line) => (
            <CopyLine
              key={line.sourceParagraph}
              text={line.text}
              paragraph={line.sourceParagraph}
            />
          ))}
        </div>
      );
    default:
      return block.lines.map((line) => (
        <CopyLine key={line.sourceParagraph} text={line.text} paragraph={line.sourceParagraph} />
      ));
  }
}

const length = (blocks: Block[]) =>
  blocks.reduce((n, b) => n + b.lines.reduce((m, l) => m + l.text.length, 0), 0);

/** Long bodies show their opening and first structured block; the rest unfolds on request. */
function StoryBody({ blocks }: { blocks: Block[] }) {
  const [open, setOpen] = useState(false);
  const panel = useId();
  let split = blocks.findIndex((b) => b.kind === 'list' || b.kind === 'steps');
  split = split < 0 ? Math.min(1, blocks.length) : split + 1;
  if (blocks[split - 1]?.kind === 'label') split += 1;
  const shown = blocks.slice(0, split);
  const hidden = blocks.slice(split).filter((b) => b.kind !== 'actions');
  const actions = blocks.slice(split).filter((b) => b.kind === 'actions');
  const fold = length(hidden) > 220;
  return (
    <>
      {shown.map(renderBlock)}
      {fold ? (
        <>
          <div id={panel} className={`doc-more${open ? ' is-open' : ''}`} inert={!open}>
            <div>{hidden.map(renderBlock)}</div>
          </div>
          <button
            type="button"
            className="doc-more-toggle"
            aria-expanded={open}
            aria-controls={panel}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? 'Show less' : 'Read more'}
            <ChevronDown size={16} aria-hidden="true" />
          </button>
        </>
      ) : (
        hidden.map(renderBlock)
      )}
      {actions.map(renderBlock)}
    </>
  );
}

export function DocumentSectionSlide({
  section,
  index,
  last = false,
  embedded = false,
}: DocumentPageProps & { section: CopySection; index: number; last?: boolean }) {
  const [heading, ...body] = section.paragraphs;
  const id = `section-${heading.sourceParagraph}`;

  if (embedded) {
    return (
      <article className={`editorial-section ${index === 2 ? 'dark-section' : ''}`} id={id}>
        <div className="section-heading">
          <span className="editorial-number">{String(index + 1).padStart(2, '0')}</span>
          <h2 data-source-paragraph={heading.sourceParagraph}>{section.title}</h2>
        </div>
        <div className="section-body">
          {body.map((p) => (
            <CopyLine key={p.sourceParagraph} text={p.text} paragraph={p.sourceParagraph} />
          ))}
        </div>
      </article>
    );
  }

  const blocks = toBlocks(body);
  const hasActions = blocks.some((b) => b.kind === 'actions');
  const textLength = length(blocks.filter((b) => b.kind !== 'actions'));
  const closing = last && hasActions;
  const compact =
    !hasActions && blocks.length === 1 && blocks[0].kind === 'text' && textLength <= 240;
  const structured = blocks.some((b) => b.kind !== 'text' && b.kind !== 'actions');
  const story = !closing && (structured || body.filter((p) => !isAction(p.text)).length > 2);
  const layout = closing ? 'closing' : compact ? 'feature' : story ? 'story' : 'split';
  const Icon = iconFor(section.title);

  const title = <h2 data-source-paragraph={heading.sourceParagraph}>{section.title}</h2>;

  return (
    <article
      className={`editorial-section doc-section doc-${layout}${closing ? ' dark-section' : ''}`}
      id={id}
      data-section-anchor=""
    >
      {layout === 'feature' && (
        <>
          <Icon className="doc-feature-icon" size={26} strokeWidth={1.5} aria-hidden="true" />
          <div>
            {title}
            {blocks.map(renderBlock)}
          </div>
        </>
      )}
      {layout === 'split' && (
        <>
          <div className="doc-split-heading">
            <span className="doc-eyebrow">{String(index + 1).padStart(2, '0')}</span>
            {title}
          </div>
          <div className="doc-split-body">{blocks.map(renderBlock)}</div>
        </>
      )}
      {layout === 'story' && (
        <>
          <div className="doc-story-heading">
            <span className="doc-eyebrow">{String(index + 1).padStart(2, '0')}</span>
            {title}
          </div>
          <div className="doc-story-body">
            <StoryBody blocks={blocks} />
          </div>
        </>
      )}
      {layout === 'closing' && (
        <>
          <div className="doc-closing-copy">
            {title}
            {blocks.filter((b) => b.kind !== 'actions').map(renderBlock)}
          </div>
          <div className="doc-closing-actions">
            {blocks.filter((b) => b.kind === 'actions').map(renderBlock)}
          </div>
        </>
      )}
    </article>
  );
}
