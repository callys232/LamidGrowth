import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { heroScene } from '../../../../shared/content/heroScene';
import '../product/product.css';
import '../how-it-works/how-it-works.css';
import './info.css';
import '../motion.css';
import { MoreDetail } from '../../../../shared/content/MoreDetail';
import { TalkChapter } from './TalkChapter';
import { ContactDialog } from './ContactDialog';

/** Real product clips that fit each area. Pages without a good match stay still. */
const clipFor = (path: string): string | undefined => {
  const rules: [RegExp, string][] = [
    [/^\/security/, '/videos/engines/X02.webm'],
    [/^\/trust\/privacy/, '/videos/engines/X04.webm'],
    [/^\/(responsible-ai|trust\/governance)/, '/videos/engines/Q99.webm'],
    [/^\/enterprise/, '/videos/engines/C06.webm'],
    [/^\/(demo|start)/, '/videos/engines/Q21.webm'],
    [/^\/experts/, '/videos/engines/A02.webm'],
    [/^\/(integrations|developers)/, '/videos/integrations-demo.webm'],
    [/^\/(help|support)/, '/videos/clarity-demo.webm'],
    [/^\/(insights|guides|research)/, '/videos/engines/Q35.webm'],
    [/^\/case-studies/, '/videos/engines/R05.webm'],
    [/^\/(about|careers)/, '/videos/consistency-demo.webm'],
  ];
  return rules.find(([re]) => re.test(path))?.[1];
};

const playOn = (e: { currentTarget: HTMLVideoElement }) =>
  void e.currentTarget.play().catch(() => undefined);
const pauseOn = (e: { currentTarget: HTMLVideoElement }) => e.currentTarget.pause();

interface Card {
  title: string;
  line: string;
}
interface Action {
  label: string;
  to: string;
}
export interface InfoContent {
  group: 'trust' | 'talk' | 'none';
  id: string;
  eyebrow: string;
  title: string;
  lede: string;
  primary: Action;
  secondary?: Action;
  cards: readonly Card[];
  closing: string;
  closingActions: readonly [Action, Action];
  note?: string;
  chapter?: { tag: string; headline?: string; intro?: string };
}

const groups = {
  trust: [
    { id: 'security', label: 'Security', to: '/security' },
    { id: 'responsible-ai', label: 'Responsible AI', to: '/responsible-ai' },
    { id: 'privacy', label: 'Privacy', to: '/trust/privacy' },
    { id: 'governance', label: 'Governance', to: '/trust/governance' },
    { id: 'enterprise', label: 'Enterprise', to: '/enterprise' },
  ],
  talk: [
    { id: 'contact', label: 'Contact', to: '/contact' },
    { id: 'demo', label: 'Demo', to: '/demo/request' },
    { id: 'enterprise-contact', label: 'Enterprise', to: '/enterprise/contact' },
    { id: 'experts', label: 'Experts', to: '/experts' },
    { id: 'start', label: 'Start', to: '/start' },
  ],
} as const;

const mail = 'mailto:hp@lamidconsulting.com';

