import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import './MoreDetail.css';

type Para = { text: string };
type Block = { title?: string; label?: string; paragraphs?: Para[] };
type PageJson = { hero?: Block; sections?: Block[] };

const loaders = import.meta.glob<{ default: PageJson }>('/src/products/**/content.json');

const cp1252: Record<string, number> = {
  '€': 0x80,
  '‚': 0x82,
  ƒ: 0x83,
  '„': 0x84,
  '…': 0x85,
  '†': 0x86,
  '‡': 0x87,
  ˆ: 0x88,
  '‰': 0x89,
  Š: 0x8a,
  '‹': 0x8b,
  Œ: 0x8c,
  Ž: 0x8e,
  '‘': 0x91,
  '’': 0x92,
  '“': 0x93,
  '”': 0x94,
  '•': 0x95,
  '–': 0x96,
  '—': 0x97,
  '˜': 0x98,
  '™': 0x99,
  š: 0x9a,
  '›': 0x9b,
  œ: 0x9c,
  ž: 0x9e,
  Ÿ: 0x9f,
};

// Some source copy was saved with UTF-8 read as Windows-1252; undo that.
function repair(text: string) {
  if (!/[âÃ]/.test(text)) return text;
  const bytes: number[] = [];
  for (const ch of text) {
    const code = ch.codePointAt(0) ?? 0;
    const byte = cp1252[ch] ?? (code < 256 ? code : -1);
    if (byte < 0) return text;
    bytes.push(byte);
  }
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(new Uint8Array(bytes));
  } catch {
    return text;
  }
}

const HY = '[\\u2011-]';

// Messaging rules, applied in order: specific rewrites first, then generic ones.
const rewrites: [RegExp, string][] = [
  [
    /Execution is the differentiator\s*[—-]\s*the space where transformation becomes real\./g,
    'Consistency is what makes results dependable.',
  ],
  [
    /Execution is where clarity and capability turn into action\./g,
    'Consistency is where clarity and capability turn into reliable delivery.',
  ],
  [
    /The Execution Space gives you guided steps, intelligent cues, and structured flows that help you follow through consistently and calmly\./g,
    'Consistency gives you guided steps, clear prompts and structured flows that help you follow through.',
  ],
  [/Where work moves forward\./g, 'Where work gets delivered reliably.'],
  [/\bThese are not [^.]*\./g, ''],
  [/(^|\s)Not (a|an|dashboards|modules|apps)\b[^.]*\./g, '$1'],
  [new RegExp(`A human${HY}centered architecture designed to`, 'g'), 'Designed to'],
  [new RegExp(`human${HY}centered`, 'gi'), 'people-first'],
  [/Clarity, Capability,? and (Execution|Consistency)/g, 'Clarity, Capability and Consistency'],
  [/\b(?:The )?(Clarity|Capability) Space\b/g, '$1'],
  [/\b(?:The )?(?:Execution|Consistency) Space\b/g, 'Consistency'],
  [/\b(\d+\.\s*)?(Clarity|Capability|Consistency) Space\b/g, '$1$2'],
  [/\bthree interconnected spaces\b/gi, 'three connected pillars'],
  [/\bThree spaces\b/g, 'Three pillars'],
  [/\bthis space\b/g, 'this pillar'],
  [/\bspaces\b/g, 'pillars'],
  [/One Continuous Operating System\./g, 'One connected platform.'],
  [/\bOperating System\b/g, 'platform'],
  [/\bintelligent cues\b/gi, 'clear prompts'],
  [new RegExp(`quiet,? human${HY}directed intelligence`, 'gi'), 'quiet, human-directed guidance'],
  [/quiet intelligence/gi, 'quiet guidance'],
  [/\bquietly, intelligently,? and\b/g, 'quietly and'],
  [/,\s+(I|i)ntelligent\s+/g, ' '],
  [/\b(I|i)ntelligent\s+/g, ''],
  [/\bEach space\b/g, 'Each pillar'],
  [/\bThis is the space where\b/g, 'This is the pillar where'],
  [/\btransformations\b/g, 'changes'],
  [/\btransformation\b/g, 'change'],
  [/\bTransformation\b/g, 'Change'],
  [/\bguided execution\b/gi, 'reliable delivery'],
  [/\bExecution\b/g, 'Consistency'],
  [/\bexecution\b/g, 'delivery'],
  [/\btransformation becomes real\b/gi, 'results become dependable'],
  [/\btransforms\b/g, 'turns'],
  [/\s{2,}/g, ' '],
];

function clean(text: string) {
  let out = repair(text);
  for (const [re, to] of rewrites) out = out.replace(re, to);
  return out.trim();
}

// Behaviour we have not confirmed in the product is shown with a "To confirm" tag.
const unverified = /your pace|adapts? to (you|your)|adjusts? to your|guarantee|\d+%|proven/i;

type Item = { kind: 'p' | 'h' | 'ul'; text: string; items?: string[]; flag?: boolean };

