import { ArrowUpRight, ChevronDown, Menu, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Brand } from '../ui/Brand';
import { Cta } from '../ui/Cta';
import { MotionSurface } from '../visuals/Motion';
import { PublicUtilityBar, type SearchEntry } from './PublicUtilityBar';
import { api } from '../../api';

type Session = { user: { name: string } | null };

type Entry = [string, string, string?];
const menus: {
  title: string;
  description: string;
  groups: { title: string; entries: Entry[] }[];
}[] = [
  {
    title: 'Product',
    description: 'One operating system. Context, capability, and progress connected.',
    groups: [
      {
        title: 'Discover LAMID ONE',
        entries: [
          ['Overview', 'Meet your operating system.', '/product'],
          ['Companion', 'Work through the decisions that matter.', '/product/companion'],
          ['Continuous Intelligence', 'Bring relevant context into view.', '/product/intelligence'],
        ],
      },
      {
        title: 'Put context to work',
        entries: [
          [
            'Adaptive Experience',
            'An experience that develops with your work.',
            '/product/experience',
          ],
          ['Workflows & Execution', 'Connect decisions to the next action.', '/product/workflows'],
          ['Organizations', 'Coordinate work across your organization.', '/product/organizations'],
        ],
      },
    ],
  },
  {
    title: 'Solutions',
    description: 'Find your starting point. Build progress around your context.',
    groups: [
      {
        title: 'The operating model',
        entries: [
          ['How it works', 'Explore the core operating cycle.', '/how-it-works'],
          ['Clarity', 'Understand what matters.', '/how-it-works/clarity'],
          ['Capability', 'Build what the work requires.', '/how-it-works/capability'],
          ['Consistency', 'Turn decisions into sustained action.', '/how-it-works/consistency'],
          ['Growth', 'Carry learning and progress forward.', '/how-it-works/growth'],
          ['Operating Rhythm', 'Review today, this week, and beyond.', '/how-it-works/rhythm'],
        ],
      },
      {
        title: 'For you and your work',
        entries: [
          ['Individuals', 'Find clarity and make progress.', '/who-its-for/individuals'],
          ['Professionals', 'Strengthen judgment and capability.', '/who-its-for/professionals'],
          ['Creators', 'Turn ideas into action.', '/who-its-for/creators'],
          ['Founders', 'Connect opportunity and execution.', '/who-its-for/founders'],
        ],
      },
      {
        title: 'For your organization',
        entries: [
          ['Teams', 'Shared priorities and coordinated action.', '/who-its-for/teams'],
          ['SMEs', 'Run a stronger business.', '/who-its-for/smes'],
          ['Enterprises', 'Connect capability at scale.', '/who-its-for/enterprises'],
          [
            'Institutions',
            'Strengthen continuity and responsibility.',
            '/who-its-for/institutions',
          ],
        ],
      },
    ],
  },
  {
    title: 'Experts',
    description:
      'Bring the right human expertise into the work — discover, match, verify and engage.',
    groups: [
      // /experts consolidates what were once 5 separate pages into one, banded by topic (see
      // ExpertPhaseBand.tsx / expertGroupSlug) — these all used to point at the bare /experts
      // URL, a repetitive no-op since every entry landed on the same top-of-page. Each now jumps
      // to its own band.
      {
        title: 'Expert support',
        entries: [
          ['Expert Network', 'Discover specialist support.', '/experts#finding-engaging-expertise'],
          [
            'Expert Matching',
            'Find expertise relevant to your context.',
            '/experts#expert-matching',
          ],
          [
            'Verified Expertise',
            'Review evidence of specialist capability.',
            '/experts#verification',
          ],
        ],
      },
      {
        title: 'Capability & participation',
        entries: [
          [
            'Talent & Capability',
            'Connect people and capability needs.',
            '/experts#capability-strategy',
          ],
          [
            'Become an Expert',
            'Contribute your professional expertise.',
            '/experts#become-an-expert',
          ],
        ],
      },
    ],
  },
  {
    title: 'Resources',
    description: 'Explore the ideas, guidance, and support behind better work.',
    groups: [
      {
        title: 'Learn & explore',
        entries: [
          ['Insights', 'Perspectives on better work.', '/insights'],
          ['Guides', 'Practical guidance for your next step.', '/guides'],
          ['Case Studies', 'Explore the evidence behind outcomes.', '/case-studies'],
          ['Research', 'Understand the thinking behind the system.', '/research'],
        ],
      },
      {
        title: 'Support & build',
        entries: [
          ['Help Center', 'Find answers and get unstuck.', '/help'],
          ['Getting Started', 'Complete your first operating cycle.', '/help/getting-started'],
          ['Developers', 'Explore platform documentation.', '/developers'],
          ['Integrations', 'Connect relevant external systems.', '/integrations'],
        ],
      },
      {
        title: 'Trust & responsibility',
        entries: [
          ['Responsible AI', 'Keep human judgment central.', '/responsible-ai'],
          ['Security', 'Review controls and available evidence.', '/security'],
          ['Privacy & Data', 'Understand your data boundaries.', '/trust/privacy'],
          ['Governance', 'Make accountability visible.', '/trust/governance'],
        ],
      },
    ],
  },
];

