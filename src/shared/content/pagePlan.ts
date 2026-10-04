import { createContext, useContext } from 'react';
import type { CopySection } from './types';

/** How a section is presented on a public page. Chosen from the shape of its copy and from its
 * neighbours, so pages read with a rhythm (grid, split, band) instead of one block per section:
 * - grid: a short statement; consecutive ones form an icon feature grid (2 or 3 across)
 * - accordion: a long run (six or more) of grid statements, shown as dropdown rows
 * - checklist: a short list; consecutive ones form cards with check marks
 * - spotlight: text plus one list; the list sits in a product-style card beside the text,
 *   alternating sides down the page
 * - steps: text around a numbered sequence, shown as step cards
 * - chapters: numbered items that each carry their own copy, shown as one card per item
 * - story: longer structured copy, heading pinned beside it
 * - statement: a single idea, heading left and text right
 * - letter: continuous prose (four or more paragraphs) in a reading column
 * - band: a mid-page call to action, centred on a tinted band
 * - closing: the final call to action, a dark band with the page's scene */
export type Layout =
  | 'grid'
  | 'accordion'
  | 'checklist'
  | 'spotlight'
  | 'steps'
  | 'chapters'
  | 'story'
  | 'statement'
  | 'letter'
  | 'band'
  | 'closing';

export interface SectionPlan {
  layout: Layout;
  /** Cards per row for grid and checklist runs. */
  columns?: 2 | 3;
  /** First card of a run, so the run starts on a fresh row. */
  runStart?: boolean;
  /** Position within the run (1-based), for designs that number their cards. */
  order?: number;
  /** Spotlight visual side, alternating down the page. */
  flip?: boolean;
}

export const isAction = (t: string) => /^(CTA:|Links?:)/.test(t);
export const isBullet = (t: string) => /^[•\-–]\s/.test(t);
export const isStep = (t: string) => /^\d+\.\s/.test(t);
const isLabel = (t: string, next = '') =>
  t.trim().endsWith(':') && t.length < 90 && (isBullet(next) || isStep(next));

/** Count separate runs of bullets (a list label belongs to the run that follows it). */
function listRuns(lines: string[]) {
  let runs = 0;
  lines.forEach((t, i) => {
    if (isBullet(t) && !isBullet(lines[i - 1] ?? '')) runs += 1;
  });
  return runs;
}

/** Numbered lines followed by their own copy (not a plain numbered list). */
export function chapterStarts(lines: string[]) {
  const at = lines.flatMap((t, i) => (isStep(t) ? [i] : []));
  return at.length >= 2 && at.some((v, k) => k > 0 && v - at[k - 1] > 1) ? at : [];
}

function classify(section: CopySection, last: boolean): Layout {
  const body = section.paragraphs.slice(1).map((p) => p.text);
  // Long-form sections keep their actions outside the collapsed body, so they never close a page.
  const actions = section.longForm ? [] : body.filter(isAction);
  const copy = body.filter((t) => !isAction(t));
  const bullets = copy.filter(isBullet).length;
  const steps = copy.filter(isStep).length;
  const prose = copy.filter((t, i) => !isBullet(t) && !isStep(t) && !isLabel(t, copy[i + 1]));
  const length = copy.reduce((n, t) => n + t.length, 0);

  if (actions.length) return last ? 'closing' : 'band';
  if (bullets >= 2 && prose.length === 0 && length <= 420) return 'checklist';
  if (copy.length <= 2 && bullets <= 1 && steps === 0 && length <= 340) return 'grid';
  if (chapterStarts(copy).length >= 2) return 'chapters';
  if (steps >= 3 && bullets === 0) return 'steps';
  if (bullets >= 3 && bullets <= 12 && listRuns(copy) <= 2 && steps === 0) return 'spotlight';
  if (bullets || steps) return 'story';
  if (copy.length >= 4 || length > 900) return 'letter';
  return 'statement';
}

/** Plan a page: classify each section, then size the runs of cards it forms. */
export function planPage(sections: CopySection[]): Map<string, SectionPlan> {
  const plans: SectionPlan[] = sections.map((s, i) => {
    const layout = classify(s, i === sections.length - 1);
    // Collapsed long-form sections stand alone rather than joining a card run.
    return {
      layout: s.longForm && (layout === 'grid' || layout === 'checklist') ? 'statement' : layout,
    };
  });
  for (let i = 0; i < plans.length;) {
    const { layout } = plans[i];
    let end = i + 1;
    if (layout === 'grid' || layout === 'checklist') {
      while (end < plans.length && plans[end].layout === layout) end += 1;
      const size = end - i;
      if (size === 1) {
        // A lone card reads better as a full-width statement.
        plans[i].layout = 'statement';
      } else {
        const dropdowns = layout === 'grid' && size >= 6;
        const columns = dropdowns || size === 2 || size === 4 ? 2 : 3;
        const runLayout: Layout = dropdowns ? 'accordion' : layout;
        for (let j = i; j < end; j += 1)
          plans[j] = { layout: runLayout, columns, runStart: j === i, order: j - i + 1 };
      }
    }
    i = end;
  }
  let spotlights = 0;
  for (const plan of plans) if (plan.layout === 'spotlight') plan.flip = spotlights++ % 2 === 1;
  return new Map(sections.map((s, i) => [s.label, plans[i]]));
}

/** Each public page wears one of these designs (hero, card grids, spotlights, bands and the
 * closing panel all change together — see page-designs.css). Pages take them in document order,
 * so neighbouring pages never share a design. */
export const designs = ['ruled', 'cards', 'bento', 'editorial', 'tinted', 'gallery'] as const;
export type Design = (typeof designs)[number];
export const designFor = (page: number): Design => designs[page % designs.length];

export const PagePlanContext = createContext<{
  plans: Map<string, SectionPlan>;
  scene?: string;
} | null>(null);

export function useSectionPlan(section: CopySection, last: boolean) {
  const context = useContext(PagePlanContext);
  return {
    plan: context?.plans.get(section.label) ?? planPage([section]).get(section.label)!,
    scene: context?.scene,
    last,
  };
}
