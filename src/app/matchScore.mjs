/** Skill fit between a talent profile and a job, out of 70, used by both matching directions
 * (/talent/job-matches and /jobs/:id/candidate-matches). The overlap is normalised by the
 * geometric mean of both word sets (Ochiai), so the score is the same whichever side asks, and a
 * short keyword-dense headline cannot outrank a broader profile that overlaps more.
 * Browser copy for the demo sandbox: src/products/workspace/sandbox/matchScore.ts (drift-tested). */
export function skillFit(profileWords, jobWords) {
  if (profileWords.size === 0 || jobWords.size === 0) return 0;
  let overlap = 0;
  for (const word of profileWords) if (jobWords.has(word)) overlap += 1;
  return Math.round((overlap / Math.sqrt(profileWords.size * jobWords.size)) * 70);
}
