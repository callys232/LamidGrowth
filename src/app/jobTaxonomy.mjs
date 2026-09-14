// Single source of truth for job categories/project types, shared between app.mjs (job
// posting validation) and estimator.mjs (estimate heuristic) without either importing
// the other.
export const JOB_CATEGORIES = [
  'Strategy and consulting',
  'Business operations',
  'Finance and accounting',
  'Marketing and growth',
  'Sales and partnerships',
  'Product management',
  'UX/UI design',
  'Software engineering',
  'Data and analytics',
  'AI and automation',
  'Content and communications',
  'Research',
  'People and recruiting',
  'Legal and compliance',
  'Administration and support',
  'Creative and media',
];

export const PROJECT_TYPES = [
  'Fixed-scope project',
  'Ongoing retainer',
  'Hourly engagement',
  'Short-term contract',
  'Long-term contract',
  'Advisory engagement',
  'Audit or assessment',
  'Implementation',
  'Research assignment',
  'Training or workshop',
];