// Everything the utility-bar search can find: every mega-menu destination plus the top-level pages.
const searchIndex: SearchEntry[] = [
  { label: 'Home', description: 'The LAMID ONE operating system.', to: '/' },
  ...menus.flatMap((menu) =>
    menu.groups.flatMap((group) =>
      group.entries
        .filter((entry): entry is [string, string, string] => Boolean(entry[2]))
        .map(([label, description, to]) => ({ label, description, to })),
    ),
  ),
  { label: 'Pricing', description: 'Plans and pricing.', to: '/pricing' },
  { label: 'Demo', description: 'See LAMID ONE in action.', to: '/demo#profile-demos' },
  { label: 'Customer support', description: 'Get help from the team.', to: '/support' },
  {
    label: 'Contact sales',
    description: 'Talk to us about your organization.',
    to: '/enterprise/contact',
  },
  { label: 'Enterprise', description: 'LAMID ONE for large organizations.', to: '/enterprise' },
  { label: 'About', description: 'Who we are and why we built LAMID ONE.', to: '/about' },
  { label: 'Our story', description: 'How LAMID ONE came to be.', to: '/about/story' },
  { label: 'Leadership', description: 'The people behind LAMID ONE.', to: '/about/leadership' },
  { label: 'Careers', description: 'Join the team.', to: '/careers' },
  { label: 'Press', description: 'News and media resources.', to: '/press' },
  { label: 'Contact', description: 'Get in touch.', to: '/contact' },
  { label: 'Accessibility', description: 'Our accessibility commitments.', to: '/accessibility' },
  { label: 'Privacy policy', description: 'How we handle your data.', to: '/legal/privacy' },
  { label: 'Terms of service', description: 'The terms that govern use.', to: '/legal/terms' },
  { label: 'Log in', description: 'Sign in to your workspace.', to: '/login' },
  { label: 'Start', description: 'Experience LAMID ONE.', to: '/start' },
];

