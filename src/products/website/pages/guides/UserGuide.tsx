import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { userGuideTopics } from './userGuideContent';
import './user-guide.css';

export function UserGuide() {
  const { hash } = useLocation();
  // This page loads on demand; the route's initial scroll can run before its target exists.
  useEffect(() => {
    if (!hash.startsWith('#guide-') && hash !== '#user-guide-title') return;
    const frame = requestAnimationFrame(() =>
      document.getElementById(hash.slice(1))?.scrollIntoView({ block: 'start' }),
    );
    return () => cancelAnimationFrame(frame);
  }, [hash]);
  const [query, setQuery] = useState('');
  const terms = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  const topics = userGuideTopics.filter((topic) => {
    const text = [topic.title, topic.summary, ...topic.steps, topic.note].join(' ').toLowerCase();
    return terms.every((term) => text.includes(term));
  });
  return (
    <section className="user-guide" aria-labelledby="user-guide-title">
      <header>
        <p className="eyebrow">USING LAMID ONE</p>
        <h2 id="user-guide-title">User guide</h2>
        <p>
          Start with the demo, create your account, then turn your priorities into everyday
          progress. Choose a topic for step-by-step help.
        </p>
        <label htmlFor="user-guide-search">Search the user guide</label>
        <input
          id="user-guide-search"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Try demo, email, learning or points"
        />
        <p role="status">
          {topics.length} {topics.length === 1 ? 'topic' : 'topics'}
          {query.trim() ? ' found' : ' available'}.
        </p>
      </header>
      {topics.length ? (
        <div className="user-guide-layout">
          <nav aria-label="User guide topics">
            <ol>
              {topics.map((topic) => (
                <li key={topic.id}>
                  <a href={`#guide-${topic.id}`}>{topic.title}</a>
                </li>
              ))}
            </ol>
          </nav>
          <div className="user-guide-topics">
            {topics.map((topic) => (
              <article
                id={`guide-${topic.id}`}
                key={topic.id}
                aria-labelledby={`guide-title-${topic.id}`}
              >
                <h3 id={`guide-title-${topic.id}`}>{topic.title}</h3>
                <p>{topic.summary}</p>
                <ol>
                  {topic.steps.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ol>
                <p className="user-guide-note">{topic.note}</p>
                <ul className="user-guide-links">
                  {topic.links.map((link) => (
                    <li key={link.to}>
                      <Link to={link.to}>{link.label}</Link>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
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