function toItems(block: Block): Item[] {
  const out: Item[] = [];
  const title = clean(block.title ?? '').trim();
  for (const raw of block.paragraphs ?? []) {
    const text = clean(raw.text).trim();
    if (!text || text === title || /^CTA:/i.test(text)) continue;
    const bullet = text.match(/^[-•]\s*(.+)$/);
    if (bullet) {
      const last = out[out.length - 1];
      if (last?.kind === 'ul') last.items?.push(bullet[1]);
      else out.push({ kind: 'ul', text: '', items: [bullet[1]] });
      if (unverified.test(bullet[1])) out[out.length - 1].flag = true;
    } else if (text.length < 60 && !/[.:]$/.test(text)) {
      out.push({ kind: 'h', text: text.replace(/^\d+\.\s*/, '') });
    } else {
      out.push({ kind: 'p', text, flag: unverified.test(text) });
    }
  }
  return out;
}

type Card = { title: string; body: Item[] };

// Short headings open a card; text before the first heading becomes the panel intro.
function toPanel(items: Item[]) {
  const intro: Item[] = [];
  const cards: Card[] = [];
  for (const item of items) {
    if (item.kind === 'h') cards.push({ title: item.text, body: [] });
    else if (cards.length) cards[cards.length - 1].body.push(item);
    else intro.push(item);
  }
  return { intro, cards };
}

function Body({ items }: { items: Item[] }) {
  return (
    <>
      {items.map((item, i) =>
        item.kind === 'ul' ? (
          <ul key={i}>
            {item.items?.map((li) => (
              <li key={li}>{li}</li>
            ))}
            {item.flag && (
              <li className="more-detail-flag-row">
                <span className="more-detail-flag">To confirm</span>
              </li>
            )}
          </ul>
        ) : (
          <p key={i}>
            {item.text}
            {item.flag && <span className="more-detail-flag">To confirm</span>}
          </p>
        ),
      )}
    </>
  );
}

export function MoreDetail() {
  const { pathname } = useLocation();
  const [blocks, setBlocks] = useState<{ title: string; items: Item[] }[]>([]);
  const [active, setActive] = useState(0);

  useEffect(() => {
    setActive(0);
    const slug =
      pathname === '/' ? 'home' : pathname.slice(1).replace(/\/+$/, '').replace(/\//g, '-');
    const key = Object.keys(loaders).find((path) => path.endsWith(`/${slug}/content.json`));
    let live = true;
    if (!key) {
      setBlocks([]);
      return;
    }
    void loaders[key]().then((mod) => {
      if (!live) return;
      const json = mod.default;
      const all: Block[] = [json.hero ?? {}, ...(json.sections ?? [])];
      setBlocks(
        all
          .map((block, index) => ({
            title: index === 0 ? 'Overview' : clean(block.title ?? block.label ?? ''),
            items: toItems(block),
          }))
          .filter((block) => block.items.length > 0),
      );
    });
    return () => {
      live = false;
    };
  }, [pathname]);

  if (blocks.length === 0) return null;

  // A title that is a full sentence ("…Not Just a Keyword.") opens a group; later sections become its cards.
  const groups: { title: string; items: Item[]; children: Card[] }[] = [];
  blocks.forEach((block, index) => {
    if (index === 0 || /\.$/.test(block.title)) {
      groups.push({ title: block.title.replace(/\.$/, ''), items: block.items, children: [] });
    } else {
      groups[groups.length - 1].children.push({
        title: block.title,
        body: block.items.map((item) =>
          item.kind === 'h' ? { ...item, kind: 'p' as const } : item,
        ),
      });
    }
  });

  const single = groups.length === 1;
  const activeIndex = Math.min(active, groups.length - 1);

  return (
    <section className="more-detail" aria-labelledby="more-detail-title">
      <h2 id="more-detail-title">The detail</h2>
      <div className={single ? 'md-shell is-single' : 'md-shell'}>
        {!single && (
          <div className="md-tabs" role="tablist" aria-label="Topics">
            {groups.map((block, index) => (
              <button
                key={block.title + index}
                type="button"
                role="tab"
                id={`md-tab-${index}`}
                aria-selected={index === activeIndex}
                aria-controls={`md-panel-${index}`}
                className={index === activeIndex ? 'is-active' : undefined}
                onClick={() => setActive(index)}
              >
                <span>{String(index + 1).padStart(2, '0')}</span>
                {block.title}
              </button>
            ))}
          </div>
        )}
        <div className="md-panels">
          {groups.map((group, index) => {
            const own = toPanel(group.items);
            const cards = [...own.cards, ...group.children];
            const on = index === activeIndex;
            return (
              <div
                className={on ? 'md-panel is-active' : 'md-panel'}
                role="tabpanel"
                id={`md-panel-${index}`}
                aria-labelledby={`md-tab-${index}`}
                aria-hidden={!on}
                key={group.title + index}
              >
                <h3 className="md-panel-title">{group.title}</h3>
                {own.intro.length > 0 && (
                  <div className="md-intro">
                    <Body items={own.intro} />
                  </div>
                )}
                {cards.length > 0 && (
                  <ul className="md-cards">
                    {cards.map((card) => (
                      <li key={card.title} tabIndex={on ? 0 : -1}>
                        <h4>{card.title}</h4>
                        <Body items={card.body} />
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
