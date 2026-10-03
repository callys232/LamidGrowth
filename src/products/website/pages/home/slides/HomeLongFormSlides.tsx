import { Check, Compass, Layers3, Workflow } from 'lucide-react';
import content from '../content.json';

type Paragraph = { text: string; sourceParagraph: number };

/** Homepage sections are looked up by label so later additions never shift them. */
export function homeSection(label: string) {
  const section = content.sections.find((s) => s.label === label);
  if (!section) throw new Error(`Missing homepage section: ${label}`);
  return section;
}

const isBullet = (p: Paragraph) => p.text.startsWith('- ');

function Heading({ id, title, eyebrow }: { id: string; title: Paragraph; eyebrow: string }) {
  return (
    <>
      <span className="home-eyebrow">
        <span className="home-red-dot" aria-hidden="true" />
        {eyebrow}
      </span>
      <h2 id={id} data-source-paragraph={title.sourceParagraph}>
        {title.text}
      </h2>
    </>
  );
}

function Lines({ paragraphs, className }: { paragraphs: Paragraph[]; className?: string }) {
  return paragraphs.map((p) => (
    <p key={p.sourceParagraph} className={className} data-source-paragraph={p.sourceParagraph}>
      {p.text}
    </p>
  ));
}

/** Why LAMID ONE: the problem on the left, the three-part answer on the right. */
export function HomeWhySlide() {
  const [title, lead, intro, ...rest] = homeSection('WHY LAMID ONE').paragraphs;
  const bullets = rest.filter(isBullet);
  const closing = rest.filter((p) => !isBullet(p));
  return (
    <section
      className="home-section home-longform-section home-why-section"
      id={`section-${title.sourceParagraph}`}
      aria-labelledby="home-heading-why"
    >
      <div className="home-container home-longform-split">
        <header>
          <Heading id="home-heading-why" title={title} eyebrow="Why LAMID ONE" />
          <Lines paragraphs={[lead]} className="home-longform-lead" />
        </header>
        <div>
          <Lines paragraphs={[intro]} />
          <ul className="home-longform-checks">
            {bullets.map((p) => (
              <li key={p.sourceParagraph} data-source-paragraph={p.sourceParagraph}>
                <Check size={18} strokeWidth={2} aria-hidden="true" />
                <span>
                  <span className="sr-only">- </span>
                  {p.text.slice(2)}
                </span>
              </li>
            ))}
          </ul>
          <Lines paragraphs={closing} className="home-longform-closing" />
        </div>
      </div>
    </section>
  );
}

const experienceIcons = [Compass, Layers3, Workflow];

/** Portal Experience: what the portal is, then Clarity, Capability and Execution as cards. */
export function HomePortalExperienceSlide() {
  const [title, notThis, isThis, intro, ...rest] = homeSection('PORTAL EXPERIENCE').paragraphs;
  const items = rest.slice(0, 3);
  const closing = rest.slice(3);
  return (
    <section
      className="home-section home-longform-section home-portal-section"
      id={`section-${title.sourceParagraph}`}
      aria-labelledby="home-heading-portal"
    >
      <div className="home-container">
        <header className="home-section-heading">
          <Heading id="home-heading-portal" title={title} eyebrow="Portal Experience" />
          <Lines paragraphs={[notThis, isThis]} />
        </header>
        <Lines paragraphs={[intro]} className="home-longform-label" />
        <div className="home-longform-cards">
          {items.map((p, index) => {
            // Each line begins with its space name ("Clarity See what matters…").
            const [name] = p.text.split(' ', 1);
            const Icon = experienceIcons[index];
            return (
              <article key={p.sourceParagraph} data-source-paragraph={p.sourceParagraph}>
                <Icon size={22} strokeWidth={1.4} aria-hidden="true" />
                <h3>{name}</h3> <p>{p.text.slice(name.length + 1)}</p>
              </article>
            );
          })}
        </div>
        <Lines paragraphs={closing} className="home-longform-closing" />
      </div>
    </section>
  );
}

/** Philosophy: the belief, then the five principles as paired contrasts. */
export function HomePhilosophySlide() {
  const [title, lead, belief, intro, ...rest] = homeSection('PHILOSOPHY').paragraphs;
  const principles = rest.filter(isBullet);
  const closing = rest.filter((p) => !isBullet(p));
  return (
    <section
      className="home-section home-longform-section home-philosophy-section"
      id={`section-${title.sourceParagraph}`}
      aria-labelledby="home-heading-philosophy"
    >
      <div className="home-container home-longform-split">
        <header>
          <Heading id="home-heading-philosophy" title={title} eyebrow="Philosophy" />
          <Lines paragraphs={[lead, belief]} />
        </header>
        <div>
          <Lines paragraphs={[intro]} className="home-longform-label" />
          <ul className="home-longform-principles">
            {principles.map((p) => {
              const [first, second] = p.text.slice(2).split(' over ');
              return (
                <li key={p.sourceParagraph} data-source-paragraph={p.sourceParagraph}>
                  <span className="sr-only">- </span>
                  <strong>{first}</strong> <span>over</span> {second}
                </li>
              );
            })}
          </ul>
          <Lines paragraphs={closing} className="home-longform-closing" />
        </div>
      </div>
    </section>
  );
}
