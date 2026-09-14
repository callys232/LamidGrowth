// A small, honest keyword list, not a real compliance engine. Shared by the scoping risk-band
// classifier and the Companion agent's handoff trigger so "this needs a licensed human" is
// judged the same way in both places, instead of two independently-drifting lists.
export const REGULATED_KEYWORDS = [
  'legal',
  'medical',
  'health',
  'healthcare',
  'clinical',
  'financial advice',
  'investment advice',
  'tax advice',
  'safety-critical',
  'compliance',
  'licensed',
  'licence',
  'license',
  'regulatory',
];
