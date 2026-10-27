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

function clean(text: string) {
  return repair(text).trim();
}

function buildBlocks(json: PageJson) {
  const hasHero = Boolean(json.hero);
  const all: Block[] = [...(json.hero ? [json.hero] : []), ...(json.sections ?? [])];
  return all
    .map((block, index) => ({
      title: hasHero && index === 0 ? 'Overview' : clean(block.title ?? block.label ?? ''),
      items: toItems(block),
    }))
    .filter((block) => block.items.length > 0);
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

export function MoreDetail({
  page,
  heading = 'The detail',
}: {
  page?: PageJson;
  heading?: string;
}) {
  const { pathname } = useLocation();
  const [blocks, setBlocks] = useState<{ title: string; items: Item[] }[]>(() =>
    page ? buildBlocks(page) : [],
  );
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (page) {
      setBlocks(buildBlocks(page));
      return;
    }
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
      setBlocks(buildBlocks(json));
    });
    return () => {
      live = false;
    };
  }, [pathname, page]);

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
      <h2 id="more-detail-title">{heading}</h2>
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
                <span className="md-tab-number" aria-hidden="true">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <span className="md-tab-label">{block.title}</span>
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
