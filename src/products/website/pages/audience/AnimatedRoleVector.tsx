export interface RoleVisualConfig {
  accent: string;
  tint: string;
  photo: string;
  photoAlt: string;
  suites: Array<{ label: string; to: string }>;
  characterVariant: 'solo' | 'pair' | 'builder' | 'leader';
}

export const ROLE_VISUALS: Record<string, RoleVisualConfig> = {
  individuals: {
    accent: '#0284c7',
    tint: 'light-dark(#f0f9ff, rgba(2, 132, 199, 0.14))',
    photo: '/media/solutions/solutions-professionals.jpg',
    photoAlt: 'Individual planning next career and growth steps at a sunlit desk',
    suites: [
      { label: 'Decisions', to: '/product/decisions' },
      { label: 'People & Skills', to: '/product/people' },
    ],
    characterVariant: 'solo',
  },
  professionals: {
    accent: '#0d9488',
    tint: 'light-dark(#f0fdfa, rgba(13, 148, 136, 0.14))',
    photo: '/media/solutions/solutions-professionals.jpg',
    photoAlt: 'Independent professional reviewing structured client briefs',
    suites: [
      { label: 'Strategy', to: '/product/strategy' },
      { label: 'Expert Advisory', to: '/product/advisory' },
    ],
    characterVariant: 'solo',
  },
  creators: {
    accent: '#e11d48',
    tint: 'light-dark(#fff1f2, rgba(225, 29, 72, 0.14))',
    photo: '/media/solutions/solutions-founders.jpg',
    photoAlt: 'Creator turning audience ideas into structured products',
    suites: [
      { label: 'Growth & Change', to: '/product/growth-change' },
      { label: 'Finance', to: '/product/finance' },
    ],
    characterVariant: 'builder',
  },
  founders: {
    accent: '#d97706',
    tint: 'light-dark(#fffbeb, rgba(217, 119, 6, 0.14))',
    photo: '/media/solutions/solutions-founders.jpg',
    photoAlt: 'Founder reviewing cash runway and strategic priorities',
    suites: [
      { label: 'Strategy', to: '/product/strategy' },
      { label: 'Finance', to: '/product/finance' },
      { label: 'Decisions', to: '/product/decisions' },
    ],
    characterVariant: 'leader',
  },
  teams: {
    accent: '#059669',
    tint: 'light-dark(#ecfdf5, rgba(5, 150, 105, 0.14))',
    photo: '/media/solutions/solutions-teams.jpg',
    photoAlt: 'Cross-functional team collaborating around a shared workspace',
    suites: [
      { label: 'Operations', to: '/product/operations' },
      { label: 'People & Skills', to: '/product/people' },
    ],
    characterVariant: 'pair',
  },
  smes: {
    accent: '#4f46e5',
    tint: 'light-dark(#eef2ff, rgba(79, 70, 229, 0.14))',
    photo: '/media/solutions/solutions-teams.jpg',
    photoAlt: 'Growing business leaders aligning operations and cash flow',
    suites: [
      { label: 'Operations', to: '/product/operations' },
      { label: 'Finance', to: '/product/finance' },
      { label: 'Growth & Change', to: '/product/growth-change' },
    ],
    characterVariant: 'pair',
  },
  enterprises: {
    accent: '#7c3aed',
    tint: 'light-dark(#f5f3ff, rgba(124, 58, 237, 0.14))',
    photo: '/media/solutions/solutions-enterprise.jpg',
    photoAlt: 'Enterprise leaders aligning governance and portfolio strategy',
    suites: [
      { label: 'Risk & Governance', to: '/product/risk-governance' },
      { label: 'Strategy', to: '/product/strategy' },
      { label: 'Decisions', to: '/product/decisions' },
    ],
    characterVariant: 'leader',
  },
  organisations: {
    accent: '#7c3aed',
    tint: 'light-dark(#f5f3ff, rgba(124, 58, 237, 0.14))',
    photo: '/media/solutions/solutions-enterprise.jpg',
    photoAlt: 'Enterprise leaders aligning governance and portfolio strategy',
    suites: [
      { label: 'Risk & Governance', to: '/product/risk-governance' },
      { label: 'Strategy', to: '/product/strategy' },
      { label: 'Decisions', to: '/product/decisions' },
    ],
    characterVariant: 'leader',
  },
  institutions: {
    accent: '#0891b2',
    tint: 'light-dark(#ecfeff, rgba(8, 145, 178, 0.14))',
    photo: '/media/solutions/solutions-enterprise.jpg',
    photoAlt: 'Institutional governance team reviewing compliance and outcomes',
    suites: [
      { label: 'Risk & Governance', to: '/product/risk-governance' },
      { label: 'Expert Advisory', to: '/product/advisory' },
    ],
    characterVariant: 'leader',
  },
  'social-community': {
    accent: '#0891b2',
    tint: 'light-dark(#ecfeff, rgba(8, 145, 178, 0.14))',
    photo: '/media/solutions/solutions-teams.jpg',
    photoAlt: 'Community and mission teams coordinating programmes reliably',
    suites: [
      { label: 'Operations', to: '/product/operations' },
      { label: 'Risk & Governance', to: '/product/risk-governance' },
    ],
    characterVariant: 'pair',
  },
};

