import { useState } from 'react';
import { Link } from 'react-router-dom';
import pages from '../../../content/catalog';

export function HelpSearchSlide() {
  const [query, setQuery] = useState('');
  const matches = pages.filter(
    (page) =>
      page.route.startsWith('/help/') &&
      `${page.title} ${page.description}`.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <section className="section-wrap canonical-controls help-search">
      <label htmlFor="help-search-input">Search Help</label>
      <input
        id="help-search-input"
        className="help-search-input"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Try “Companion” or “getting started”…"
        aria-label="Search help topics"
      />
      {query.trim() && (
        <ul className="help-search-results">
          {matches.length === 0 ? (
            <li className="help-search-empty">No help topics match “{query}”.</li>
          ) : (
            matches.map((page) => (
              <li key={page.route}>
                <Link to={page.route}>
                  <span className="help-search-result-title">{page.title}</span>
                  <span className="help-search-result-description">{page.description}</span>
                </Link>
              </li>
            ))
          )}
        </ul>
      )}
    </section>
  );
}