export function PublicHeader() {
  // Signed-in state: unknown (null) until the session check resolves, so the header keeps showing
  // the signed-out actions rather than flashing between the two. Any failure reads as signed out.
  const [signedInAs, setSignedInAs] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    api<Session>('/auth/session')
      .then((session) => live && setSignedInAs(session.user?.name ?? null))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);
  const [mobile, setMobile] = useState(false);
  const [active, setActive] = useState('');
  // A dropdown never opens on a bare hover — only a click arms hover-switching between tabs.
  // Leaving the nav (or any explicit close) disarms it again, so the next visit needs a click too.
  const [hoverEnabled, setHoverEnabled] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const header = useRef<HTMLElement>(null);
  const cancel = () => clearTimeout(timer.current);
  const close = () => {
    cancel();
    setActive('');
    setHoverEnabled(false);
  };
  const leave = () => {
    cancel();
    timer.current = setTimeout(() => {
      setActive('');
      setHoverEnabled(false);
    }, 160);
  };
  const navigate = () => {
    close();
    setMobile(false);
  };
  useEffect(() => () => clearTimeout(timer.current), []);
  useEffect(() => {
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && active) {
        header.current?.querySelector<HTMLButtonElement>(`[data-trigger="${active}"]`)?.focus();
        clearTimeout(timer.current);
        setActive('');
      }
    };
    document.addEventListener('keydown', escape);
    return () => document.removeEventListener('keydown', escape);
  }, [active]);
  useEffect(() => {
    const dismiss = (event: PointerEvent) => {
      if (!header.current?.contains(event.target as Node)) {
        setActive('');
        setMobile(false);
      }
    };
    document.addEventListener('pointerdown', dismiss);
    return () => document.removeEventListener('pointerdown', dismiss);
  }, []);
  return (
    <>
      <PublicUtilityBar searchIndex={searchIndex} signedIn={Boolean(signedInAs)} />
      {active && !mobile && (
        <div className="mega-backdrop" aria-hidden="true" onPointerDown={close} />
      )}
      <header
        ref={header}
        className="public-header mega-header"
        onPointerEnter={cancel}
        onPointerLeave={leave}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            header.current?.querySelector<HTMLButtonElement>(`[data-trigger="${active}"]`)?.focus();
            close();
          }
        }}
      >
        <div className="header-container">
          <Brand logo />
          <button
            className="mobile-menu icon-button"
            aria-label={mobile ? 'Close navigation' : 'Open navigation'}
            aria-expanded={mobile}
            aria-controls="main-navigation"
            onClick={() => {
              setMobile(!mobile);
              close();
            }}
          >
            {mobile ? <X /> : <Menu />}
          </button>
          <nav
            id="main-navigation"
            aria-label="Main navigation"
            className={mobile ? 'public-nav is-open' : 'public-nav'}
          >
            <Link to="/" onPointerEnter={close} onClick={navigate}>
              Home
            </Link>
            {menus.map((menu) => (
              <div
                className="mega-section"
                key={menu.title}
                onBlur={(event) => {
                  if (!event.currentTarget.contains(event.relatedTarget)) close();
                }}
              >
                <button
                  className={`nav-trigger ${active === menu.title ? 'active' : ''}`}
                  data-trigger={menu.title}
                  id={`trigger-${menu.title}`}
                  aria-expanded={active === menu.title}
                  aria-controls={`panel-${menu.title}`}
                  onPointerEnter={(event) => {
                    if (
                      hoverEnabled &&
                      event.pointerType === 'mouse' &&
                      window.matchMedia('(min-width: 901px)').matches
                    ) {
                      cancel();
                      setActive(menu.title);
                    }
                  }}
                  onClick={() => {
                    cancel();
                    if (active === menu.title) {
                      setActive('');
                      setHoverEnabled(false);
                    } else {
                      setActive(menu.title);
                      setHoverEnabled(true);
                    }
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'ArrowDown') {
                      event.preventDefault();
                      setActive(menu.title);
                      requestAnimationFrame(() =>
                        document
                          .getElementById(`panel-${menu.title}`)
                          ?.querySelector<HTMLAnchorElement>('a')
                          ?.focus(),
                      );
                    }
                  }}
                >
                  {menu.title}
                  <ChevronDown size={13} />
                </button>
                {active === menu.title && (
                  <MotionSurface
                    className="mega-panel"
                    id={`panel-${menu.title}`}
                    role="region"
                    aria-labelledby={`trigger-${menu.title}`}
                  >
                    <div className="mega-inner">
                      <div className="mega-intro">
                        <h2>
                          {menu.title === 'Product'
                            ? 'The LAMID ONE operating system'
                            : menu.title === 'Solutions'
                              ? 'Progress in every context'
                              : menu.title === 'Resources'
                                ? 'A clearer way forward'
                                : 'Human expertise, in context'}
                        </h2>
                        <p>{menu.description}</p>
                      </div>
                      <div className={`mega-columns columns-${menu.groups.length}`}>
                        {menu.groups.map((group) => (
                          <div className="mega-group" key={group.title}>
                            <h3>{group.title}</h3>
                            <ul>
                              {group.entries.map(([label, description, to]) => (
                                <li key={label}>
                                  {to ? (
                                    <Link to={to} onClick={navigate}>
                                      <span className="mega-link-title">
                                        {label}
                                        <ArrowUpRight size={15} />
                                      </span>
                                      <span className="mega-description">{description}</span>
                                    </Link>
                                  ) : (
                                    <div className="mega-planned">
                                      <span className="mega-link-title">
                                        {label}
                                        <small>Planned</small>
                                      </span>
                                      <span className="mega-description">{description}</span>
                                    </div>
                                  )}
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    </div>
                  </MotionSurface>
                )}
              </div>
            ))}
            <Link to="/pricing" onPointerEnter={close} onClick={navigate}>
              Pricing
            </Link>
            <Link to="/demo#profile-demos" onPointerEnter={close} onClick={navigate}>
              Demo
            </Link>
          </nav>
          <div className="header-actions">
            {signedInAs ? (
              <>
                <span className="sign-in signed-in-as" title={`Signed in as ${signedInAs}`}>
                  {signedInAs.split(/\s+/)[0]}
                </span>
                <Cta to="/os">Open workspace</Cta>
              </>
            ) : (
              <Cta to="/start">Experience LAMID ONE</Cta>
            )}
          </div>
        </div>
      </header>
    </>
  );
}