/** Animated SVG vector character with moving nodes, gesturing arm, and floating signals. */
export function AnimatedRoleCharacter({
  variant = 'solo',
  accent = '#0284c7',
}: {
  variant?: 'solo' | 'pair' | 'builder' | 'leader';
  accent?: string;
}) {
  return (
    <svg
      className="aud-char-svg"
      viewBox="0 0 180 140"
      fill="none"
      aria-hidden="true"
      style={{ '--char-accent': accent } as React.CSSProperties}
    >
      {/* Orbiting background pulse rings */}
      <circle className="aud-char-ring" cx="90" cy="70" r="54" stroke={accent} strokeWidth="1.2" strokeDasharray="4 4" opacity="0.35" />
      <circle className="aud-char-node aud-node-1" cx="38" cy="42" r="5" fill={accent} />
      <circle className="aud-char-node aud-node-2" cx="144" cy="38" r="6" fill={accent} opacity="0.7" />
      <circle className="aud-char-node aud-node-3" cx="148" cy="102" r="4.5" fill={accent} opacity="0.85" />

      {variant === 'pair' ? (
        <>
          {/* Left Character */}
          <g className="aud-char-body">
            <circle cx="64" cy="52" r="13" fill={accent} />
            <path d="M44 106C44 86 52 74 64 74C76 74 84 86 84 106" fill={accent} fillOpacity="0.22" stroke={accent} strokeWidth="2.5" strokeLinecap="round" />
          </g>
          {/* Right Character */}
          <g className="aud-char-body-delay">
            <circle cx="116" cy="54" r="12" fill="#0d1a2b" className="aud-char-ink" />
            <path d="M97 106C97 87 105 76 116 76C127 76 135 87 135 106" fill={accent} fillOpacity="0.14" stroke={accent} strokeWidth="2.5" strokeLinecap="round" />
          </g>
          {/* Passing signal arc between pair */}
          <path className="aud-char-signal" d="M76 62C84 52 96 52 104 62" stroke={accent} strokeWidth="2.2" strokeLinecap="round" strokeDasharray="4 3" />
        </>
      ) : (
        <>
          {/* Center Hero Character */}
          <g className="aud-char-body">
            <circle cx="90" cy="48" r="14" fill={accent} />
            <path d="M64 110C64 85 75 72 90 72C105 72 116 85 116 110" fill={accent} fillOpacity="0.2" stroke={accent} strokeWidth="2.5" strokeLinecap="round" />
            {/* Animated gesturing arm */}
            <path className="aud-char-arm" d="M108 82L130 64" stroke={accent} strokeWidth="3.5" strokeLinecap="round" />
          </g>
          {/* Floating decision card held in air */}
          <g className="aud-char-float-card">
            <rect x="118" y="42" width="38" height="24" rx="6" fill="currentColor" fillOpacity="0.08" stroke={accent} strokeWidth="1.6" />
            <path d="M125 51H148M125 57H140" stroke={accent} strokeWidth="2" strokeLinecap="round" />
          </g>
        </>
      )}
    </svg>
  );
}
