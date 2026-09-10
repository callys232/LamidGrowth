import {
  ArrowRight,
  Check,
  Compass,
  Layers3,
  ListChecks,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { useRef, useState, type KeyboardEvent } from 'react';
import { sourcePage } from '../../../../../shared/content/sourcePage';
import home from '../content.json';
import { DemoAccessSlide } from '../../../slides/DemoAccessSlide';

const previews = [
  { name: 'Clarity', icon: Compass, route: '/how-it-works/clarity' },
  { name: 'Capability', icon: Layers3, route: '/how-it-works/capability' },
  { name: 'Consistency', icon: ListChecks, route: '/how-it-works/consistency' },
].map((item) => {
  const copy = sourcePage(item.route)!;
  return {
    ...item,
    label: copy.name,
    title: copy.title,
    description: copy.description,
    rows: copy.sections.slice(0, 3).map((section) => section.title),
  };
});

/** An interactive illustration, not a live account or a simulated completed workflow. */
export function WorkspacePreview() {
  const [selected, setSelected] = useState(0);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const preview = previews[selected];
  function navigate(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let next = index;
    if (event.key === 'ArrowRight') next = (index + 1) % previews.length;
    else if (event.key === 'ArrowLeft') next = (index + previews.length - 1) % previews.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = previews.length - 1;
    else return;
    event.preventDefault();
    setSelected(next);
    tabs.current[next]?.focus();
  }
  return (
    <div className="home-workspace-preview" aria-label="Interactive workspace example">
      <div className="home-preview-topbar">
        <span>
          <span className="home-preview-mark" aria-hidden="true">
            ◐
          </span>{' '}
          LAMID ONE <span className="home-preview-caption">/ Workspace example</span>
        </span>
        <span className="home-preview-label">Illustrative content</span>
      </div>
      <div className="home-preview-body">
        <div className="home-preview-sidebar">
          <span className="home-eyebrow">YOUR OPERATING CYCLE</span>
          <div role="tablist" aria-label="Explore the operating cycle">
            {previews.map((item, index) => (
              <button
                key={item.name}
                ref={(node) => {
                  tabs.current[index] = node;
                }}
                type="button"
                role="tab"
                id={`preview-tab-${index}`}
                aria-selected={selected === index}
                aria-controls="workspace-preview-panel"
                tabIndex={selected === index ? 0 : -1}
                onClick={() => setSelected(index)}
                onKeyDown={(event) => navigate(event, index)}
              >
                <item.icon size={17} />
                {item.name}
                <ArrowRight size={14} />
              </button>
            ))}
          </div>
          <div className="home-preview-sidebar-note">
            <ShieldCheck size={20} />
            <p>{home.hero.paragraphs[5].text}</p>
          </div>
        </div>
        <div
          className="home-preview-panel"
          role="tabpanel"
          tabIndex={0}
          id="workspace-preview-panel"
          aria-labelledby={`preview-tab-${selected}`}
        >
          <div className="home-preview-panel-heading">
            <span className="home-eyebrow">{preview.label}</span>
          </div>
          <h3>{preview.title}</h3>
          <p>{preview.description}</p>
          <div className="home-preview-tasks">
            {preview.rows.map((row, index) => (
              <div key={row}>
                <span className={`home-preview-check ${index === 0 ? 'is-complete' : ''}`}>
                  {index === 0 && <Check size={12} />}
                </span>
                <span>{row}</span>
                <span className="home-preview-task-kind">
                  {index === 0 ? 'Context' : index === 1 ? 'Consider' : 'Next step'}
                </span>
              </div>
            ))}
          </div>
          <div className="home-preview-companion">
            <Sparkles size={17} />
            <p>{home.sections[0].paragraphs[1].text}</p>
          </div>
        </div>
      </div>
      <div className="home-preview-bottom">
        <span>Sample workspace</span>
        <DemoAccessSlide />
      </div>
    </div>
  );
}
