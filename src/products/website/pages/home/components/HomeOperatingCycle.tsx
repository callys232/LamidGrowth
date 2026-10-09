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

/** Hovering or focusing a stage previews its walkthrough in the example above (CompanionExample);
 * clicking still opens that stage's page. */
export function HomeOperatingCycle({
  active,
  onPreview,
}: {
  active?: string;
  onPreview?: (stage: string) => void;
}) {
  return (
    <div className="home-cycle" aria-label="Your operating cycle">
      <ol>
        {stages.map(({ name, description, icon: Icon, route }) => (
          <li key={name}>
            <Link
              to={`/how-it-works/${route}`}
              data-active={active === name || undefined}
              onPointerEnter={() => onPreview?.(name)}
              onFocus={() => onPreview?.(name)}
            >
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
