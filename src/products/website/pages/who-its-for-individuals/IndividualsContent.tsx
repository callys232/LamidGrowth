import { useState, type KeyboardEvent } from 'react';
import { Compass, Layers, CalendarCheck } from 'lucide-react';
import { CopyLine } from '../../../../shared/content/CopyLine';
import content from './content.json';
import './individuals.css';

export function IndividualsContent() {
  const [active, setActive] = useState<number | null>(null);
  const icons = [Compass, Layers, CalendarCheck];
  const personal = content.sections[3];
  return (
    <div className="individuals-content">
      <div className="individuals-card-grid">
        {content.sections.slice(0, 3).map((section, index) => {
          const Icon = icons[index];
          return (
            <article
              key={section.title}
              className="individuals-card"
              tabIndex={0}
              data-active={active === index}
              onFocus={() => setActive(index)}
              onClick={() => setActive(index)}
              onKeyDown={(event: KeyboardEvent<HTMLElement>) => {
                if (['Enter', ' '].includes(event.key)) {
                  event.preventDefault();
                  setActive(index);
                }
              }}
            >
              <div className="individuals-card-top">
                <span className="individuals-icon">
                  <Icon size={28} strokeWidth={1.5} aria-hidden="true" />
                </span>
                <span aria-hidden="true">0{index + 1}</span>
              </div>
              <h2 data-source-paragraph={section.paragraphs[0].sourceParagraph}>{section.title}</h2>
              <p data-source-paragraph={section.paragraphs[1].sourceParagraph}>
                {section.paragraphs[1].text}
              </p>
            </article>
          );
        })}
      </div>
      <section className="individuals-personal" aria-labelledby="individuals-personal-title">
        <div className="individuals-context-visual">
          <svg viewBox="0 0 440 340" role="img" aria-labelledby="individuals-visual-title">
            <title id="individuals-visual-title">{content.description}</title>
            <rect
              x="28"
              y="28"
              width="384"
              height="284"
              rx="28"
              fill="#fff"
              fillOpacity=".07"
              stroke="#ffffff30"
            />
            <circle cx="220" cy="104" r="30" fill="none" stroke="#f4dcb8" strokeWidth="2" />
            <path d="M172 169c0-40 96-40 96 0" fill="none" stroke="#f4dcb8" strokeWidth="2" />
            {content.sections.slice(0, 3).map((s, i) => (
              <g key={s.title}>
                <rect
                  x="72"
                  y={192 + i * 34}
                  width="296"
                  height="28"
                  rx="14"
                  fill="#f4dcb8"
                  fillOpacity=".12"
                />
                <text x="220" y={211 + i * 34} textAnchor="middle" fill="#fff5e7" fontSize="14">
                  {s.title}
                </text>
              </g>
            ))}
          </svg>
        </div>
        <div className="individuals-personal-copy">
          <h2
            id="individuals-personal-title"
            data-source-paragraph={personal.paragraphs[0].sourceParagraph}
          >
            {personal.title}
          </h2>
          <p data-source-paragraph={personal.paragraphs[1].sourceParagraph}>
            {personal.paragraphs[1].text}
          </p>
          <CopyLine
            text={personal.paragraphs[2].text}
            paragraph={personal.paragraphs[2].sourceParagraph}
          />
        </div>
      </section>
    </div>
  );
}
