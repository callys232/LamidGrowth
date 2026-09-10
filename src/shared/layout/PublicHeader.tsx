import { ArrowUpRight, ChevronDown, Menu, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Brand } from '../ui/Brand';
import { Cta } from '../ui/Cta';
import { MotionSurface } from '../visuals/Motion';

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
    description: 'Expert services are planned and are not yet available in this release.',
    groups: [
      {
        title: 'Expert support · Planned',
        entries: [
          ['Expert Network', 'Discover specialist support.'],
          ['Consultant Matching', 'Find expertise relevant to your context.'],
          ['Verified Expertise', 'Review evidence of specialist capability.'],
        ],
      },
      {
        title: 'Capability & participation · Planned',
        entries: [
          ['Talent & Capability', 'Connect people and capability needs.'],
          ['Become an Expert', 'Contribute your professional expertise.'],
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

export function PublicHeader() {
  const [mobile, setMobile] = useState(false);
  const [active, setActive] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const header = useRef<HTMLElement>(null);
  const cancel = () => clearTimeout(timer.current);
  const close = () => {
    cancel();
    setActive('');
  };
  const leave = () => {
    cancel();
    timer.current = setTimeout(() => setActive(''), 160);
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
          <Brand />
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
                      event.pointerType === 'mouse' &&
                      window.matchMedia('(min-width: 761px)').matches
                    ) {
                      cancel();
                      setActive(menu.title);
                    }
                  }}
                  onClick={() => {
                    cancel();
                    setActive(active === menu.title ? '' : menu.title);
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
          </nav>
          <div className="header-actions">
            <Link to="/login" className="sign-in" onClick={navigate}>
              Sign in
            </Link>
            <Cta to="/start">Experience LAMID ONE</Cta>
          </div>
        </div>
      </header>
    </>
  );
}
