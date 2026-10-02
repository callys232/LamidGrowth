/** Background stills for public page heroes, taken from the homepage hero video so every
 * page shares its look without repeating the same image. Each area of the site gets a pair of
 * scenes; pages within an area alternate between them so neighbouring pages differ. */

const scene = (name: string) => `/media/scenes/${name}.jpg`;

const families: [RegExp, string[]][] = [
  [/^\/product/, ['office-view', 'glass-city']],
  [/^\/how-it-works/, ['street-canyon', 'towers-up']],
  [/^\/who-its-for/, ['towers-up', 'art-deco']],
  [/^\/(enterprise|security|responsible-ai|trust)/, ['glass-city', 'spire-close']],
  [/^\/(pricing|demo|start)/, ['spire-clouds', 'office-view']],
  [/^\/experts/, ['office-view', 'glass-city']],
  [/^\/(resources|insights|guides|case-studies|research)/, ['art-deco', 'spire-clouds']],
  [/^\/(help|support|developers|integrations)/, ['spire-close', 'street-canyon']],
  [/^\/(about|careers|press|contact)/, ['office-view', 'art-deco']],
  [/^\/(legal|accessibility)/, ['glass-city', 'street-canyon']],
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
    'spire-clouds',
    'glass-city',
  ];
  return scene(pair[hash(path) % pair.length]);
}
