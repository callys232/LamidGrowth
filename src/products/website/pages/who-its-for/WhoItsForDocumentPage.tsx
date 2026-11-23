import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { audiences } from '../../../../shared/brand';
import { UpdatedDocumentPage } from '../../../../shared/content/UpdatedDocumentPage';
import type { DocumentPageProps } from '../../../../shared/content/types';
import { AnimatedRoleCharacter, ROLE_VISUALS } from '../audience/AnimatedRoleVector';
import '../audience/audience.css';
import './who-its-for.css';
import content from './content.json';

export function WhoItsForDocumentPage({ embedded = false }: DocumentPageProps) {
  if (embedded) {
    return <UpdatedDocumentPage content={content} embedded={embedded} />;
  }

  return (
    <div className="wif-hub-page">
      <section className="wif-hub-hero">
        <div className="wif-hub-copy">
          <span className="wif-hub-eyebrow">Solutions by role &amp; stage</span>
          <h1>Solutions built around how you actually work.</h1>
          <p>
            You don’t need another disconnected stack. Pick your role to see how LAMID ONE helps
            you make faster calls, coordinate teams, and adapt as conditions shift.
          </p>
          <div className="wif-hub-actions">
            <Link className="aud-btn aud-btn-solid" to="/demo">
              Try live demo
            </Link>
            <Link className="aud-btn aud-btn-outline" to="/product">
              Explore product suites
            </Link>
          </div>
        </div>

        <div className="wif-hub-collage">
          <div className="wif-collage-photo wif-photo-main">
            <img
              src="/media/solutions/solutions-founders.jpg"
              alt="Founders reviewing strategy and cash runway together"
              loading="eager"
              decoding="async"
            />
          </div>
          <div className="wif-collage-photo wif-photo-sub">
            <img
              src="/media/solutions/solutions-teams.jpg"
              alt="Cross-functional team collaborating in a bright workspace"
              loading="eager"
              decoding="async"
            />
          </div>
          <div className="wif-collage-char" aria-hidden="true">
            <AnimatedRoleCharacter variant="pair" accent="#059669" />
          </div>
        </div>
      </section>

      <section className="wif-hub-grid-section" aria-labelledby="wif-roles-heading">
        <div className="wif-hub-grid-head">
          <span className="wif-hub-eyebrow">8 Dedicated Workspaces</span>
          <h2 id="wif-roles-heading">Choose the context that fits you.</h2>
        </div>

        <div className="wif-role-grid">
          {audiences.map((aud) => {
            const visual = ROLE_VISUALS[aud.id] || ROLE_VISUALS.founders;
            return (
              <Link
                key={aud.id}
                to={aud.route}
                className="wif-role-card"
                style={
                  {
                    '--role-accent': visual.accent,
                    '--role-tint': visual.tint,
                  } as React.CSSProperties
                }
              >
                <div className="wif-role-media">
                  <img src={visual.photo} alt={visual.photoAlt} loading="lazy" decoding="async" />
                  <div className="wif-role-char-badge" aria-hidden="true">
                    <AnimatedRoleCharacter variant={visual.characterVariant} accent={visual.accent} />
                  </div>
                </div>
                <div className="wif-role-body">
                  <span className="wif-role-kicker">For {aud.name}</span>
                  <h3>{aud.name}</h3>
                  <p>{aud.lead.words}</p>
                  <span className="wif-role-link">
                    Explore {aud.name} <ChevronRight size={15} aria-hidden="true" />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
