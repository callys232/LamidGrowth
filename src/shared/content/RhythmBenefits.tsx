import { useEffect, useRef, useState } from 'react';
import { Clock, MessageSquare, CalendarCheck, UserCheck } from 'lucide-react';

const benefits = [
  { title: 'See your weekly meeting time cost.', Icon: Clock },
  { title: 'Spot status-update overload.', Icon: MessageSquare },
  { title: 'Find missing review cycles.', Icon: CalendarCheck },
  { title: 'Identify missing owners and agendas.', Icon: UserCheck },
];

export function RhythmBenefits() {
  const list = useRef<HTMLUListElement>(null);
  const [active, setActive] = useState(0);
  useEffect(() => {
    const element = list.current;
    if (!element) return;
    const scrollRoot = element.closest('dialog');
    if (!scrollRoot) return;
    const onScroll = () => {
      const center = scrollRoot.getBoundingClientRect().top + scrollRoot.clientHeight / 2;
      const distances = Array.from(element.children).map((child) => {
        const box = child.getBoundingClientRect();
        return Math.abs(box.top + box.height / 2 - center);
      });
      setActive(distances.indexOf(Math.min(...distances)));
    };
    scrollRoot.addEventListener('scroll', onScroll, { passive: true });
    return () => scrollRoot.removeEventListener('scroll', onScroll);
  }, []);
  return (
    <section className="rhythm-demo-benefits" aria-labelledby="rhythm-benefits-heading">
      <h3 id="rhythm-benefits-heading">What you gain</h3>
      <ul ref={list} className="rhythm-benefit-cards" aria-label="Rhythm tool benefits">
        {benefits.map(({ title, Icon }, index) => (
          <li
            key={title}
            className="rhythm-benefit-card"
            tabIndex={0}
            data-active={active === index}
            onFocus={() => setActive(index)}
            onPointerEnter={() => setActive(index)}
            onClick={() => setActive(index)}
          >
            <div className="rhythm-benefit-card-top">
              <Icon size={20} strokeWidth={1.7} aria-hidden="true" />
              <span aria-hidden="true">0{index + 1}</span>
            </div>
            <strong>{title}</strong>
          </li>
        ))}
      </ul>
    </section>
  );
}
