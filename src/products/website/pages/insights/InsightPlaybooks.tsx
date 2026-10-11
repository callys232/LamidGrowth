import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Download, Search } from 'lucide-react';
import { Modal } from '../../../../shared/ui/Modal';
import playbooks from './playbooks.json';
import content from './content.json';
import './playbooks.css';

type Playbook = (typeof playbooks)[number];

function PlaybookVector({ category, compact = false }: { category: string; compact?: boolean }) {
  return (
    <svg
      viewBox="0 0 480 190"
      className="playbook-vector"
      role="img"
      aria-label={`${category}: provide inputs, analyse with engines, review the result`}
    >
      <path
        d="M100 95H380"
        stroke="currentColor"
        strokeWidth="2"
        strokeDasharray="5 7"
        opacity=".35"
      />
      {[
        ['Inputs', 'Your evidence'],
        ['Engines', category],
        ['Review', 'Your next action'],
      ].map(([title, label], index) => (
        <g key={title} transform={`translate(${20 + index * 160} 34)`}>
          <rect
            width="120"
            height="122"
            rx="20"
            fill="currentColor"
            fillOpacity={index === 1 ? '.16' : '.06'}
            stroke="currentColor"
            strokeOpacity=".2"
          />
          {index === 0 ? (
            <path
              d="M35 29h50M35 40h38M35 51h45"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
            />
          ) : index === 1 ? (
            <>
              <circle cx="60" cy="39" r="19" fill="none" stroke="currentColor" strokeWidth="2" />
              <path d="m51 39 6 6 12-13" fill="none" stroke="currentColor" strokeWidth="3" />
            </>
          ) : (
            <path
              d="M35 56V42h12v14m6 0V31h12v25m6 0V21h12v35"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
            />
          )}
          <text
            x="60"
            y="83"
            textAnchor="middle"
            fill="currentColor"
            fontSize="16"
            fontWeight="600"
          >
            {title}
          </text>
          {!compact && (
            <text x="60" y="104" textAnchor="middle" fill="currentColor" fontSize="11">
              {label}
            </text>
          )}
        </g>
      ))}
    </svg>
  );
}

