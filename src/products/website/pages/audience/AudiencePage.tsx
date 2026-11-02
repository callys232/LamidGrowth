import { Link } from 'react-router-dom';
import { audiences, pillars } from '../../../../shared/brand';
import { AudienceContextIllustration } from '../../../../shared/brand/AudienceContextIllustration';
import type { DocumentPage } from '../../../../shared/content/types';
import './audience.css';
import '../motion.css';
import { MoreDetail } from '../../../../shared/content/MoreDetail';

const pillarMeta = Object.fromEntries(pillars.map((p) => [p.id, p]));
const normalise = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
const body = (section: DocumentPage['sections'][number]) =>
  section.paragraphs.find((p, i) => i > 0 && !/^(CTA:|Links?:)/.test(p.text))?.text ?? '';

export function AudiencePage({
  content,
  audienceId,
}: {
  content: DocumentPage;
  audienceId: string;
}) {
  const audience = audiences.find((item) => item.id === audienceId);
  if (!audience) return null;

  const lede = content.hero.paragraphs[1]?.text ?? content.description;
  const sections = content.sections.slice(0, 6);
  const owned = sections.findIndex((s) => normalise(s.title) === normalise(audience.ownsIdea));
  const band = sections[owned >= 0 ? owned : 3] ?? sections[sections.length - 1];
  const cards = sections.filter((s) => s !== band).slice(0, 3);
  const others = audiences.filter((item) => item.id !== audience.id);

  return (
    <div className="aud-page" data-source-page={content.page} data-audience={audience.id}>
      <section className="aud-hero">
        <div className="aud-hero-copy">
          <p className="aud-eyebrow">For {audience.name}</p>
          <h1>{content.title}</h1>
          <p className="aud-lede">{lede}</p>
          <div className="aud-actions">
            <Link className="aud-btn aud-btn-solid" to="/signup">
              Get started
            </Link>
            <Link className="aud-btn aud-btn-outline" to="/insights#playbook-library">
              Explore playbooks
            </Link>
          </div>
        </div>
        <AudienceContextIllustration audienceId={audience.id} audienceName={audience.name} />
      </section>

      <section className="aud-start" aria-label={`Where LAMID ONE starts for ${audience.name}`}>
        {[audience.lead, audience.second].map((item, index) => (
          <div
            className={`aud-start-item${index === 0 ? ' is-lead' : ''}`}
            key={item.pillar}
            style={{ '--pillar': pillarMeta[item.pillar]?.color } as React.CSSProperties}
          >
            <span className="aud-kicker">
              {index === 0 ? 'Start with' : 'Then'} {pillarMeta[item.pillar]?.name}
              <em>{pillarMeta[item.pillar]?.verb}</em>
            </span>
            <p>{item.words}</p>
          </div>
        ))}
      </section>

      <section className="aud-cards" aria-label="How LAMID ONE helps">
        {cards.map((section) => (
          <article className="aud-card" key={section.title}>
            <h2>{section.title}</h2>
            <p>{body(section)}</p>
          </article>
        ))}
      </section>

      <section className="aud-band">
        <h2>{band.title}</h2>
        <p>{body(band)}</p>
        <div className="aud-actions">
          <Link className="aud-btn aud-btn-light" to="/insights#playbook-library">
            Browse playbooks
          </Link>
          <Link className="aud-btn aud-btn-ghost" to="/case-studies">
            Case studies
          </Link>
        </div>
      </section>

      <MoreDetail />

      <nav className="aud-others" aria-label="Other audiences">
        <h2>LAMID ONE is also built for</h2>
        <ul>
          {others.map((item) => (
            <li key={item.id}>
              <Link to={item.route}>{item.name}</Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
