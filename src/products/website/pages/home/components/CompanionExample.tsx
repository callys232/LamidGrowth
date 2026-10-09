import { useEffect, useRef, useState, type ReactNode } from 'react';
import { EXAMPLE_QUESTION, HOME_EXAMPLES, type HomeExample } from './homeExamples';

/** The example above the operating cycle. Shows the Companion walkthrough by default and switches
 * to a stage's walkthrough when that stage is previewed in HomeOperatingCycle. Every walkthrough is
 * rendered in the same grid cell and only the shown one is visible, so the card keeps the height of
 * the tallest and never moves — swapping only cross-fades the content. */
export function CompanionExample({ example = HOME_EXAMPLES[0] }: { example?: HomeExample }) {
  const listRef = useRef<HTMLOListElement>(null);
  const [inView, setInView] = useState<Set<number>>(new Set());
  const [isScrolling, setIsScrolling] = useState(false);
  const [hovered, setHovered] = useState<number | null>(null);

  useEffect(() => {
    const items = listRef.current?.querySelectorAll<HTMLLIElement>('li');
    if (!items?.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        setInView((current) => {
          const next = new Set(current);
          for (const entry of entries) {
            const index = Number((entry.target as HTMLElement).dataset.step);
            if (entry.isIntersecting) next.add(index);
            else next.delete(index);
          }
          return next;
        });
      },
      { rootMargin: '-35% 0px -45% 0px', threshold: 0 },
    );
    items.forEach((item) => observer.observe(item));
    setHovered(null);

    // The highlight should only ride along while the page is actually moving, not linger on
    // whichever step happened to be reached once scrolling stops.
    let timer: ReturnType<typeof setTimeout>;
    const onScroll = () => {
      setIsScrolling(true);
      clearTimeout(timer);
      timer = setTimeout(() => setIsScrolling(false), 250);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', onScroll);
      clearTimeout(timer);
    };
  }, [example.key]);

  return (
    <section className="home-companion-example" aria-labelledby="companion-example-heading">
      <header>
        <div className="home-example-stack">
          {HOME_EXAMPLES.map((e) => (
            <Layer key={e.key} shown={e.key === example.key}>
              <span className="home-eyebrow">{e.key.toUpperCase()} · ILLUSTRATIVE EXAMPLE</span>
              <h2 id={e.key === example.key ? 'companion-example-heading' : undefined}>
                {e.heading}
              </h2>
            </Layer>
          ))}
        </div>
        <p className="home-example-objective">"{EXAMPLE_QUESTION}"</p>
        <div className="home-example-stack">
          {HOME_EXAMPLES.map((e) => (
            <Layer key={e.key} shown={e.key === example.key}>
              <p>{e.intro}</p>
            </Layer>
          ))}
        </div>
      </header>
      <div className="home-example-stack">
        {HOME_EXAMPLES.map((e) => {
          const shown = e.key === example.key;
          return (
            <Layer key={e.key} shown={shown}>
              <ol ref={shown ? listRef : undefined}>
                {e.steps.map((step, index) => {
                  const isActive =
                    shown &&
                    (hovered === index || (hovered === null && isScrolling && inView.has(index)));
                  return (
                    <li
                      key={step.title}
                      data-step={index}
                      className={isActive ? 'is-active' : ''}
                      onPointerEnter={() => setHovered(index)}
                      onPointerLeave={() => setHovered(null)}
                    >
                      <span className="home-example-step-dot" aria-hidden="true" />
                      <span className="home-example-step-body">
                        <strong>{step.title}</strong>
                        <p>{step.body}</p>
                      </span>
                    </li>
                  );
                })}
              </ol>
            </Layer>
          );
        })}
      </div>
    </section>
  );
}

/** One walkthrough in a stack: hidden ones keep their space but can't be seen, read or focused. */
function Layer({ shown, children }: { shown: boolean; children: ReactNode }) {
  return (
    <div className="home-example-layer" data-shown={shown} aria-hidden={!shown} inert={!shown}>
      {children}
    </div>
  );
}
