import { useEffect, useRef, useState } from 'react';

const steps = [
  {
    title: 'Relevant context',
    body: 'Your shared plan shows a full delivery schedule and one project finishing next week.',
  },
  {
    title: 'A considered recommendation',
    body: 'Compare a smaller first phase with a later start. Check capacity before committing.',
  },
  {
    title: 'A practical next action',
    body: 'Prepare a phased delivery plan for your review.',
  },
  {
    title: 'Your decision',
    body: 'Sending the proposal needs your approval. Preparing a plan does not authorize a client commitment.',
  },
];

export function CompanionExample() {
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
  }, []);

  return (
    <section className="home-companion-example" aria-labelledby="companion-example-heading">
      <header>
        <span className="home-eyebrow">COMPANION · ILLUSTRATIVE EXAMPLE</span>
        <h2 id="companion-example-heading">A clearer next step, from your real question.</h2>
        <p className="home-example-objective">"Can we take on another client this month?"</p>
        <p>Follow an example from the situation to a decision you control.</p>
      </header>
      <ol ref={listRef}>
        {steps.map((step, index) => {
          const isActive =
            hovered === index || (hovered === null && isScrolling && inView.has(index));
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
    </section>
  );
}
