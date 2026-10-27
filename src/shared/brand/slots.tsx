import './brand.css';

/** Client logos need permission before use; slots stay labelled until then. */
export function LogoStrip({ names }: { names: readonly string[] }) {
  return (
    <div className="brand-logos" aria-label="Client logos pending permission">
      {names.map((name) => (
        <div key={name} className="brand-slot">
          <span>{name}</span>
          <small>logo pending</small>
        </div>
      ))}
    </div>
  );
}

export interface ProofStat {
  value: string;
  label: string;
  verified: boolean;
}

/** Unverified figures render with an explicit note so they cannot ship by accident. */
export function StatRow({ stats, pillar }: { stats: readonly ProofStat[]; pillar?: string }) {
  return (
    <div className="brand-stats" data-pillar={pillar}>
      {stats.map((stat) => (
        <div className="brand-stat" key={stat.label}>
          <strong>{stat.value}</strong>
          <span>{stat.label}</span>
          {!stat.verified && <em>needs verification</em>}
        </div>
      ))}
    </div>
  );
}

export const brochureClients = [
  'Unilever Nigeria',
  'Access Bank',
  'UNDP',
  'Shell (SPDC)',
  'Lafarge',
  'USAID',
  'British Council',
  'Lagos State',
] as const;

export const brochureStats: readonly ProofStat[] = [
  { value: '1988', label: 'Advising businesses since', verified: false },
  { value: '3,000+', label: 'SMEs supported', verified: false },
  { value: '5,000+', label: 'Talents trained', verified: false },
  { value: '300+', label: 'Unilever staff moved into entrepreneurship', verified: false },
];
