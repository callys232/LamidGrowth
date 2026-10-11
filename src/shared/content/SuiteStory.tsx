import { useState, type ReactNode, type KeyboardEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  Sparkles,
  Users,
  Layers,
  ArrowRight,
  Activity,
  ShieldCheck,
  ClipboardCheck,
} from 'lucide-react';
import { DocumentPageLayout } from './DocumentPageLayout';
import type { DocumentPage } from './types';
import tools from './suite-tools.json';
import './suite-story.css';
import { ToolReadMore } from './ToolReadMore';

type Suite = 'Capability' | 'Consistency';
const config = {
  Capability: {
    heading: 'Build the ability to take the next step.',
    description:
      'The Capability suite brings People engines together to understand skills, plan capacity, and prepare people for what comes next.',
    groups: ['People'],
    input: 'Role requirements + people evidence',
    outcome: 'A clearer development priority',
    steps: [
      'Define the role or capability need.',
      'Provide current skills and people evidence.',
      'Review gaps, coverage, and readiness.',
      'Choose what to develop or access next.',
    ],
  },
  Consistency: {
    heading: 'Keep delivery steady. Make room to adapt.',
    description:
      'The Consistency suite connects Operations, Risk, and Governance engines to examine delivery, surface warning signs, and review commitments.',
    groups: ['Operations', 'Risk', 'Governance'],
    input: 'Delivery data + risks + commitments',
    outcome: 'A clearer review and action priority',
    steps: [
      'Define the work and review cadence.',
      'Provide delivery, risk, or obligations data.',
      'Review signals, owners, and overdue actions.',
      'Adjust the next action using the evidence.',
    ],
  },
};

