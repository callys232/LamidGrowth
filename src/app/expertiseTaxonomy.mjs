// Expert Network taxonomy — domain/function/industry, independent of the job-posting
// category taxonomy in jobTaxonomy.mjs. Attached to talent profiles, not job posts.
export const DOMAINS = [
  'Strategy and consulting',
  'Finance',
  'Marketing and growth',
  'Sales and partnerships',
  'Product and design',
  'Technology and engineering',
  'Data and analytics',
  'People and organization',
  'Legal and compliance',
  'Operations and supply chain',
  'Healthcare',
  'Creative and media',
];

export const FUNCTIONS = [
  'Corporate strategy',
  'M&A and due diligence',
  'Financial planning and analysis',
  'Fundraising and investor relations',
  'Growth strategy',
  'Brand and positioning',
  'Performance marketing',
  'Business development',
  'Product management',
  'UX research and design',
  'Software architecture',
  'Data engineering',
  'Machine learning',
  'Talent acquisition',
  'Organizational design',
  'Regulatory compliance',
  'Contract and commercial law',
  'Supply chain and logistics',
  'Clinical operations',
  'Content strategy',
];

// Seniority and Engagement axes (spec 19.2) — the two axes of the expertise ontology that had no
// representation anywhere in the domain model; everything else (domain/function/industry/
// jurisdiction/evidence/availability) already existed on talent_profiles.
export const SENIORITY = ['Specialist', 'Senior specialist', 'Lead', 'Executive', 'Fractional leader'];

export const ENGAGEMENT_MODELS = [
  'Advisory',
  'Project',
  'Milestone',
  'Retainer',
  'Fractional',
  'Workshop',
  'Coaching',
  'Assessment',
  'Expert pod',
];

export const INDUSTRIES = [
  'Financial services',
  'Fintech',
  'Healthcare',
  'Manufacturing',
  'Retail and e-commerce',
  'Technology and SaaS',
  'Media and entertainment',
  'Real estate',
  'Education',
  'Energy and utilities',
  'Government and public sector',
  'Nonprofit',
];