export const info: Record<string, InfoContent> = {
  security: {
    group: 'trust',
    id: 'security',
    eyebrow: 'Security',
    title: 'Security you can verify.',
    lede: 'See the controls that protect identity, access and data, and the evidence behind them.',
    primary: { label: 'Request a security review', to: '/enterprise/contact' },
    secondary: { label: 'Responsible AI', to: '/responsible-ai' },
    cards: [
      {
        title: 'Identity and sign-in',
        line: 'Review how accounts are protected, including multi-factor sign-in where supported.',
      },
      {
        title: 'Access boundaries',
        line: 'Review how roles, workspaces and organisations are kept separate.',
      },
      {
        title: 'Evidence',
        line: 'Test results, certifications and reports are shared when they are verified.',
      },
      {
        title: 'Procurement review',
        line: 'Ask for the control register to support your security assessment.',
      },
    ],
    closing: 'Need something specific for your review?',
    closingActions: [
      { label: 'Contact us', to: '/contact' },
      { label: 'Governance', to: '/trust/governance' },
    ],
  },
  'responsible-ai': {
    group: 'trust',
    id: 'responsible-ai',
    eyebrow: 'Responsible AI',
    title: 'AI that strengthens human judgement.',
    lede: 'People keep the decisions that matter. The AI suggests, explains and prepares.',
    primary: { label: 'See how it works', to: '/how-it-works' },
    secondary: { label: 'Privacy and data', to: '/trust/privacy' },
    cards: [
      {
        title: 'Your information, your limits',
        line: 'The AI uses only what you have permitted for the task.',
      },
      {
        title: 'Memory you control',
        line: 'Review, edit, switch off or delete what it remembers.',
      },
      {
        title: 'Permission is not unlimited authority',
        line: 'What it may do on its own stays within the limits you set.',
      },
      {
        title: 'More capable means more oversight',
        line: 'More explanation, checks and ways to override as the AI does more.',
      },
    ],
    closing: 'Questions about how the AI is governed?',
    closingActions: [
      { label: 'Contact us', to: '/contact' },
      { label: 'Governance', to: '/trust/governance' },
    ],
  },
  privacy: {
    group: 'trust',
    id: 'privacy',
    eyebrow: 'Privacy and data',
    title: 'Your information, with clear boundaries.',
    lede: 'Know what we use, why we use it and which controls you have.',
    primary: { label: 'Read the privacy policy', to: '/legal/privacy' },
    secondary: { label: 'Contact us', to: '/contact' },
    cards: [
      {
        title: 'What is used',
        line: 'Account, workspace, uploaded and connected-source information.',
      },
      {
        title: 'Why it is used',
        line: 'Only for defined purposes, such as delivering the service.',
      },
      { title: 'Kept separate', line: 'Personal, team and organisation information stay apart.' },
      {
        title: 'Review your footprint',
        line: 'See what is held, where it came from and what you can change.',
      },
    ],
    closing: 'Want to talk about your data?',
    closingActions: [
      { label: 'Contact us', to: '/contact' },
      { label: 'Security', to: '/security' },
    ],
  },
  governance: {
    group: 'trust',
    id: 'governance',
    eyebrow: 'Governance',
    title: 'Capability needs accountability.',
    lede: 'Clear roles, permissions and ways to override, so people stay in control.',
    primary: { label: 'Responsible AI', to: '/responsible-ai' },
    secondary: { label: 'Enterprise', to: '/enterprise' },
    cards: [
      { title: 'Experience', line: 'Keep guidance clear and consistent for each audience.' },
      {
        title: 'Organisation',
        line: 'Control roles, permissions, approvals, overrides and revocation.',
      },
      {
        title: 'Continuous intelligence',
        line: 'Define what may run in the background, and with whose permission.',
      },
    ],
    closing: 'Need to see the controls in practice?',
    closingActions: [
      { label: 'Get a demo', to: '/demo/request' },
      { label: 'Security', to: '/security' },
    ],
  },
  enterprise: {
    group: 'trust',
    id: 'enterprise',
    eyebrow: 'Enterprise',
    title: 'LamidOne at organisational scale.',
    lede: 'Workspaces, governance and approved integrations for larger organisations.',
    primary: { label: 'Talk to our team', to: '/enterprise/contact' },
    secondary: { label: 'See pricing', to: '/pricing' },
    cards: [
      { title: 'Architecture', line: 'Several workspaces and role-aware access in one platform.' },
      {
        title: 'Governance',
        line: 'Policies for people, data and AI, with approvals and overrides.',
      },
      { title: 'Integrations', line: 'Connect approved systems through governed integrations.' },
      {
        title: 'Trust and control',
        line: 'Review security, responsible AI, privacy and governance together.',
      },
    ],
    closing: 'Let’s look at your environment.',
    closingActions: [
      { label: 'Talk to our team', to: '/enterprise/contact' },
      { label: 'Security', to: '/security' },
    ],
  },
  'enterprise-contact': {
    group: 'talk',
    id: 'enterprise-contact',
    eyebrow: 'Enterprise',
    title: 'Tell us about your environment.',
    lede: 'Share your priorities, systems and scale, and we’ll shape the conversation around them.',
    primary: { label: 'Email our team', to: mail },
    secondary: { label: 'Request a demo', to: '/demo/request' },
    cards: [
      { title: 'Your organisation', line: 'Who you are and how many people are involved.' },
      { title: 'Your objective', line: 'The outcome you want to reach.' },
      { title: 'Your environment', line: 'The systems and governance requirements that apply.' },
      {
        title: 'Next step',
        line: 'A product conversation, technical review or organisation demo.',
      },
    ],
    closing: 'Prefer to explore first?',
    closingActions: [
      { label: 'Get started', to: '/signup' },
      { label: 'See pricing', to: '/pricing' },
    ],
  },
  contact: {
    group: 'talk',
    id: 'contact',
    eyebrow: 'Contact',
    title: 'Start the right conversation.',
    lede: 'Choose what you need and we’ll get you to the right person.',
    chapter: {
      tag: 'Choose a topic',
      headline: 'Tell us the outcome',
      intro: 'Describe what you are trying to achieve and the context that matters.',
    },
    primary: { label: 'Email us', to: mail },
    secondary: { label: 'Request a demo', to: '/demo/request' },
    cards: [
      { title: 'Product question', line: 'Ask how LamidOne works for your situation.' },
      { title: 'Pricing', line: 'Find the plan that fits, or ask about a custom one.' },
      { title: 'Expert help', line: 'Bring an adviser in on a decision or project.' },
      { title: 'Enterprise', line: 'Security, governance and deployment questions.' },
    ],
    closing: 'Know what you want to do?',
    closingActions: [
      { label: 'Get started', to: '/signup' },
      { label: 'See pricing', to: '/pricing' },
    ],
  },
  'demo-request': {
    group: 'talk',
    id: 'demo',
    eyebrow: 'Demo',
    title: 'See LamidOne on your own work.',
    lede: 'Tell us what you want to improve, decide or coordinate. We’ll shape the demo around it.',
    chapter: { tag: 'Choose the conversation', headline: 'What are you working toward?' },
    primary: { label: 'Email us to book', to: mail },
    secondary: { label: 'Try the live demo', to: '/demo' },
    cards: [
      { title: 'Product walkthrough', line: 'The platform, end to end.' },
      { title: 'Technical architecture', line: 'How it fits your systems.' },
      { title: 'Governance review', line: 'Controls, permissions and oversight.' },
      { title: 'Tailored demo', line: 'Built around your priorities.' },
    ],
    closing: 'Want to try it yourself first?',
    closingActions: [
      { label: 'Get started', to: '/signup' },
      { label: 'Live demo', to: '/demo' },
    ],
  },
  experts: {
    group: 'talk',
    id: 'experts',
    eyebrow: 'Experts',
    title: 'Bring the right person into the work.',
    lede: 'When the next step needs specialist judgement, advisers join in the same context.',
    primary: { label: 'Talk to an adviser', to: '/contact' },
    secondary: { label: 'See pricing', to: '/pricing' },
    cards: [
      { title: 'Start with the need', line: 'Describe the decision, gap or project.' },
      {
        title: 'Expertise across the work',
        line: 'Strategy, finance, people, operations, technology and more.',
      },
      { title: 'Flexible engagements', line: 'Advisory sessions, projects or retainers.' },
      { title: 'You choose', line: 'LamidOne suggests matches. You decide who to engage.' },
    ],
    closing: 'Not sure how to define the work?',
    closingActions: [
      { label: 'Contact us', to: '/contact' },
      { label: 'Get started', to: '/signup' },
    ],
  },
  start: {
    group: 'talk',
    id: 'start',
    eyebrow: 'Get started',
    title: 'Start with where you are.',
    lede: 'Pick your starting point. You can add more contexts later without starting over.',
    primary: { label: 'Create an account', to: '/signup' },
    secondary: { label: 'Try the demo', to: '/demo' },
    cards: [
      { title: 'For myself', line: 'Individuals, professionals and creators.' },
      { title: 'For my business', line: 'Founders and small businesses.' },
      { title: 'For my team', line: 'Teams working toward one goal.' },
      { title: 'For my organisation', line: 'Larger organisations and institutions.' },
    ],
    closing: 'Start before everything is configured.',
    closingActions: [
      { label: 'Create an account', to: '/signup' },
      { label: 'Who it’s for', to: '/who-its-for' },
    ],
  },
};

