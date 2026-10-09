import { Compass, Sparkles, ChartNoAxesCombined } from 'lucide-react';
import { CopyLine } from '../../../../shared/content/CopyLine';
import { ToolReadMore } from '../../../../shared/content/ToolReadMore';
import content from './content.json';
import tools from './creator-tools.json';
import './creators.css';

export function CreatorsContent() {
  const icons = [Compass, Sparkles, ChartNoAxesCombined];
  const closing = content.sections[3];
  return (
    <div className="creators-content">
      <div className="creators-stages">
        {content.sections.slice(0, 3).map((section, index) => {
          const Icon = icons[index];
          return (
            <article className="creator-stage" key={section.title} tabIndex={0}>
              <div className="creator-stage-marker">
                <Icon size={26} aria-hidden="true" />
                <span>0{index + 1}</span>
              </div>
              <h2 data-source-paragraph={section.paragraphs[0].sourceParagraph}>{section.title}</h2>
              <p data-source-paragraph={section.paragraphs[1].sourceParagraph}>
                {section.paragraphs[1].text}
              </p>
              <ul className="creator-tool-names" aria-label={`${section.title} tools`}>
                {tools[index].map((tool) => (
                  <li key={tool.id}>{tool.name}</li>
                ))}
              </ul>
              <ToolReadMore label={section.title}>
                <ul className="creator-tool-details">
                  {tools[index].map((tool) => (
                    <li key={tool.id} data-tool-id={tool.id}>
                      <strong>{tool.name}</strong>
                      <p>{tool.purpose}</p>
                    </li>
                  ))}
                </ul>
              </ToolReadMore>
            </article>
          );
        })}
      </div>
      <section className="creator-closing" aria-labelledby="creator-closing-title">
        <div className="creator-path" aria-label="Creator tools and areas">
          {tools.map((group, index) => (
            <div key={index}>
              <span>0{index + 1}</span>
              <strong>{[...new Set(group.map((tool) => tool.area))].join(' + ')}</strong>
            </div>
          ))}
        </div>
        <div className="creator-closing-copy">
          <h2
            id="creator-closing-title"
            data-source-paragraph={closing.paragraphs[0].sourceParagraph}
          >
            {closing.title}
          </h2>
          <p data-source-paragraph={closing.paragraphs[1].sourceParagraph}>
            {closing.paragraphs[1].text}
          </p>
          <CopyLine
            text={closing.paragraphs[2].text}
            paragraph={closing.paragraphs[2].sourceParagraph}
          />
        </div>
      </section>
    </div>
  );
}
