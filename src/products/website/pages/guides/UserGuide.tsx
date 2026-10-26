import { useEffect, useState } from 'react';
import type { MouseEvent } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { userGuideTopics } from './userGuideContent';
import './user-guide.css';

type Asset = { clip: string } | { still: string };

const assets: Record<string, Asset> = {
  'first-outcome': { clip: '/videos/clarity-demo' },
  'try-demo': { clip: '/videos/growth-demo' },
  'create-account': { clip: '/videos/integrations-demo' },
  'find-your-work': { clip: '/videos/rhythm-demo' },
  'objectives-actions': { clip: '/videos/consistency-demo' },
  'run-tools': { clip: '/videos/capability-demo' },
  learning: { clip: '/videos/capability-demo' },
  'work-with-others': { clip: '/videos/integrations-demo' },
  'review-progress': { clip: '/videos/rhythm-demo' },
  'plans-points': { clip: '/videos/growth-demo' },
  'account-security': { still: '/media/scenes/spire-close.jpg' },
  troubleshooting: { still: '/media/scenes/office-view.jpg' },
};

function Stage({ asset, label }: { asset?: Asset; label: string }) {
  if (!asset) return null;
  return (
    <div className="ug-stage">
      {'clip' in asset ? (
        <video autoPlay muted loop playsInline preload="metadata" aria-label={label}>
          <source src={`${asset.clip}.webm`} type="video/webm" />
          <source src={`${asset.clip}.mp4`} type="video/mp4" />
        </video>
      ) : (
        <img src={asset.still} alt="" loading="lazy" />
      )}
    </div>
  );
}

export function UserGuide() {
  const { hash } = useLocation();
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(userGuideTopics[0].id);
  const [done, setDone] = useState<Set<string>>(new Set());

  const terms = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  const topics = userGuideTopics.filter((topic) => {
    const text = [topic.title, topic.summary, ...topic.steps, topic.note].join(' ').toLowerCase();
    return terms.every((term) => text.includes(term));
  });
  const activeId = topics.some((topic) => topic.id === selected) ? selected : topics[0]?.id;

  // This page loads on demand, so a deep link selects its topic and scrolls once the guide exists.
  useEffect(() => {
    if (!hash.startsWith('#guide-') && hash !== '#user-guide-title') return;
    const id = hash.slice('#guide-'.length);
    if (userGuideTopics.some((topic) => topic.id === id)) setSelected(id);
    const frame = requestAnimationFrame(() =>
      document.getElementById('user-guide-title')?.scrollIntoView({ block: 'start' }),
    );
    return () => cancelAnimationFrame(frame);
  }, [hash]);

  const choose = (event: MouseEvent, id: string) => {
    event.preventDefault();
    setSelected(id);
    window.history.replaceState(null, '', `#guide-${id}`);
  };

  const toggle = (key: string) =>
    setDone((prev) => {
      const next = new Set(prev);
      if (!next.delete(key)) next.add(key);
      return next;
    });

  return (
    <section className="user-guide" aria-labelledby="user-guide-title">
      <div className="ug-head">
        <h2 id="user-guide-title">User guide</h2>
        <div className="ug-search">
          <label htmlFor="user-guide-search">Search the user guide</label>
          <input
            id="user-guide-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Try demo, email, learning or points"
          />
        </div>
      </div>
      <p className="ug-status" role="status">
        {topics.length} {topics.length === 1 ? 'topic' : 'topics'}
        {query.trim() ? ' found' : ' available'}.
      </p>
      {topics.length ? (
        <div className="ug-shell">
          <div className="ug-rail" role="tablist" aria-label="User guide topics">
            {topics.map((topic, index) => (
              <a
                key={topic.id}
                href={`#guide-${topic.id}`}
                role="tab"
                id={`guide-tab-${topic.id}`}
                aria-selected={topic.id === activeId}
                aria-controls={`guide-${topic.id}`}
                className={topic.id === activeId ? 'is-active' : undefined}
                onClick={(event) => choose(event, topic.id)}
              >
                <span>{String(index + 1).padStart(2, '0')}</span>
                {topic.title}
              </a>
            ))}
          </div>
          <div className="ug-panels">
            {topics.map((topic) => {
              const on = topic.id === activeId;
              const count = topic.steps.filter((_, i) => done.has(`${topic.id}:${i}`)).length;
              return (
                <div
                  key={topic.id}
                  id={`guide-${topic.id}`}
                  role="tabpanel"
                  aria-labelledby={`guide-tab-${topic.id}`}
                  aria-hidden={!on}
                  className={on ? 'ug-panel is-active' : 'ug-panel'}
                >
                  {on && <Stage asset={assets[topic.id]} label={`${topic.title} preview`} />}
                  <h3>{topic.title}</h3>
                  <p className="ug-summary">{topic.summary}</p>
                  <div
                    className="ug-progress"
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={topic.steps.length}
                    aria-valuenow={count}
                    aria-label="Steps completed"
                  >
                    <span style={{ width: `${(count / topic.steps.length) * 100}%` }} />
                  </div>
                  <ol className="ug-steps">
                    {topic.steps.map((step, i) => {
                      const key = `${topic.id}:${i}`;
                      return (
                        <li key={step} className={done.has(key) ? 'is-done' : undefined}>
                          <label>
                            <input
                              type="checkbox"
                              checked={done.has(key)}
                              tabIndex={on ? 0 : -1}
                              onChange={() => toggle(key)}
                            />
                            <span className="ug-node" aria-hidden="true">
                              {i + 1}
                            </span>
                            <span className="ug-step">{step}</span>
                          </label>
                        </li>
                      );
                    })}
                  </ol>
                  <p className="ug-note">{topic.note}</p>
                  <ul className="ug-links">
                    {topic.links.map((link) => (
                      <li key={link.to}>
                        <Link to={link.to} tabIndex={on ? 0 : -1}>
                          {link.label} →
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <p>
          No topics match your search.{' '}
          <button type="button" onClick={() => setQuery('')}>
            Show all topics
          </button>{' '}
          or <Link to="/support">contact support</Link>.
        </p>
      )}
    </section>
  );
}
