import {
  Check,
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
import { chapterStarts, isAction, isBullet, isStep, useSectionPlan } from '../pagePlan';
import type { CopySection, DocumentPageProps } from '../types';
import './document-section.css';
import './page-flow.css';
import './page-motion.css';

type Line = CopySection['paragraphs'][number];
type Block =
  | { kind: 'text'; lines: Line[] }
  | { kind: 'label'; lines: Line[] }
  | { kind: 'list'; lines: Line[] }
  | { kind: 'steps'; lines: Line[] }
  | { kind: 'actions'; lines: Line[] };

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
function ListItem({ line, check = false }: { line: Line; check?: boolean }) {
  const text = line.text.replace(/^[•\-–]\s*/, '');
  const divider = text.search(/ [-–—] /);
  return (
    <li data-source-paragraph={line.sourceParagraph}>
      {check ? (
        <span className="flow-check" aria-hidden="true">
          <Check size={14} strokeWidth={2.5} />
        </span>
      ) : (
        <span className="doc-list-dot" aria-hidden="true" />
      )}
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

/** `clamp` is false where the copy already sits above a "Read more" fold. (Array.map passes the
 * array as the third argument, which counts as clamping.) */
function renderBlock(block: Block, key: number, clamp: unknown = true): ReactNode {
  switch (block.kind) {
    case 'list':
      return <ListBlock key={key} lines={block.lines} className="doc-list" />;
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
      return block.lines.map((line) =>
        clamp === false ? (
          <CopyLine key={line.sourceParagraph} text={line.text} paragraph={line.sourceParagraph} />
        ) : (
          <ClampedLine key={line.sourceParagraph} line={line} />
        ),
      );
  }
}

const length = (blocks: Block[]) =>
  blocks.reduce((n, b) => n + b.lines.reduce((m, l) => m + l.text.length, 0), 0);

/** Hidden copy behind a "Read more" toggle that unfolds softly in place. */
function Fold({ children, label = 'Read more' }: { children: ReactNode; label?: string }) {
  const [open, setOpen] = useState(false);
  const panel = useId();
  return (
    <>
      <div id={panel} className={`doc-more${open ? ' is-open' : ''}`} inert={!open}>
        <div>{children}</div>
      </div>
      <button
        type="button"
        className="doc-more-toggle"
        aria-expanded={open}
        aria-controls={panel}
        onClick={() => setOpen((value) => !value)}
      >
        {open ? 'Show less' : label}
        <ChevronDown size={16} aria-hidden="true" />
      </button>
    </>
  );
}

/** A long paragraph shows its first sentence; the rest of the same paragraph opens inline. */
function ClampedLine({ line, limit = 150 }: { line: Line; limit?: number }) {
  const [open, setOpen] = useState(false);
  const rest = useId();
  const text = line.text;
  const cut = text.search(/[.!?]\s/) + 1;
  if (isAction(text) || text.length <= limit || cut <= 0 || text.length - cut < 40)
    return <CopyLine text={text} paragraph={line.sourceParagraph} />;
  return (
    <p data-source-paragraph={line.sourceParagraph}>
      {text.slice(0, cut)}
      <span id={rest} hidden={!open}>
        {text.slice(cut)}
      </span>{' '}
      <button
        type="button"
        className="clamp-toggle"
        aria-expanded={open}
        aria-controls={rest}
        onClick={() => setOpen((value) => !value)}
      >
        {open ? 'Less' : 'More'}
      </button>
    </p>
  );
}

/** Lists longer than five items show the first four; the rest open on request. */
function ListBlock({
  lines,
  className,
  check = false,
}: {
  lines: Line[];
  className: string;
  check?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const list = useId();
  const long = lines.length > 5;
  const shown = long && !open ? lines.slice(0, 4) : lines;
  return (
    <>
      <ul className={className} id={list}>
        {shown.map((line) => (
          <ListItem key={line.sourceParagraph} line={line} check={check} />
        ))}
      </ul>
      {long && (
        <button
          type="button"
          className="list-toggle"
          aria-expanded={open}
          aria-controls={list}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? 'Show fewer' : `Show all ${lines.length}`}
          <ChevronDown size={15} aria-hidden="true" />
        </button>
      )}
    </>
  );
}

/** A dropdown row: the title is the trigger, the copy opens beneath it. */
function AccordionItem({
  title,
  heading,
  icon: Icon,
  blocks,
}: {
  title: string;
  heading: Line;
  icon: typeof Compass;
  blocks: Block[];
}) {
  const [open, setOpen] = useState(false);
  const panel = useId();
  return (
    <>
      <h2 data-source-paragraph={heading.sourceParagraph}>
        <button
          type="button"
          className="flow-accordion-trigger"
          aria-expanded={open}
          aria-controls={panel}
          onClick={() => setOpen((value) => !value)}
        >
          <span className="flow-card-icon" aria-hidden="true">
            <Icon size={20} strokeWidth={1.5} />
          </span>
          <span className="flow-accordion-title">{title}</span>
          <ChevronDown className="flow-accordion-chevron" size={20} aria-hidden="true" />
        </button>
      </h2>
      <div id={panel} className={`doc-more${open ? ' is-open' : ''}`} inert={!open}>
        <div className="flow-accordion-body">{blocks.map((b, i) => renderBlock(b, i, false))}</div>
      </div>
    </>
  );
}

/** Long bodies show a short opening (up to the first list); the rest unfolds on request. */
function StoryBody({ blocks }: { blocks: Block[] }) {
  let split = blocks.findIndex((b) => b.kind === 'list' || b.kind === 'steps');
  if (split < 0) {
    // Plain prose: show about a paragraph, never more than two.
    let shownLength = 0;
    split = blocks.findIndex((b) => (shownLength += length([b])) >= 160) + 1 || blocks.length;
    split = Math.min(split, 2);
  } else split += 1;
  if (blocks[split - 1]?.kind === 'label') split += 1;
  const shown = blocks.slice(0, split);
  const hidden = blocks.slice(split).filter((b) => b.kind !== 'actions');
  const actions = blocks.slice(split).filter((b) => b.kind === 'actions');
  const fold = length(hidden) > 80;
  return (
    <>
      {fold ? shown.map((b, i) => renderBlock(b, i, false)) : shown.map(renderBlock)}
      {fold ? (
        <Fold>{hidden.map((b, i) => renderBlock(b, i, false))}</Fold>
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
  const { plan, scene } = useSectionPlan(section, last);
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

  const { layout } = plan;
  const blocks = toBlocks(body);
  const copy = blocks.filter((b) => b.kind !== 'actions');
  const actions = blocks.filter((b) => b.kind === 'actions');
  const Icon = iconFor(section.title);
  const title = <h2 data-source-paragraph={heading.sourceParagraph}>{section.title}</h2>;
  const eyebrow = <span className="doc-eyebrow">{String(index + 1).padStart(2, '0')}</span>;
  const className = [
    'flow-section',
    `flow-${layout}`,
    plan.columns && `flow-cols-${plan.columns}`,
    plan.runStart && 'flow-run-start',
    plan.flip && 'flow-flip',
  ]
    .filter(Boolean)
    .join(' ');

  let inner: ReactNode;
  switch (layout) {
    case 'grid':
      inner = (
        <>
          <span className="flow-card-icon" aria-hidden="true">
            <Icon size={22} strokeWidth={1.5} />
          </span>
          <div>
            {title}
            {copy.map((b, i) =>
              b.kind === 'list' ? (
                <ul className="flow-tags" key={i}>
                  {b.lines.map((line) => (
                    <ListItem key={line.sourceParagraph} line={line} />
                  ))}
                </ul>
              ) : (
                renderBlock(b, i)
              ),
            )}
          </div>
        </>
      );
      break;
    case 'accordion':
      inner = <AccordionItem title={section.title} heading={heading} icon={Icon} blocks={blocks} />;
      break;
    case 'checklist':
      inner = (
        <>
          <span className="flow-card-icon" aria-hidden="true">
            <Icon size={22} strokeWidth={1.5} />
          </span>
          {title}
          {copy.map((b, i) =>
            b.kind === 'list' ? (
              <ListBlock key={i} lines={b.lines} className="flow-checks" check />
            ) : (
              renderBlock(b, i)
            ),
          )}
        </>
      );
      break;
    case 'spotlight': {
      // Each list (with the label introducing it) moves into a product-style card beside the text.
      const groups = blocks.flatMap((b, i) =>
        b.kind === 'list'
          ? [{ label: blocks[i - 1]?.kind === 'label' ? blocks[i - 1] : undefined, list: b }]
          : [],
      );
      const inCard = new Set<Block>(
        groups.flatMap((g) => (g.label ? [g.label, g.list] : [g.list])),
      );
      const textBlocks = blocks.filter((b) => !inCard.has(b));
      inner = (
        <>
          <div className="flow-spotlight-copy">
            {eyebrow}
            {title}
            <StoryBody blocks={textBlocks} />
          </div>
          <div className="flow-visual">
            <div className="flow-window">
              <div className="flow-window-bar" aria-hidden="true">
                <span />
                <span />
                <span />
              </div>
              <div className="flow-window-body">
                <span className="flow-window-icon" aria-hidden="true">
                  <Icon size={20} strokeWidth={1.6} />
                </span>
                {groups.map(({ label, list }, i) => {
                  // Lists of single words read as tags; sentences as checked rows.
                  const tags = list.lines.every((l) => l.text.length <= 24);
                  return (
                    <div className="flow-window-group" key={i}>
                      {label && renderBlock(label, 0)}
                      <ListBlock
                        lines={list.lines}
                        className={tags ? 'flow-tags' : 'flow-checks'}
                        check={!tags}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      );
      break;
    }
    case 'steps': {
      const stepsAt = blocks.findIndex((b) => b.kind === 'steps');
      const before = blocks.slice(0, stepsAt);
      const after = blocks.slice(stepsAt + 1);
      inner = (
        <>
          <header className="flow-steps-head">
            {eyebrow}
            {title}
            <div>{before.map(renderBlock)}</div>
          </header>
          {renderBlock(blocks[stepsAt], stepsAt)}
          {after.length > 0 && (
            <div className="flow-steps-after">
              <StoryBody blocks={after} />
            </div>
          )}
        </>
      );
      break;
    }
    case 'chapters': {
      // Each numbered line opens a card holding the copy beneath it. The last card takes as many
      // lines as the one before; anything after that closes the section below the cards.
      const lines = body.filter((p) => !isAction(p.text));
      const starts = chapterStarts(lines.map((p) => p.text));
      const size = starts[starts.length - 1] - starts[starts.length - 2];
      const ends = [...starts.slice(1), Math.min(lines.length, starts[starts.length - 1] + size)];
      const chapters = starts.map((start, i) => lines.slice(start, ends[i]));
      const intro = toBlocks(lines.slice(0, starts[0]));
      const outro = toBlocks(lines.slice(ends[ends.length - 1]));
      inner = (
        <>
          <header className="flow-steps-head">
            {eyebrow}
            {title}
            <div>
              <StoryBody blocks={intro} />
            </div>
          </header>
          <ol className="flow-chapter-cards">
            {chapters.map(([step, ...rest]) => {
              const [, number, name] = step.text.match(/^(\d+)\.\s*(.*)$/s) ?? [, '', step.text];
              return (
                <li key={step.sourceParagraph}>
                  <span className="doc-step-number" aria-hidden="true">
                    {number.padStart(2, '0')}
                  </span>
                  <h3 data-source-paragraph={step.sourceParagraph}>
                    <span className="sr-only">{number}. </span>
                    {name}
                  </h3>
                  {(() => {
                    // The card opens with its tagline; the detail sits behind a dropdown.
                    const [lead, ...detail] = toBlocks(rest);
                    const render = (b: Block, i: number) =>
                      b.kind === 'list' ? (
                        <ListBlock key={i} lines={b.lines} className="flow-checks" check />
                      ) : (
                        renderBlock(b, i)
                      );
                    return (
                      <>
                        {lead && render(lead, 0)}
                        {detail.length > 0 && <Fold label="Details">{detail.map(render)}</Fold>}
                      </>
                    );
                  })()}
                </li>
              );
            })}
          </ol>
          {(outro.length > 0 || actions.length > 0) && (
            <div className="flow-steps-after">
              {outro.map(renderBlock)}
              {actions.map(renderBlock)}
            </div>
          )}
        </>
      );
      break;
    }
    case 'story':
      inner = (
        <>
          <div className="doc-story-heading">
            {eyebrow}
            {title}
          </div>
          <div className="doc-story-body">
            <StoryBody blocks={blocks} />
          </div>
        </>
      );
      break;
    case 'letter':
      inner = (
        <>
          {title}
          <div className="flow-letter-body">
            <StoryBody blocks={blocks} />
          </div>
        </>
      );
      break;
    case 'band':
      inner = (
        <>
          {title}
          <StoryBody blocks={copy} />
          {actions.map(renderBlock)}
        </>
      );
      break;
    case 'closing':
      inner = (
        <>
          <div className="flow-closing-copy">
            {title}
            <StoryBody blocks={copy} />
            {actions.map(renderBlock)}
          </div>
          {scene && (
            <div className="flow-closing-media" aria-hidden="true">
              <img src={scene} alt="" loading="lazy" />
            </div>
          )}
        </>
      );
      break;
    default:
      inner = (
        <>
          <div className="doc-split-heading">
            {eyebrow}
            {title}
          </div>
          <div className="doc-split-body">
            <StoryBody blocks={blocks} />
          </div>
        </>
      );
  }

  return (
    <article
      className={`${className}${layout === 'closing' && !scene ? ' flow-closing-plain' : ''}`}
      id={id}
      data-section-anchor=""
      data-order={plan.order ? String(plan.order).padStart(2, '0') : undefined}
    >
      {inner}
    </article>
  );
}
