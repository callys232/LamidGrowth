import type { CopySection } from './types';

export function SectionIndex({
  sections,
  active,
  onSelect,
}: {
  sections: CopySection[];
  active: string;
  onSelect: (id: string) => void;
}) {
  return (
    <nav className="section-index" aria-label="On this page">
      <span className="section-index-label">On this page</span>
      <div className="section-index-links">
        {sections.map((section, i) => {
          const id = `section-${section.paragraphs[0].sourceParagraph}`;
          return (
            <a
              key={id}
              href={`#${id}`}
              aria-current={active === id ? 'location' : undefined}
              onClick={() => onSelect(id)}
            >
              <span aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
              {section.title}
            </a>
          );
        })}
      </div>
    </nav>
  );
}
