import { useState, type CSSProperties } from 'react';
import { CopyLine } from '../../../../../shared/content/CopyLine';
import content from '../content.json';

type Section = (typeof content.sections)[number];

export type ExpertGroup = { name: string; sections: Section[] };

const MATCH_DOMAINS = [
  {
    id: 'strategy',
    label: 'Strategy',
    requirement: 'Market entry & capital allocation decision',
    evidence: 'Verified sector exits, board advisory history, and jurisdiction fit',
    scope: 'Advisory sprint · Human approval before scope lock',
  },
  {
    id: 'finance',
    label: 'Finance',
    requirement: 'Cash-flow resilience & unit-economics review',
    evidence: 'Active CPA/CFA credential status, audit scope, and industry track record',
    scope: 'Milestone review · Scoped read-only financial context',
  },
  {
    id: 'operations',
    label: 'Operations',
    requirement: 'Supply-chain bottleneck & delivery cadence',
    evidence: 'Verified plant/ops leadership outcomes and conflict check',
    scope: 'Fractional engagement · Shared execution milestones',
  },
  {
    id: 'technology',
    label: 'Technology',
    requirement: 'Architecture review & data governance readiness',
    evidence: 'Systems portfolio evidence, security clearances, and peer references',
    scope: 'Technical assessment · Bounded workspace permissions',
  },
  {
    id: 'legal',
    label: 'Legal & Risk',
    requirement: 'Cross-border regulatory & compliance review',
    evidence: 'Verified licensing issuer, active jurisdiction, and expiry check',
    scope: 'Qualified human sign-off · Auditable evidence trail',
  },
] as const;

const VERIFICATION_STEPS = [
  { label: 'Identity', status: 'Person or organisation confirmed' },
  { label: 'Claims', status: 'Work history & portfolio checked' },
  { label: 'Licensing', status: 'Issuer, jurisdiction & expiry recorded' },
  { label: 'Outcomes', status: 'Permitted evidence without exposure' },
  { label: 'Ongoing', status: 'Refreshed or revoked on change' },
] as const;

/** Used as the band's anchor id so the site nav's 5 "Experts" entries jump directly to their
 * matching section on /experts. See PublicHeader.tsx. */
export function expertGroupSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/&/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Splits the page's flat section list into its real groups — every section that carries a
 * `group` field opens a new phase; the rest belong to whichever phase is currently open. */
export function groupExpertSections(sections: Section[]): ExpertGroup[] {
  const groups: ExpertGroup[] = [];
  for (const section of sections) {
    if ('group' in section && section.group) {
      groups.push({ name: section.group, sections: [section] });
    } else {
      groups[groups.length - 1]!.sections.push(section);
    }
  }
  return groups;
}

function ExpertCard({ section, order }: { section: Section; order: number }) {
  const [title, ...rest] = section.paragraphs;
  return (
    <article className="expert-card">
      <span className="expert-card-num" aria-hidden="true">
        {String(order + 1).padStart(2, '0')}
      </span>
      <h3 data-source-paragraph={title.sourceParagraph}>{title.text}</h3>
      {rest.map((p) => (
        <CopyLine key={p.sourceParagraph} text={p.text} paragraph={p.sourceParagraph} />
      ))}
    </article>
  );
}

function MatchExplorer() {
  const [selectedId, setSelectedId] = useState<string>(MATCH_DOMAINS[0].id);
  const current = MATCH_DOMAINS.find((d) => d.id === selectedId) ?? MATCH_DOMAINS[0];

  return (
    <div className="expert-interactive-panel">
      <div className="expert-domain-pills" role="tablist" aria-label="Sample matching domains">
        {MATCH_DOMAINS.map((domain) => (
          <button
            key={domain.id}
            type="button"
            role="tab"
            aria-selected={domain.id === current.id}
            className={`expert-domain-pill${domain.id === current.id ? ' is-active' : ''}`}
            onClick={() => setSelectedId(domain.id)}
          >
            {domain.label}
          </button>
        ))}
      </div>
      <div className="expert-match-preview" role="tabpanel">
        <div>
          <span className="expert-match-kicker">Requirement</span>
          <p>{current.requirement}</p>
        </div>
        <div>
          <span className="expert-match-kicker">Verified Evidence</span>
          <p>{current.evidence}</p>
        </div>
        <div>
          <span className="expert-match-kicker">Scope & Authority</span>
          <p>{current.scope}</p>
        </div>
      </div>
    </div>
  );
}

function VerificationStrip() {
  return (
    <div className="expert-verify-strip" aria-label="Verification checkpoints">
      {VERIFICATION_STEPS.map((step) => (
        <div className="expert-verify-chip" key={step.label}>
          <span className="expert-verify-dot" aria-hidden="true" />
          <div>
            <strong>{step.label}</strong>
            <span>{step.status}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

/** One phase band: its first section acts as the phase's intro (title + lede, full width),
 * followed by optional interactive preview and a card grid of the remaining sections. */
export function ExpertPhaseBand({
  index,
  group,
  tone,
  accent,
}: {
  index: number;
  group: ExpertGroup;
  tone: 'plain' | 'tint' | 'dark';
  accent?: string;
}) {
  const [intro, ...rest] = group.sections;
  const [introTitle, ...introBody] = intro.paragraphs;
  const slug = expertGroupSlug(group.name);
  const style = accent ? ({ '--band-accent': accent } as CSSProperties) : undefined;

  return (
    <section id={slug} className={`expert-phase expert-phase-${tone}`} style={style}>
      <div className="expert-container">
        <div className="expert-phase-intro">
          <span className="expert-phase-index" aria-hidden="true">
            {String(index + 1).padStart(2, '0')}
          </span>
          <div>
            <span className="expert-eyebrow">{group.name}</span>
            <h2 data-source-paragraph={introTitle.sourceParagraph}>{introTitle.text}</h2>
            {introBody.map((p) => (
              <CopyLine key={p.sourceParagraph} text={p.text} paragraph={p.sourceParagraph} />
            ))}
          </div>
        </div>

        {slug === 'expert-matching' && <MatchExplorer />}
        {slug === 'verification' && <VerificationStrip />}

        {rest.length > 0 && (
          <ul className="expert-card-grid">
            {rest.map((section, idx) => (
              <li key={section.label}>
                <ExpertCard section={section} order={idx} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
