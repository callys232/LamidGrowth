import {
  ArrowRight,
  Briefcase,
  Building2,
  Clapperboard,
  GraduationCap,
  Landmark,
  Rocket,
  Store,
  UserRound,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  PROFILES,
  TIERS,
  type DemoProfile,
  type DemoTier,
} from '../../../workspace/demo/personaList';
import '../../../workspace/pages/marketing-demo.css';

/** What each sample workspace is about — its seeded goals (src/products/workspace/demo). */
const PERSONAS: Record<
  DemoProfile,
  { icon: LucideIcon; tone: string; focus: string; summary: string }
> = {
  Individual: {
    icon: UserRound,
    tone: 'work',
    focus: 'Career',
    summary:
      'Landing a project coordinator role, an analytics certification and a case-study portfolio.',
  },
  Professional: {
    icon: Briefcase,
    tone: 'intelligence',
    focus: 'Advisory & promotion',
    summary:
      'Winning an advisory engagement, preparing for promotion and lifting consulting margins.',
  },
  Freelancer: {
    icon: Store,
    tone: 'talent',
    focus: 'Client work',
    summary:
      'Winning a retained client and improving project profitability, with ranked job matches and bids.',
  },
  Creator: {
    icon: Clapperboard,
    tone: 'opportunities',
    focus: 'Content business',
    summary:
      'Launching a paid content product, a steady publishing schedule and profitable sponsorships.',
  },
  Founder: {
    icon: Rocket,
    tone: 'risk',
    focus: 'Startup',
    summary:
      'Validating an acquisition offer, a thirteen-week cash runway and the first product release.',
  },
  Team: {
    icon: Users,
    tone: 'work',
    focus: 'Team delivery',
    summary:
      'Planning accuracy, an analyst’s workflow bottleneck and a coordinator’s handover process.',
  },
  SME: {
    icon: Building2,
    tone: 'money',
    focus: 'Operations',
    summary: 'Cash collection, service-line pricing and a practical supplier renewal plan.',
  },
  Enterprise: {
    icon: Landmark,
    tone: 'intelligence',
    focus: 'Executive decisions',
    summary: 'A capital allocation decision, director succession and a sponsor commitment review.',
  },
  Institution: {
    icon: GraduationCap,
    tone: 'talent',
    focus: 'Programmes & policy',
    summary: 'A programme funding case, policy evidence quality and partner obligations.',
  },
};

/** Workspace size scales every amount and count in the sample (sandbox TIER_SCALE 1 / 4 / 15). */
const SIZES: Record<DemoTier, { label: string; detail: string }> = {
  individual: { label: 'Individual', detail: 'One person, personal-scale budgets' },
  team: { label: 'Team', detail: 'A small team, about 4× the volume' },
  enterprise: { label: 'Enterprise', detail: 'Organisation scale, about 15× the volume' },
};

/** /demo — pick a sample persona and workspace size, then open its real workspace (sandboxed: no
 * login, nothing saved beyond this browser session). */
export function DemoProfileLauncher() {
  const [tier, setTier] = useState<DemoTier>('individual');
  const [profile, setProfile] = useState<DemoProfile>('Founder');
  const persona = PERSONAS[profile];
  const Icon = persona.icon;
  return (
    <section className="marketing-demo demo-launcher" aria-labelledby="demo-launcher-title">
      <header className="marketing-demo-hero">
        <span>EXPLORE A DEMO ACCOUNT</span>
        <h1 id="demo-launcher-title">Choose a profile. Step into its dashboard.</h1>
        <p>
          Every sample workspace has its own goals, projects with escrow, a dispute, job matches and
          activity — fictional data, no password needed. Your demo progress is saved so you can
          continue from your personal email link on another device.
        </p>
      </header>

      {/* One frame: choose a profile and the same card shows it — no grid of cards. */}
      <div className="demo-chooser">
        <div className="demo-chooser-tabs" role="tablist" aria-label="Demo profiles">
          {PROFILES.map((name) => {
            const TabIcon = PERSONAS[name].icon;
            return (
              <button
                key={name}
                type="button"
                role="tab"
                className="demo-chooser-tab"
                data-tone={PERSONAS[name].tone}
                aria-selected={profile === name}
                aria-controls="demo-persona-panel"
                onClick={() => setProfile(name)}
              >
                <TabIcon size={15} aria-hidden="true" />
                {name}
              </button>
            );
          })}
        </div>

        <div
          className="demo-persona"
          id="demo-persona-panel"
          role="tabpanel"
          data-tone={persona.tone}
        >
          <div className="demo-persona-main">
            <span className="demo-persona-icon" aria-hidden="true">
              <Icon size={24} />
            </span>
            <div className="demo-persona-copy">
              <span className="demo-persona-focus">{persona.focus}</span>
              <strong>{profile}</strong>
              <span className="demo-persona-summary">{persona.summary}</span>
            </div>
          </div>

          <div className="demo-persona-side">
            <div className="demo-size" role="radiogroup" aria-label="Workspace size">
              {TIERS.map((value) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={tier === value}
                  onClick={() => setTier(value)}
                >
                  <strong>{SIZES[value].label}</strong>
                  <span>{SIZES[value].detail}</span>
                </button>
              ))}
            </div>
            <Link
              className="demo-persona-go"
              to={`/demo/workspace?${new URLSearchParams({ profile, tier })}`}
            >
              Open the {profile} workspace <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
