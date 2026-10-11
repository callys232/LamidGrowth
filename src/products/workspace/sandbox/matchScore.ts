// Browser copy of the server's match scoring (src/app/text.mjs wordSet, src/app/matchScore.mjs
// skillFit). Vite never serves src/app to the browser, so the demo keeps this copy; a drift test
// (tests/browser/sandbox-handlers-work.spec.ts) fails if the two disagree.

const STOP_WORDS = new Set([
  'the',
  'a',
  'an',
  'and',
  'or',
  'to',
  'of',
  'in',
  'on',
  'for',
  'with',
  'is',
  'are',
  'we',
  'you',
  'our',
  'your',
  'this',
  'that',
  'be',
  'will',
  'can',
  'at',
  'as',
  'by',
]);

export const wordSet = (input: string) =>
  new Set(
    input
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((word) => word.length > 2 && !STOP_WORDS.has(word)),
  );

/** Skill fit out of 70, normalised by both sides (Ochiai) so either direction scores the same. */
export function skillFit(profileWords: Set<string>, jobWords: Set<string>) {
  if (profileWords.size === 0 || jobWords.size === 0) return 0;
  let overlap = 0;
  for (const word of profileWords) if (jobWords.has(word)) overlap += 1;
  return Math.round((overlap / Math.sqrt(profileWords.size * jobWords.size)) * 70);
}
