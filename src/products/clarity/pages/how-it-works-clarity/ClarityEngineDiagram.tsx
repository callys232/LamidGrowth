import { Link } from 'react-router-dom';

const groups = [
  {
    x: 28,
    title: 'STRATEGY',
    tools: [
      'Purpose & Strategic Direction',
      'Strategy Alignment Matrix',
      'Strategic Priority Ranking',
      'External Environment Scan',
    ],
  },
  {
    x: 612,
    title: 'DECISIONS',
    tools: [
      'Decision Quality',
      'Option Comparison',
      'Scenarios & Expected Value',
      'Priority Conflict Check',
    ],
  },
];

export function ClarityEngineDiagram() {
  return (
    <section className="clarity-vector-slide" aria-labelledby="clarity-vector-heading">
      <span className="clarity-suite-label">THE CLARITY ENGINE AT A GLANCE</span>
      <h2 id="clarity-vector-heading">One question. A connected set of engines.</h2>
      <p>Strategy sets the direction. Decision engines help you compare the next move.</p>
      <div className="clarity-vector-frame">
        <svg
          viewBox="0 0 940 570"
          role="img"
          aria-labelledby="clarity-vector-title clarity-vector-description"
        >
          <title id="clarity-vector-title">Clarity suite and representative engines</title>
          <desc id="clarity-vector-description">
            Your question and evidence feed the Clarity suite. Its Strategy engines include Purpose
            and Strategic Direction, Strategy Alignment Matrix, Strategic Priority Ranking, and
            External Environment Scan. Its Decisions engines include Decision Quality, Option
            Comparison, Scenarios and Expected Value, and Priority Conflict Check. Analysis, scope,
            and limitations support your next step. You make the final decision.
          </desc>
          <defs>
            <linearGradient id="clarity-core-fill" x2="1" y2="1">
              <stop stopColor="#176b70" />
              <stop offset="1" stopColor="#0b343e" />
            </linearGradient>
          </defs>
          <g fill="none" stroke="#78aaa3" strokeWidth="2">
            <path d="M470 82V172M328 267H300M612 267H640M470 362V435" />
            <circle cx="470" cy="267" r="123" strokeDasharray="4 9" opacity=".5" />
          </g>
          <rect x="326" y="22" width="288" height="60" rx="20" fill="#e8f4f0" stroke="#a8cec5" />
          <text x="470" y="58" textAnchor="middle" fill="#12575d" fontSize="17" fontWeight="600">
            Your question + evidence
          </text>
          <circle cx="470" cy="267" r="95" fill="url(#clarity-core-fill)" />
          <circle cx="470" cy="267" r="80" fill="none" stroke="#ffffff24" />
          <text x="470" y="258" textAnchor="middle" fill="#fff" fontSize="27" fontWeight="600">
            CLARITY
          </text>
          <text x="470" y="288" textAnchor="middle" fill="#a2f0dc" fontSize="14" letterSpacing="3">
            ENGINE / SUITE
          </text>
          {groups.map((group) => (
            <g key={group.title} className="clarity-vector-group">
              <rect
                x={group.x}
                y="139"
                width="300"
                height="256"
                rx="22"
                fill="#fff"
                stroke="#bddbd5"
              />
              <rect x={group.x + 20} y="159" width="260" height="38" rx="12" fill="#e8f4f0" />
              <text
                x={group.x + 150}
                y="184"
                textAnchor="middle"
                fill="#12575d"
                fontSize="14"
                fontWeight="700"
                letterSpacing="2"
              >
                {group.title}
              </text>
              {group.tools.map((tool, index) => (
                <g key={tool}>
                  <circle cx={group.x + 24} cy={226 + index * 43} r="3" fill="#168b82" />
                  <text x={group.x + 40} y={231 + index * 43} fill="#243b47" fontSize="14">
                    {tool}
                  </text>
                </g>
              ))}
            </g>
          ))}
          <rect x="230" y="435" width="480" height="103" rx="22" fill="#0b343e" />
          <text x="470" y="469" textAnchor="middle" fill="#a2f0dc" fontSize="14">
            Analysis + scope + limitations
          </text>
          <text x="470" y="502" textAnchor="middle" fill="#fff" fontSize="19" fontWeight="600">
            Your judgment. Your next step.
          </text>
        </svg>
      </div>
      <Link className="clarity-suite-link" to="/os/engines">
        Explore the Clarity engines <span aria-hidden="true">↗</span>
      </Link>
    </section>
  );
}