function downloadTemplate(playbook: Playbook) {
  const lines = [
    `# ${playbook.title}`,
    '',
    playbook.description,
    '',
    'Review date: __________',
    'Owner: __________',
    'Question to answer: __________',
  ];
  for (const tool of playbook.tools) {
    lines.push('', `## ${tool.name}`, tool.purpose, '', '### Prepare your inputs');
    for (const field of tool.spec.fields) lines.push(`- ${field.label}: __________`);
    for (const table of tool.spec.tables) {
      lines.push(
        '',
        `${table.label} (at least ${table.minRows} rows)`,
        `| ${table.columns.map((c) => c.label).join(' | ')} |`,
        `| ${table.columns.map(() => '---').join(' | ')} |`,
        `| ${table.columns.map(() => ' ').join(' | ')} |`,
      );
    }
    lines.push(
      '',
      '### What to review',
      tool.computes,
      '',
      '### Limits',
      tool.limits,
      '',
      'Result / observation: __________',
      'Next action and owner: __________',
    );
  }
  const url = URL.createObjectURL(
    new Blob([lines.join('\n')], { type: 'text/markdown;charset=utf-8' }),
  );
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${playbook.id}-template.md`;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function InsightPlaybooks() {
  const [active, setActive] = useState<Playbook | null>(null);
  const [category, setCategory] = useState('All');
  const [query, setQuery] = useState('');
  const filtered = playbooks.filter(
    (p) =>
      (category === 'All' || p.category === category) &&
      `${p.title} ${p.description} ${p.tools.map((t) => t.name).join(' ')}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  return (
    <div className="insight-library" id="playbook-library">
      <div className="playbook-intro">
        <div>
          <span className="playbook-kicker">OUTCOME COLLECTIONS</span>
          <h2 data-source-paragraph={743}>{content.sections[1].title}</h2>
          <p data-source-paragraph={744}>{content.sections[1].paragraphs[1].text}</p>
        </div>
        <label className="playbook-search">
          <Search size={18} aria-hidden="true" />
          <span className="sr-only">Search playbooks</span>
          <input
            type="search"
            placeholder="Search engines or playbooks"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
      </div>
      <div className="playbook-filters" role="group" aria-label="Filter playbooks">
        {['All', ...new Set(playbooks.map((p) => p.category))].map((c) => (
          <button
            type="button"
            key={c}
            aria-pressed={category === c}
            onClick={() => setCategory(c)}
          >
            {c}
          </button>
        ))}
      </div>
      <p className="playbook-count" aria-live="polite">
        {filtered.length} playbooks
      </p>
      <details className="playbook-source-context">
        <summary data-source-paragraph={739}>{content.sections[0].title}</summary>
        <ul>
          {content.sections[0].paragraphs.slice(1).map((line) => (
            <li key={line.sourceParagraph} data-source-paragraph={line.sourceParagraph}>
              {line.text.replace(/^\u2022\s*/, '')}
            </li>
          ))}
        </ul>
        <h3 data-source-paragraph={745}>{content.sections[2].title}</h3>
        <p data-source-paragraph={746}>{content.sections[2].paragraphs[1].text}</p>
      </details>
      <div className="playbook-grid">
        {filtered.map((p) => (
          <button
            type="button"
            className="playbook-card"
            data-category={p.category}
            key={p.id}
            onClick={() => setActive(p)}
            aria-haspopup="dialog"
          >
            <div className="playbook-art">
              <PlaybookVector category={p.category} compact />
            </div>
            <div className="playbook-card-copy">
              <span className="playbook-kicker">
                {p.category} · {p.tools.length} engines
              </span>
              <h3>{p.title}</h3>
              <p>{p.description}</p>
              <div className="playbook-tags">
                {p.tools.map((t) => (
                  <span key={t.id}>{t.name}</span>
                ))}
              </div>
              <span className="playbook-open">
                Explore playbook <ArrowUpRight size={18} aria-hidden="true" />
              </span>
            </div>
          </button>
        ))}
      </div>
      {!filtered.length && (
        <p className="playbook-empty">No playbooks match. Try another engine name or choose All.</p>
      )}
      {active && (
        <Modal title={active.title} onClose={() => setActive(null)} wide>
          <div className="playbook-guide" data-category={active.category}>
            <div className="playbook-guide-overview">
              <div>
                <span className="playbook-kicker">{active.category} PLAYBOOK</span>
                <p>{active.description}</p>
                <p className="playbook-note">
                  Use each engine separately. The template helps you prepare and review; it does not
                  run the engines automatically.
                </p>
              </div>
              <PlaybookVector category={active.category} />
            </div>
            <ol className="playbook-steps">
              {active.tools.map((tool, index) => (
                <li key={tool.id}>
                  <div className="playbook-step-title">
                    <span>{index + 1}</span>
                    <div>
                      <h3>{tool.name}</h3>
                      <p>{tool.purpose}</p>
                    </div>
                  </div>
                  <div className="playbook-step-grid">
                    <section>
                      <h4>Prepare your inputs</h4>
                      <ul>
                        {tool.spec.fields.map((field) => (
                          <li key={field.key}>{field.label}</li>
                        ))}
                        {tool.spec.tables.map((table) => (
                          <li key={table.key}>
                            <strong>{table.label}</strong> · minimum {table.minRows} rows
                            <p>{table.columns.map((c) => c.label).join(' · ')}</p>
                          </li>
                        ))}
                      </ul>
                    </section>
                    <section>
                      <h4>What you get</h4>
                      <p>{tool.computes}</p>
                      <details>
                        <summary>Scope & limitations</summary>
                        <p>{tool.limits}</p>
                      </details>
                      <Link className="playbook-tool-link" to={`/os/engines?engine=${tool.code}`}>
                        Open this engine <ArrowUpRight size={16} aria-hidden="true" />
                      </Link>
                    </section>
                  </div>
                </li>
              ))}
            </ol>
            <div className="playbook-guide-footer">
              <p>
                Record the result, its limitations, and your next action with an owner and review
                date.
              </p>
              <button
                type="button"
                className="button button-primary"
                onClick={() => downloadTemplate(active)}
              >
                <Download size={17} aria-hidden="true" /> Download template
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
