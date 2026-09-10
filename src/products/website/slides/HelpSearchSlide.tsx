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
    <section className="section-wrap canonical-controls">
      <label>
        Search Help
        <input
          className="canonical-search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          aria-label="Search help topics"
        />
      </label>
      <ul>
        {matches.map((page) => (
          <li key={page.route}>
            <Link to={page.route}>{page.title}</Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
