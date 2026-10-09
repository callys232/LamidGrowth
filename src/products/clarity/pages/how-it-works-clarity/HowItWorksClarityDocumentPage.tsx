import { DocumentPageLayout } from '../../../../shared/content/DocumentPageLayout';
import type { DocumentPageProps } from '../../../../shared/content/types';
import content from './content.json';
import './clarity-public.css';
import { ToolReadMore } from '../../../../shared/content/ToolReadMore';
import { ClarityEngineDiagram } from './ClarityEngineDiagram';
import {
  HowItWorksClarityHeroSlide,
  ReduceNoiseSlide1,
  UnderstandContextSlide2,
  RevealPatternsSlide3,
  BetterActionStartsWithBetterUnderstandingSlide4,
} from './slides';

/** /how-it-works/clarity — sections in reading order. */
export function HowItWorksClarityDocumentPage({ embedded = false }: DocumentPageProps) {
  const [activeCard, setActiveCard] = useState<string | null>(null);
  const cardInteraction = (id: string) => ({
    tabIndex: 0,
    'data-active': activeCard === id,
    onFocus: () => setActiveCard(id),
    onPointerDown: () => setActiveCard(id),
    onKeyDown: (event: React.KeyboardEvent<HTMLElement>) => {
      if (event.target !== event.currentTarget) return;
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        setActiveCard(id);
      }
    },
  });
  return (
    <DocumentPageLayout
      page={content}
      embedded={embedded}
      heroOrbit
      hero={<HowItWorksClarityHeroSlide embedded={embedded} />}
    >
      {embedded ? (
        <>
          <ReduceNoiseSlide1 embedded />
          <UnderstandContextSlide2 embedded />
          <RevealPatternsSlide3 embedded />
        </>
      ) : (
        <div className="clarity-feature-grid">
          {content.sections.slice(0, 3).map((section, index) => {
            const Icon = [Filter, ScanSearch, Network][index];
            const paragraph = section.paragraphs[1];
            return (
              <article
                className="clarity-feature-card"
                key={section.title}
                {...cardInteraction(section.title)}
              >
                <div className="clarity-feature-top">
                  <span className="clarity-feature-icon">
                    <Icon size={26} strokeWidth={1.6} aria-hidden="true" />
                  </span>
                  <span className="clarity-feature-number" aria-hidden="true">
                    0{index + 1}
                  </span>
                </div>
                <h2>{section.title}</h2>
                <p data-source-paragraph={paragraph.sourceParagraph}>{paragraph.text}</p>
              </article>
            );
          })}
        </div>
      )}
      {embedded ? (
        <BetterActionStartsWithBetterUnderstandingSlide4 embedded />
      ) : (
        <section className="clarity-suite" aria-labelledby="clarity-suite-title">
          <div className="clarity-suite-heading">
            <span className="clarity-suite-label">INSIDE THE CLARITY SUITE</span>
            <h2 id="clarity-suite-title">Understand the situation. Choose your next move.</h2>
            <p>
              Clarity brings Strategy and Decisions tools together. Start with a question, supply
              the relevant evidence, and use the results to support your judgment.
            </p>
          </div>
          <div className="clarity-suite-grid">
            <article className="clarity-suite-card" {...cardInteraction('engine')}>
              <span className="clarity-suite-label">01 / THE ENGINE</span>
              <h3>From a question to a clearer picture</h3>
              <ol className="clarity-engine-steps">
                <li>
                  <strong>Define your question</strong>
                  <span>Identify what you want to understand.</span>
                </li>
                <li>
                  <strong>Choose a tool</strong>
                  <span>Select the tool that fits your question.</span>
                </li>
                <li>
                  <strong>Provide the inputs</strong>
                  <span>Add the information the tool requires.</span>
                </li>
                <li>
                  <strong>Review the analysis</strong>
                  <span>Consider its scope and limitations, then decide what to do next.</span>
                </li>
              </ol>
            </article>
            <article className="clarity-suite-card" {...cardInteraction('strategy')}>
              <span className="clarity-suite-label">02 / STRATEGY TOOLS</span>
              <h3>Find what matters most</h3>
              <ToolReadMore label="strategy tools">
                <ul>
                  <li>
                    <strong>Purpose &amp; Strategic Direction</strong>
                    <span>Check whether purpose, values, and priorities guide your decisions.</span>
                  </li>
                  <li>
                    <strong>Strategy Alignment Matrix</strong>
                    <span>
                      Connect objectives to initiatives and spending; spot gaps in support.
                    </span>
                  </li>
                  <li>
                    <strong>Strategic Priority Ranking</strong>
                    <span>Compare priorities against weighted criteria.</span>
                  </li>
                  <li>
                    <strong>External Environment Scan</strong>
                    <span>Rank external factors by impact and likelihood.</span>
                  </li>
                </ul>
              </ToolReadMore>
            </article>
            <article className="clarity-suite-card" {...cardInteraction('decisions')}>
              <span className="clarity-suite-label">03 / DECISION TOOLS</span>
              <h3>Compare before you commit</h3>
              <ToolReadMore label="decisions tools">
                <ul>
                  <li>
                    <strong>Decision Quality</strong>
                    <span>Assess a decision and identify its weakest requirement.</span>
                  </li>
                  <li>
                    <strong>Option Comparison</strong>
                    <span>Score alternatives and see how sensitive the winner is.</span>
                  </li>
                  <li>
                    <strong>Scenarios &amp; Expected Value</strong>
                    <span>Compare options across possible futures.</span>
                  </li>
                  <li>
                    <strong>Priority Conflict Check</strong>
                    <span>Find competing objectives with unresolved trade-offs.</span>
                  </li>
                </ul>
              </ToolReadMore>
            </article>
            <article className="clarity-suite-card" {...cardInteraction('next-step')}>
              <span className="clarity-suite-label">04 / YOUR NEXT STEP</span>
              <h3 data-source-paragraph={251}>{content.sections[3].title}</h3>
              <p data-source-paragraph={252}>{content.sections[3].paragraphs[1].text}</p>
              <Link className="clarity-suite-link" to="/os/engines">
                Explore the tools <span aria-hidden="true">↗</span>
              </Link>
            </article>
          </div>
        </section>
      )}
      {!embedded && <ClarityEngineDiagram />}
    </DocumentPageLayout>
  );
}
import { Filter, ScanSearch, Network } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useState } from 'react';
