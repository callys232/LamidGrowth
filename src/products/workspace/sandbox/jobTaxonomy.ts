// Browser copy of the server's job taxonomy (src/app/jobTaxonomy.mjs). Server modules under
// src/app cannot be served to the browser (Vite's fs.deny), so the sandbox keeps this copy;
// tests/browser/sandbox-handlers-work.spec.ts fails if the two ever drift.
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
