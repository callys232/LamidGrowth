import { Link } from 'react-router-dom';
import { HomeCopy, HomeFeatureList, HomeSection } from '../components/HomeSection';
import { useEffect, useRef } from 'react';
import { useInView } from 'motion/react';

export function HomeIntelligenceSlide() {
  const steps = useRef<HTMLDivElement>(null);
  const example = useRef<HTMLElement>(null);
  const visible = useInView(steps, { once: true, amount: 0.25 });
  useEffect(() => {
    const cards = [
      ...Array.from(steps.current?.querySelectorAll('li') ?? []),
      ...Array.from(example.current?.querySelectorAll('li') ?? []),
      ...(example.current ? [example.current] : []),
    ];
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(({ target, isIntersecting }) => {
          target.classList.toggle('is-scroll-active', isIntersecting);
        });
      },
      { rootMargin: '-20% 0px -25% 0px', threshold: 0.15 },
    );
    cards.forEach((card) => observer.observe(card));
    return () => observer.disconnect();
  }, []);
  return (
    <HomeSection
      section={3}
      introduction="When permitted information changes, reassess the plan. Keep every action within the authority you have granted."
      className={`home-intelligence-section${visible ? ' intelligence-visible' : ''}`}
    >
      <aside
        ref={example}
        className="home-signal-example"
        aria-label="Illustrative intelligence example"
      >
        <div>
          <span className="home-eyebrow">ILLUSTRATIVE EXAMPLE</span>
          <h3>A project deadline changes.</h3>
          <p>See how a permitted change can inform the next decision.</p>
        </div>
        <ol>
          <li>
            <strong>Sense</strong>
            <span>A permitted project source shows a revised deadline.</span>
          </li>
          <li>
            <strong>Understand</strong>
            <span>Review the change against priorities, dependencies, and available capacity.</span>
          </li>
          <li>
            <strong>Recommend</strong>
            <span>Compare adjusting the scope, timing, or responsibilities.</span>
          </li>
          <li>
            <strong>Act</strong>
            <span>Continue only within existing authority. Request approval where required.</span>
          </li>
        </ol>
        <Link to="/product">Explore the product workspace →</Link>
      </aside>
      <details className="home-disclosure">
        <summary>Explore the intelligence cycle</summary>
        <div ref={steps}>
          <HomeFeatureList section={3} to={6} className="home-signal-steps" />
        </div>
      </details>
      <div className="home-section-end">
        <HomeCopy section={3} from={6} />
      </div>
    </HomeSection>
  );
}