export function SuiteStory({
  page,
  suite,
  hero,
}: {
  page: DocumentPage;
  suite: Suite;
  hero: ReactNode;
}) {
  const [active, setActive] = useState<string | null>(null);
  const [activeStep, setActiveStep] = useState<number | null>(null);
  const settings = config[suite];
  const catalog = tools[suite];
  const icons =
    suite === 'Capability' ? [Layers, Users, Sparkles] : [ArrowRight, Activity, ClipboardCheck];
  const interaction = (id: string) => ({
    tabIndex: 0,
    'data-active': active === id,
    onFocus: () => setActive(id),
    onPointerDown: () => setActive(id),
    onKeyDown: (event: KeyboardEvent<HTMLElement>) => {
      if (event.target === event.currentTarget && ['Enter', ' '].includes(event.key)) {
        event.preventDefault();
        setActive(id);
      }
    },
  });
  return (
    <div className={`suite-story suite-story-${suite.toLowerCase()}`}>
      <DocumentPageLayout page={page} hero={hero}>
        <div className="suite-benefits">
          {page.sections.slice(0, 3).map((section, index) => {
            const Icon = icons[index];
            return (
              <article
                className="suite-card suite-benefit"
                key={section.title}
                {...interaction(section.title)}
              >
                <span className="suite-step">0{index + 1}</span>
                <span className="suite-icon">
                  <Icon size={28} strokeWidth={1.5} aria-hidden="true" />
                </span>
                <h2>{section.title}</h2>
                {section.paragraphs
                  .slice(1)
                  .filter((p) => !p.text.startsWith('CTA:'))
                  .map((p) => (
                    <p key={p.sourceParagraph} data-source-paragraph={p.sourceParagraph}>
                      {p.text.replace(/^•\s*/, '')}
                    </p>
                  ))}
              </article>
            );
          })}
        </div>
        <section className="suite-education" aria-labelledby={`suite-heading-${suite}`}>
          <header className="suite-heading">
            <span className="suite-eyebrow">INSIDE THE {suite.toUpperCase()} SUITE</span>
            <h2 id={`suite-heading-${suite}`}>{settings.heading}</h2>
            <p>{settings.description}</p>
          </header>
          <div className="suite-tool-grid">
            <article className="suite-card suite-process" {...interaction('process')}>
              <span className="suite-eyebrow">HOW THE ENGINE WORKS</span>
              <h3>Evidence in. Understanding out.</h3>
              <ol>
                {settings.steps.map((step, index) => (
                  <li key={step}>
                    <button
                      type="button"
                      className="suite-process-step"
                      aria-pressed={activeStep === index}
                      onClick={() => setActiveStep(index)}
                    >
                      <span className="suite-process-step-number" aria-hidden="true">
                        0{index + 1}
                      </span>
                      <span>{step}</span>
                    </button>
                  </li>
                ))}
              </ol>
              <p>Review each engine’s scope and limitations. You make the final decision.</p>
            </article>
            {settings.groups.map((area) => (
              <article className="suite-card suite-tool-group" key={area} {...interaction(area)}>
                <span className="suite-icon">
                  {area === 'Risk' ? (
                    <ShieldCheck aria-hidden="true" />
                  ) : area === 'Governance' ? (
                    <ClipboardCheck aria-hidden="true" />
                  ) : (
                    <Users aria-hidden="true" />
                  )}
                </span>
                <span className="suite-eyebrow">{area.toUpperCase()} ENGINES</span>
                <h3>
                  {area === 'People'
                    ? 'Prepare people for the work ahead'
                    : area === 'Operations'
                      ? 'Understand how work flows'
                      : area === 'Risk'
                        ? 'Spot what could interrupt progress'
                        : 'Keep commitments visible'}
                </h3>
                <ToolReadMore label={`${area} engines`}>
                  <ul>
                    {catalog
                      .filter((tool) => tool.area === area)
                      .map((tool) => (
                        <li key={tool.id}>
                          <strong>{tool.name}</strong>
                          <span>{tool.purpose}</span>
                        </li>
                      ))}
                  </ul>
                </ToolReadMore>
              </article>
            ))}
          </div>
        </section>
        <div className="suite-context-grid">
          {page.sections.slice(3).map((section) => (
            <article className="suite-card" key={section.title} {...interaction(section.title)}>
              <span className="suite-eyebrow">PUT IT INTO PRACTICE</span>
              <h3>{section.title}</h3>
              {section.paragraphs
                .slice(1)
                .filter((p) => !p.text.startsWith('CTA:'))
                .map((p) => (
                  <p key={p.sourceParagraph} data-source-paragraph={p.sourceParagraph}>
                    {p.text}
                  </p>
                ))}
            </article>
          ))}
        </div>
        <section className="suite-vector-slide" aria-labelledby={`suite-map-${suite}`}>
          <header className="suite-heading">
            <span className="suite-eyebrow">THE ENGINE AT A GLANCE</span>
            <h2 id={`suite-map-${suite}`}>
              {suite === 'Capability'
                ? 'A foundation for your next stage.'
                : 'A connected system for reliable progress.'}
            </h2>
            <p>Representative engines in the {suite} suite. Analysis supports your judgment.</p>
          </header>
          <div className="suite-vector-frame">
            <svg
              viewBox={suite === 'Capability' ? '0 0 900 620' : '0 0 900 500'}
              role="img"
              aria-labelledby={`suite-svg-title-${suite} suite-svg-desc-${suite}`}
            >
              <title id={`suite-svg-title-${suite}`}>{suite} suite and engines</title>
              <desc id={`suite-svg-desc-${suite}`}>
                {settings.input} informs the {suite} suite. It includes {settings.groups.join(', ')}{' '}
                engines: {catalog.map((t) => t.name).join(', ')}. Analysis, scope, and limitations
                support {settings.outcome.toLowerCase()}. You make the final decision.
              </desc>
              <rect x="210" y="16" width="480" height="62" rx="20" className="suite-svg-input" />
              <text x="450" y="54" textAnchor="middle" className="suite-svg-copy">
                {settings.input}
              </text>
              {suite === 'Capability' ? (
                <>
                  <path d="M450 78V120M450 236V277M450 477V526" className="suite-svg-line" />
                  <rect
                    x="255"
                    y="120"
                    width="390"
                    height="116"
                    rx="32"
                    className="suite-svg-core"
                  />
                  <text x="450" y="172" textAnchor="middle" className="suite-svg-title">
                    CAPABILITY
                  </text>
                  <text x="450" y="204" textAnchor="middle" className="suite-svg-light">
                    PEOPLE ENGINE / SUITE
                  </text>
                  <rect
                    x="55"
                    y="277"
                    width="790"
                    height="200"
                    rx="24"
                    className="suite-svg-panel"
                  />
                  {catalog.map((tool, index) => (
                    <g key={tool.id}>
                      <circle
                        cx={index < 3 ? 80 : 475}
                        cy={319 + (index % 3) * 56}
                        r="4"
                        className="suite-svg-core"
                      />
                      <text
                        x={index < 3 ? 98 : 493}
                        y={325 + (index % 3) * 56}
                        className="suite-svg-tool"
                      >
                        {tool.name}
                      </text>
                    </g>
                  ))}
                </>
              ) : (
                <>
                  <path
                    d="M450 78V92M450 176V190H155V204M450 190V204M450 190H745V204M155 378V394H450M745 378V394H450V412"
                    className="suite-svg-line"
                  />
                  <rect x="240" y="92" width="420" height="84" rx="30" className="suite-svg-core" />
                  <text x="450" y="129" textAnchor="middle" className="suite-svg-title">
                    CONSISTENCY
                  </text>
                  <text x="450" y="155" textAnchor="middle" className="suite-svg-light">
                    OPERATIONS · RISK · GOVERNANCE
                  </text>
                  {settings.groups.map((area, index) => (
                    <g key={area}>
                      <rect
                        x={20 + index * 295}
                        y="204"
                        width="270"
                        height="174"
                        rx="22"
                        className="suite-svg-panel"
                      />
                      <text
                        x={155 + index * 295}
                        y="237"
                        textAnchor="middle"
                        className="suite-svg-copy"
                      >
                        {area.toUpperCase()}
                      </text>
                      {catalog
                        .filter((t) => t.area === area)
                        .slice(0, 4)
                        .map((tool, j) => (
                          <text
                            key={tool.id}
                            x={155 + index * 295}
                            y={269 + j * 29}
                            textAnchor="middle"
                            className="suite-svg-tool"
                          >
                            {tool.name === 'Commitments & Obligations Register'
                              ? 'Commitments & Obligations'
                              : tool.name}
                          </text>
                        ))}
                    </g>
                  ))}
                </>
              )}
              <rect
                x="170"
                y={suite === 'Capability' ? 526 : 412}
                width="560"
                height={suite === 'Capability' ? 78 : 66}
                rx="22"
                className="suite-svg-core"
              />
              <text
                x="450"
                y={suite === 'Capability' ? 558 : 440}
                textAnchor="middle"
                className="suite-svg-light"
              >
                Analysis + scope + limitations
              </text>
              <text
                x="450"
                y={suite === 'Capability' ? 585 : 466}
                textAnchor="middle"
                className="suite-svg-outcome"
              >
                {settings.outcome}
              </text>
            </svg>
          </div>
          <Link to="/os/engines" className="suite-cta">
            Explore the {suite} engines <ArrowRight size={17} aria-hidden="true" />
          </Link>
        </section>
      </DocumentPageLayout>
    </div>
  );
}
