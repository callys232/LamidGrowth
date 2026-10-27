/** Quiet, code-drawn brand scenes for public page heroes. Their simple paths and rings echo the
 * product's growth model without implying a specific customer, location, or product outcome. */

const scene = (name: string) => `/media/scenes/${name}.svg`;

const families: [RegExp, string[]][] = [
  [/^\/product/, ['orbit-guidance', 'orbit-cycle']],
  [/^\/how-it-works/, ['orbit-cycle', 'orbit-guidance']],
  [/^\/who-its-for/, ['orbit-network', 'orbit-guidance']],
  [/^\/(enterprise|security|responsible-ai|trust)/, ['orbit-network', 'orbit-cycle']],
  [/^\/(pricing|demo|start)/, ['orbit-guidance', 'orbit-network']],
  [/^\/experts/, ['orbit-network', 'orbit-guidance']],
  [/^\/(resources|insights|guides|case-studies|research)/, ['orbit-cycle', 'orbit-network']],
  [/^\/(help|support|developers|integrations)/, ['orbit-network', 'orbit-cycle']],
  [/^\/(about|careers|press|contact)/, ['orbit-guidance', 'orbit-cycle']],
  [/^\/(legal|accessibility)/, ['orbit-network', 'orbit-cycle']],
];

/** Pages that keep their own hero: the homepage (video), workspace and sign-in flows. */
const excluded = /^\/($|os(\/|$)|login|signup|forgot-password|reset-password|verify|onboarding)/;

function hash(text: string) {
  let value = 0;
  for (const char of text) value = (value * 31 + char.charCodeAt(0)) >>> 0;
  return value;
}

export function heroScene(path: string): string | undefined {
  if (excluded.test(path)) return undefined;
  const pair = families.find(([pattern]) => pattern.test(path))?.[1] ?? [
    'orbit-guidance',
    'orbit-network',
  ];
  return scene(pair[hash(path) % pair.length]);
}