export function InfoPage({ content }: { content: InfoContent }) {
  const nav = content.group === 'none' ? [] : groups[content.group];
  const { pathname } = useLocation();
  const scene = heroScene(pathname);
  const clip = clipFor(pathname);
  const [formOpen, setFormOpen] = useState(false);
  return (
    <div className="prod-page hiw-page info-page">
      {content.id === 'contact' && (
        <ContactDialog open={formOpen} onClose={() => setFormOpen(false)} />
      )}
      {nav.length > 0 && (
        <nav className="hiw-nav" aria-label={content.group === 'trust' ? 'Trust' : 'Talk to us'}>
          {nav.map((item) => (
            <Link
              key={item.id}
              to={item.to}
              aria-current={item.id === content.id ? 'page' : undefined}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      )}

      <section
        className="prod-hero info-hero"
        style={scene ? ({ '--info-scene': `url(${scene})` } as React.CSSProperties) : undefined}
      >
        <p className="prod-eyebrow">{content.eyebrow}</p>
        <h1>{content.title}</h1>
        <p className="prod-lede">{content.lede}</p>
        <div className="prod-actions">
          {content.id === 'contact' ? (
            <button
              type="button"
              className="prod-btn prod-btn-solid"
              onClick={() => setFormOpen(true)}
            >
              {content.primary.label}
            </button>
          ) : (
            <ActionLink className="prod-btn prod-btn-solid" action={content.primary} />
          )}
          {content.secondary && (
            <ActionLink className="prod-btn prod-btn-outline" action={content.secondary} />
          )}
        </div>
      </section>

      {clip && content.group !== 'talk' && (
        <figure className="info-media">
          <video
            muted
            loop
            playsInline
            preload="metadata"
            tabIndex={0}
            aria-label="Product demonstration"
            onMouseEnter={playOn}
            onMouseLeave={pauseOn}
            onFocus={playOn}
            onBlur={pauseOn}
          >
            <source src={clip} type="video/webm" />
            <source src={clip.replace(/\.webm$/, '.mp4')} type="video/mp4" />
          </video>
        </figure>
      )}

      {content.group === 'talk' ? (
        <TalkChapter
          tag={content.chapter?.tag ?? content.eyebrow}
          headline={content.chapter?.headline}
          intro={content.chapter?.intro}
          onCompose={content.id === 'contact' ? () => setFormOpen(true) : undefined}
          items={content.cards}
          clip={clip}
        />
      ) : (
        <section className="info-grid" aria-label={content.eyebrow}>
          {content.cards.map((card) => (
            <article className="prod-step" key={card.title}>
              <h2>{card.title}</h2>
              <p>{card.line}</p>
            </article>
          ))}
        </section>
      )}

      {content.note && <p className="info-note">{content.note}</p>}

      <MoreDetail />

      <section className="prod-close">
        <h2>{content.closing}</h2>
        <div className="prod-actions">
          <ActionLink className="prod-btn prod-btn-light" action={content.closingActions[0]} />
          <ActionLink className="prod-btn prod-btn-ghost" action={content.closingActions[1]} />
        </div>
      </section>
    </div>
  );
}

interface SourceJson {
  title: string;
  description?: string;
  gates?: string[];
  sections: { title: string; paragraphs: { text: string }[] }[];
}

const clip = (text: string, max: number) => {
  const first = text.split(/(?<=[.!?])\s/)[0] ?? text;
  return first.length > max ? `${first.slice(0, max - 1).trimEnd()}…` : first;
};

/** Builds a short page from an existing content.json without inventing new claims. */
export function fromContent(
  source: SourceJson,
  opts: { eyebrow: string; primary: Action; secondary?: Action },
): InfoContent {
  const cards = source.sections
    .map((s) => {
      const body = s.paragraphs
        .map((p) => p.text)
        .filter((x) => x !== s.title && !x.startsWith('CTA:'));
      const bullets = body.filter((x) => x.startsWith('•')).map((x) => x.replace(/^•\s*/, ''));
      const sentence = body.find((x) => !x.startsWith('•'));
      return {
        title: s.title.replace(/[.:]$/, ''),
        line: sentence ? clip(sentence, 120) : bullets.join(' · '),
      };
    })
    .filter((c) => c.line)
    .slice(0, 6);
  return {
    group: 'none',
    id: opts.eyebrow,
    eyebrow: opts.eyebrow,
    title: source.title,
    lede: clip(source.description ?? '', 160),
    primary: opts.primary,
    secondary: opts.secondary,
    cards,
    closing: 'Ready when you are.',
    closingActions: [
      { label: 'Get started', to: '/signup' },
      { label: 'Contact us', to: '/contact' },
    ],
    note: source.gates?.[0]?.startsWith('EVIDENCE GATE - ')
      ? source.gates[0].replace(/^EVIDENCE GATE - /, 'Evidence standard: ')
      : undefined,
  };
}

function ActionLink({ action, className }: { action: Action; className: string }) {
  return action.to.startsWith('mailto:') ? (
    <a className={className} href={action.to}>
      {action.label}
    </a>
  ) : (
    <Link className={className} to={action.to}>
      {action.label}
    </Link>
  );
}
