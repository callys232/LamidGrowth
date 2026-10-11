import { Check, Contrast, Globe, Moon, Search, Sun } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { applyContrast, applyTheme, getStoredContrast, getStoredTheme } from '../lib/theme';
import './utility-bar.css';

export type SearchEntry = { label: string; description: string; to: string };

function useDarkMode() {
  const [dark, setDark] = useState(
    () =>
      getStoredTheme() === 'dark' ||
      (getStoredTheme() === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches),
  );
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const sync = () =>
      setDark(
        document.documentElement.dataset.theme === 'dark' ||
          (!document.documentElement.dataset.theme && media.matches),
      );
    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });
    media.addEventListener('change', sync);
    return () => {
      observer.disconnect();
      media.removeEventListener('change', sync);
    };
  }, []);
  return dark;
}

export function PublicUtilityBar({
  searchIndex,
  signedIn,
}: {
  searchIndex: SearchEntry[];
  signedIn: boolean;
}) {
  const dark = useDarkMode();
  const [highContrast, setHighContrast] = useState(getStoredContrast);
  const [open, setOpen] = useState<'' | 'language' | 'search'>('');
  const [query, setQuery] = useState('');
  const bar = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const results = useMemo(() => {
    const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (!terms.length) return searchIndex.slice(0, 6);
    return searchIndex
      .filter((entry) => {
        const text = `${entry.label} ${entry.description} ${entry.to}`.toLowerCase();
        return terms.every((term) => text.includes(term));
      })
      .slice(0, 8);
  }, [query, searchIndex]);

  useEffect(() => {
    const dismiss = (event: PointerEvent) => {
      if (!bar.current?.contains(event.target as Node)) setOpen('');
    };
    const keys = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen('');
      // Ctrl/Cmd+K opens site search from anywhere on public pages.
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpen('search');
      }
    };
    document.addEventListener('pointerdown', dismiss);
    document.addEventListener('keydown', keys);
    return () => {
      document.removeEventListener('pointerdown', dismiss);
      document.removeEventListener('keydown', keys);
    };
  }, []);
  useEffect(() => {
    if (open === 'search') input.current?.focus();
    else setQuery('');
  }, [open]);

  const go = (to: string) => {
    setOpen('');
    navigate(to);
  };

  return (
    <div className="utility-bar" ref={bar}>
      <div className="utility-inner">
        <div className="utility-group">
          <button
            type="button"
            className="utility-link"
            aria-haspopup="true"
            aria-expanded={open === 'language'}
            aria-controls="utility-language"
            onClick={() => setOpen(open === 'language' ? '' : 'language')}
          >
            <Globe size={14} aria-hidden="true" />
            English
          </button>
          <button
            type="button"
            className="utility-link"
            aria-pressed={highContrast}
            onClick={() => {
              applyContrast(!highContrast);
              setHighContrast(!highContrast);
            }}
          >
            <Contrast size={14} aria-hidden="true" />
            High contrast
          </button>
          <Link className="utility-link" to="/support">
            Customer support
          </Link>
          <Link className="utility-link" to="/experts">
            For experts
          </Link>
        </div>
        <div className="utility-group">
          <button
            type="button"
            className="utility-link"
            aria-label={`Switch to ${dark ? 'light' : 'dark'} mode`}
            onClick={() => applyTheme(dark ? 'light' : 'dark')}
          >
            {dark ? <Sun size={14} aria-hidden="true" /> : <Moon size={14} aria-hidden="true" />}
            {dark ? 'Light' : 'Dark'}
          </button>
          <button
            type="button"
            className="utility-link"
            aria-expanded={open === 'search'}
            aria-controls="utility-search"
            title="Search (Ctrl+K)"
            onClick={() => setOpen(open === 'search' ? '' : 'search')}
          >
            <Search size={14} aria-hidden="true" />
            Search
          </button>
          {!signedIn && (
            <Link className="utility-link" to="/login">
              Log in
            </Link>
          )}
        </div>
      </div>

      {open === 'language' && (
        <div id="utility-language" className="utility-popover utility-popover-start" role="menu">
          <button
            type="button"
            role="menuitemradio"
            aria-checked="true"
            onClick={() => setOpen('')}
          >
            English
            <Check size={14} aria-hidden="true" />
          </button>
          <p>More languages are on the way.</p>
        </div>
      )}

      {open === 'search' && (
        <div id="utility-search" className="utility-popover utility-popover-end utility-search">
          <form
            role="search"
            onSubmit={(event) => {
              event.preventDefault();
              if (results[0]) go(results[0].to);
            }}
          >
            <Search size={16} aria-hidden="true" />
            <input
              ref={input}
              type="search"
              placeholder="Search LAMID ONE"
              aria-label="Search the site"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </form>
          {results.length ? (
            <ul>
              {results.map((entry) => (
                <li key={entry.to + entry.label}>
                  <Link to={entry.to} onClick={() => setOpen('')}>
                    <strong>{entry.label}</strong>
                    <span>{entry.description}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p>No pages match “{query}”.</p>
          )}
        </div>
      )}
    </div>
  );
}
