import { z } from 'zod';

const verdictSchema = z
  .object({
    verdict: z.enum(['satisfied', 'not_satisfied', 'insufficient_evidence']),
    rationale: z.string().trim().min(1).max(4000),
  })
  .strict();

// The provider's summary carries a structured verdict, never a prose keyword match.
export function parseVerificationVerdict(summary) {
  try {
    const value = verdictSchema.parse(JSON.parse(summary));
    return { result: value.verdict, rationale: value.rationale };
  } catch {
    return {
      result: 'insufficient_evidence',
      rationale: 'The automated review did not return a valid verdict. Human review is required.',
    };
  }
}
