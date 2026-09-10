import {
  BriefcaseBusiness,
  Lightbulb,
  Users,
  Wallet,
  Flag,
  Check,
  CalendarDays,
} from 'lucide-react';

const summaries = [
  'Compare your current strengths with a new role and the development it requires.',
  'Shape an idea by checking the need, capability, and commercial fit before choosing a direction.',
  'Bring budget, people, and delivery together around the next business milestone.',
  'Connect teams and responsibilities to a shared priority.',
];

export function OutcomeDiagram({ index }: { index: number }) {
  return (
    <svg
      className="home-outcome-diagram"
      viewBox="0 0 440 230"
      role="img"
      aria-label={summaries[index]}
    >
      {index === 0 && (
        <>
          <path
            d="M117 124 H205 Q228 124 228 92 V68 H307 M228 124 V178 H307"
            className="outcome-connector"
          />
          <rect x="22" y="71" width="128" height="105" rx="12" className="outcome-paper" />
          <BriefcaseBusiness x="73" y="88" width="25" height="25" className="outcome-icon" />
          <text x="86" y="136">
            Your strengths
          </text>
          <text x="86" y="155" className="outcome-small">
            What you bring
          </text>
          <rect x="286" y="35" width="132" height="67" rx="10" className="outcome-tint" />
          <text x="352" y="62">
            New role
          </text>
          <text x="352" y="83" className="outcome-small">
            Opportunity + timing
          </text>
          <rect x="286" y="145" width="132" height="67" rx="10" className="outcome-paper" />
          <text x="352" y="173">
            Development
          </text>
          <text x="352" y="194" className="outcome-small">
            What to build next
          </text>
          <circle cx="228" cy="124" r="18" className="outcome-tint" />
          <path d="M222 124 H234 M230 120 L234 124 L230 128" className="outcome-connector" />
        </>
      )}
      {index === 1 && (
        <>
          <path d="M87 113 H145 M287 113 H342" className="outcome-connector" />
          <circle cx="65" cy="113" r="35" className="outcome-tint" />
          <Lightbulb x="50" y="96" width="30" height="30" className="outcome-icon" />
          <text x="65" y="172">
            Your idea
          </text>
          <rect x="144" y="35" width="148" height="156" rx="12" className="outcome-paper" />
          <text x="218" y="63">
            Test the fit
          </text>
          {['Real need', 'Capability', 'Commercial fit'].map((label, i) => (
            <g key={label}>
              <rect
                x="160"
                y={78 + i * 33}
                width="116"
                height="25"
                rx="5"
                className="outcome-tint"
              />
              <text x="218" y={95 + i * 33} className="outcome-small">
                {label}
              </text>
            </g>
          ))}
          <circle cx="373" cy="113" r="31" className="outcome-tint" />
          <Flag x="360" y="100" width="26" height="26" className="outcome-icon" />
          <text x="373" y="172">
            Direction
          </text>
        </>
      )}
      {index === 2 && (
        <>
          <path
            d="M92 71 H194 Q218 71 218 115 M92 115 H258 M92 159 H194 Q218 159 218 115"
            className="outcome-connector"
          />
          {[
            ['Budget', Wallet],
            ['People', Users],
            ['Delivery', CalendarDays],
          ].map(([label, Icon], i) => {
            const Shape = Icon as typeof Wallet;
            return (
              <g key={String(label)}>
                <rect
                  x="24"
                  y={44 + i * 52}
                  width="137"
                  height="40"
                  rx="8"
                  className="outcome-paper"
                />
                <Shape x="36" y={55 + i * 52} width="18" height="18" className="outcome-icon" />
                <text x="106" y={69 + i * 52}>
                  {String(label)}
                </text>
              </g>
            );
          })}
          <rect x="257" y="52" width="156" height="136" rx="12" className="outcome-tint" />
          <Flag x="322" y="69" width="26" height="26" className="outcome-icon" />
          <text x="335" y="119">
            Next milestone
          </text>
          <path d="M282 138 H388 M282 151 H362" className="outcome-connector" />
          <text x="335" y="174" className="outcome-small">
            One connected plan
          </text>
        </>
      )}
      {index === 3 && (
        <>
          <path
            d="M220 86 V117 M81 151 V117 H359 V151 M220 117 V151"
            className="outcome-connector"
          />
          <rect x="136" y="26" width="168" height="60" rx="11" className="outcome-tint" />
          <Flag x="155" y="44" width="22" height="22" className="outcome-icon" />
          <text x="237" y="61">
            Shared priority
          </text>
          {['Team A', 'Team B', 'Team C'].map((team, i) => (
            <g key={team}>
              <rect
                x={23 + i * 139}
                y="150"
                width="116"
                height="63"
                rx="10"
                className="outcome-paper"
              />
              <Users x={36 + i * 139} y="163" width="20" height="20" className="outcome-icon" />
              <text x={92 + i * 139} y="178">
                {team}
              </text>
              <text x={81 + i * 139} y="199" className="outcome-small">
                Clear ownership
              </text>
            </g>
          ))}
          <circle cx="220" cy="117" r="12" className="outcome-tint" />
          <Check x="213" y="110" width="14" height="14" className="outcome-icon" />
        </>
      )}
    </svg>
  );
}
