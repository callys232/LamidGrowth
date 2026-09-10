import { ArrowRight, Compass, Layers3, ListChecks } from 'lucide-react';
import { Link } from 'react-router-dom';

const stages = [
  { name: 'Clarity', description: 'Think clearly.', icon: Compass, route: 'clarity' },
  { name: 'Capability', description: 'Build capability.', icon: Layers3, route: 'capability' },
  {
    name: 'Consistency',
    description: 'Make consistent progress.',
    icon: ListChecks,
    route: 'consistency',
  },
];

export function HomeOperatingCycle() {
  return (
    <div className="home-cycle" aria-label="Your operating cycle">
      <ol>
        {stages.map(({ name, description, icon: Icon, route }) => (
          <li key={name}>
            <Link to={`/how-it-works/${route}`}>
              <Icon size={22} strokeWidth={1.4} />
              <span>
                <strong>{name}</strong>
                <small>{description}</small>
              </span>
              <ArrowRight size={17} aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ol>
      <p>Growth is the outcome.</p>
    </div>
  );
}
