import { Link } from 'react-router-dom';
import {
  Building,
  Building2,
  Briefcase,
  Landmark,
  Palette,
  Rocket,
  User,
  Users,
} from 'lucide-react';
import individuals from '../../who-its-for-individuals/content.json';
import professionals from '../../who-its-for-professionals/content.json';
import creators from '../../who-its-for-creators/content.json';
import founders from '../../who-its-for-founders/content.json';
import teams from '../../who-its-for-teams/content.json';
import smes from '../../who-its-for-smes/content.json';
import enterprises from '../../who-its-for-enterprises/content.json';
import institutions from '../../who-its-for-institutions/content.json';

// Every card below links to a real page and shows that page's own title/description (its own
// content.json, checked independently when that route is visited) — nothing here is new copy.
const CONTEXTS = [
  { route: '/who-its-for/individuals', page: individuals, Icon: User },
  { route: '/who-its-for/professionals', page: professionals, Icon: Briefcase },
  { route: '/who-its-for/creators', page: creators, Icon: Palette },
  { route: '/who-its-for/founders', page: founders, Icon: Rocket },
  { route: '/who-its-for/teams', page: teams, Icon: Users },
  { route: '/who-its-for/smes', page: smes, Icon: Building2 },
  { route: '/who-its-for/enterprises', page: enterprises, Icon: Building },
  { route: '/who-its-for/institutions', page: institutions, Icon: Landmark },
] as const;

export function AudienceContextGrid() {
  return (
    <section className="audience-context-section">
      <div className="audience-container">
        <span className="audience-eyebrow">EVERY CONTEXT</span>
        <h2>Choose the context that fits.</h2>
        <ul className="audience-context-grid">
          {CONTEXTS.map(({ route, page, Icon }) => (
            <li key={route} className="audience-context-card">
              <Link to={route}>
                <Icon size={20} strokeWidth={1.6} aria-hidden="true" />
                <h3>{page.title}</h3>
                <p>{page.description}</p>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
