import {
  BarChart3,
  Bell,
  CalendarDays,
  Compass,
  Cpu,
  GitBranch,
  GraduationCap,
  LayoutDashboard,
  Layers3,
  ListTodo,
  Network,
  Plug,
  Settings2,
  ShieldCheck,
  Sun,
  Target,
  TrendingUp,
  Users,
  Wallet,
  Wand2,
  type LucideIcon,
} from 'lucide-react';
import type { Domain } from './domains';

export type NavItem = {
  title: string;
  to: string;
  icon: LucideIcon;
  domain: Domain;
  /** Promoted only when the workspace has this activity; otherwise listed under More tools. */
  requires?: 'project' | 'talent';
  badge?: number;
};
export type NavSection = { label: string; domain: Domain; items: NavItem[] };
export type WorkspaceActivity = {
  hasProject: boolean;
  hasTalentProfile: boolean;
  openDisputes: number;
};

const item = (
  title: string,
  to: string,
  icon: LucideIcon,
  domain: Domain,
  requires?: NavItem['requires'],
): NavItem => ({ title, to, icon, domain, ...(requires ? { requires } : {}) });

/** Every workspace tool, grouped by domain. Each entry appears exactly once. */
export const NAV_SECTIONS: NavSection[] = [
  {
    label: 'Workspace',
    domain: 'work',
    items: [
      item('Overview', '/os', LayoutDashboard, 'work'),
      item('Today', '/os/today', Sun, 'work'),
    ],
  },
  {
    label: 'Work',
    domain: 'work',
    items: [
      item('Clarity', '/os/clarity', Compass, 'work'),
      item('Capability', '/os/capability', Layers3, 'work'),
      item('Consistency', '/os/consistency', ListTodo, 'work'),
      item('Progress', '/os/progress', TrendingUp, 'work'),
      item('Rhythm', '/os/rhythm', CalendarDays, 'work'),
      item('Commercial', '/os/commercial', GitBranch, 'work'),
      item('Projects', '/os/commercial/projects', Layers3, 'work'),
    ],
  },
  {
    label: 'Money',
    domain: 'money',
    items: [
      item('Escrows', '/os/escrows', Wallet, 'money', 'project'),
      item('Finance', '/os/finance', Wallet, 'money'),
      item('Plans & Billing', '/os/pricing', Wallet, 'money'),
      item('Payout Accounts', '/os/settings/payouts', Wallet, 'money'),
    ],
  },
  {
    label: 'Risk',
    domain: 'risk',
    items: [item('Disputes', '/os/disputes', ShieldCheck, 'risk', 'project')],
  },
  {
    label: 'Talent',
    domain: 'talent',
    items: [
      item('Talent', '/os/talent', Users, 'talent', 'talent'),
      item('Job Matcher', '/os/job-matcher', Target, 'talent', 'talent'),
      item('Teams', '/os/teams', Users, 'talent'),
      item('People', '/os/people', Network, 'talent'),
      item('Members', '/os/settings/members', Users, 'talent'),
    ],
  },
  {
    label: 'Opportunities',
    domain: 'opportunities',
    items: [
      item('Opportunities', '/os/opportunities', Target, 'opportunities'),
      item('Growth', '/os/growth', BarChart3, 'opportunities'),
    ],
  },
  {
    label: 'Intelligence',
    domain: 'intelligence',
    items: [
      item('Insights', '/os/insights', BarChart3, 'intelligence'),
      item('Analytics', '/os/analytics', BarChart3, 'intelligence'),
      item('Knowledge', '/os/knowledge', Layers3, 'intelligence'),
      item('Engines', '/os/engines', Cpu, 'intelligence'),
      item('AI Settings', '/os/settings/ai', Settings2, 'intelligence'),
      item('Learning', '/os/learning', GraduationCap, 'intelligence'),
    ],
  },
  {
    label: 'Account',
    domain: 'account',
    items: [
      item('Profile', '/os/profile', Users, 'account'),
      item('Privacy & Security', '/os/settings/privacy', ShieldCheck, 'account'),
      item('Notifications', '/os/notifications', Bell, 'account'),
      item('Integrations', '/os/integrations', Plug, 'account'),
      item('Guided Scoping', '/os/scoping/new', Wand2, 'account'),
      item("What's new", '/os/whats-new', Bell, 'account'),
    ],
  },
];

/** Promote tools the workspace is actively using; list the rest under More tools so nothing
 * becomes undiscoverable. Disputes carries the open-dispute count as a badge. */
export function buildNav(activity: WorkspaceActivity): { sections: NavSection[]; more: NavItem[] } {
  const more: NavItem[] = [];
  const met = (need?: NavItem['requires']) =>
    !need ||
    (need === 'project' && activity.hasProject) ||
    (need === 'talent' && activity.hasTalentProfile);
  const sections = NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.flatMap((entry) => {
      const withBadge =
        entry.title === 'Disputes' && activity.openDisputes > 0
          ? { ...entry, badge: activity.openDisputes }
          : entry;
      if (met(entry.requires)) return [withBadge];
      more.push(withBadge);
      return [];
    }),
  })).filter((section) => section.items.length > 0);
  return { sections, more };
}
