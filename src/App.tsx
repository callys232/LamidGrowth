import { lazy, Suspense, useEffect } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import pages from './content/catalog';
const AuthPage = lazy(() =>
  import('./products/accounts/pages/AuthPage').then((module) => ({ default: module.AuthPage })),
);
const DemoToolsPage = lazy(() =>
  import('./products/website/pages/demo/DemoToolsPage').then((module) => ({
    default: module.DemoToolsPage,
  })),
);
const DemoWorkspacePage = lazy(() =>
  import('./products/website/pages/demo/DemoWorkspacePage').then((module) => ({
    default: module.DemoWorkspacePage,
  })),
);
const ClassicDemoPage = lazy(() =>
  import('./products/website/pages/demo/ClassicDemoPage').then((module) => ({
    default: module.ClassicDemoPage,
  })),
);
const PasswordRecovery = lazy(() =>
  import('./products/accounts/pages/PasswordRecovery').then((module) => ({
    default: module.PasswordRecovery,
  })),
);
const ResetPassword = lazy(() =>
  import('./products/accounts/pages/ResetPassword').then((module) => ({
    default: module.ResetPassword,
  })),
);
const VerifyAccount = lazy(() =>
  import('./products/accounts/pages/VerifyAccount').then((module) => ({
    default: module.VerifyAccount,
  })),
);
const Capability = lazy(() =>
  import('./products/capability/pages/CapabilityPage').then((module) => ({
    default: module.Capability,
  })),
);
const Clarity = lazy(() =>
  import('./products/clarity/pages/ClarityPage').then((module) => ({ default: module.Clarity })),
);
const Commercial = lazy(() =>
  import('./products/commercial/pages/CommercialPage').then((module) => ({
    default: module.Commercial,
  })),
);
const ProjectDetailPage = lazy(() =>
  import('./products/commercial/pages/ProjectDetailPage').then((module) => ({
    default: module.ProjectDetailPage,
  })),
);
const ProjectsListPage = lazy(() =>
  import('./products/commercial/pages/ProjectsListPage').then((module) => ({
    default: module.ProjectsListPage,
  })),
);
const EscrowsPage = lazy(() =>
  import('./products/commercial/pages/EscrowsPage').then((module) => ({
    default: module.EscrowsPage,
  })),
);
const ConciergePage = lazy(() =>
  import('./products/concierge/pages/ConciergePage').then((module) => ({
    default: module.ConciergePage,
  })),
);
const FinancePage = lazy(() =>
  import('./products/finance/pages/FinancePage').then((module) => ({
    default: module.FinancePage,
  })),
);
const EnginesPage = lazy(() =>
  import('./products/engines/pages/EnginesPage').then((module) => ({
    default: module.EnginesPage,
  })),
);
const PeoplePage = lazy(() =>
  import('./products/people/pages/PeoplePage').then((module) => ({ default: module.PeoplePage })),
);
const TalentDashboardPage = lazy(() =>
  import('./products/talent/pages/TalentDashboardPage').then((module) => ({
    default: module.TalentDashboardPage,
  })),
);
const JobMatcherPage = lazy(() =>
  import('./products/talent/pages/JobMatcherPage').then((module) => ({
    default: module.JobMatcherPage,
  })),
);
const Companion = lazy(() =>
  import('./products/companion/pages/CompanionPage').then((module) => ({
    default: module.Companion,
  })),
);
const CompanionChatPage = lazy(() =>
  import('./products/companion/pages/CompanionChatPage').then((module) => ({
    default: module.CompanionChatPage,
  })),
);
import { CompanionWidget } from './products/companion/components/CompanionWidget';
const ActionsPage = lazy(() =>
  import('./products/consistency/pages/ActionsPage').then((module) => ({
    default: module.ActionsPage,
  })),
);
const Governance = lazy(() =>
  import('./products/governance/pages/GovernancePage').then((module) => ({
    default: module.Governance,
  })),
);
const Intelligence = lazy(() =>
  import('./products/intelligence/pages/IntelligencePage').then((module) => ({
    default: module.Intelligence,
  })),
);
const Knowledge = lazy(() =>
  import('./products/knowledge/pages/KnowledgePage').then((module) => ({
    default: module.Knowledge,
  })),
);
const Notifications = lazy(() =>
  import('./products/notifications/pages/NotificationsPage').then((module) => ({
    default: module.Notifications,
  })),
);
const Members = lazy(() =>
  import('./products/organizations/pages/MembersPage').then((module) => ({
    default: module.Members,
  })),
);
const TeamsPage = lazy(() =>
  import('./products/organizations/pages/TeamsPage').then((module) => ({
    default: module.TeamsPage,
  })),
);
const OpportunitiesPage = lazy(() =>
  import('./products/commercial/pages/OpportunitiesPage').then((module) => ({
    default: module.OpportunitiesPage,
  })),
);
const GrowthPage = lazy(() =>
  import('./products/commercial/pages/GrowthPage').then((module) => ({
    default: module.GrowthPage,
  })),
);
const ConnectorsPage = lazy(() =>
  import('./products/integrations/pages/ConnectorsPage').then((module) => ({
    default: module.ConnectorsPage,
  })),
);
const ReturnStatePage = lazy(() =>
  import('./products/workspace/pages/ReturnStatePage').then((module) => ({
    default: module.ReturnStatePage,
  })),
);
const PricingBillablesPage = lazy(() =>
  import('./products/pricing/pages/PricingBillablesPage').then((module) => ({
    default: module.PricingBillablesPage,
  })),
);
const Progress = lazy(() =>
  import('./products/progress/pages/ProgressPage').then((module) => ({ default: module.Progress })),
);
const Rhythm = lazy(() =>
  import('./products/rhythm/pages/RhythmPage').then((module) => ({ default: module.Rhythm })),
);
const ScopingWizardPage = lazy(() =>
  import('./products/scoping/pages/ScopingWizardPage').then((module) => ({
    default: module.ScopingWizardPage,
  })),
);
const LearningPage = lazy(() =>
  import('./products/learning/pages/LearningPage').then((module) => ({
    default: module.LearningPage,
  })),
);
const Settings = lazy(() =>
  import('./products/settings/pages/SettingsPage').then((module) => ({ default: module.Settings })),
);
const ContentPage = lazy(() =>
  import('./products/website/pages/ContentPage').then((module) => ({
    default: module.ContentPage,
  })),
);
const Workflows = lazy(() =>
  import('./products/workflows/pages/WorkflowsPage').then((module) => ({
    default: module.Workflows,
  })),
);
import { WorkspaceShell } from './products/workspace/components/WorkspaceShell';
const Dashboard = lazy(() =>
  import('./products/workspace/pages/DashboardPage').then((module) => ({
    default: module.Dashboard,
  })),
);
const PlannedModule = lazy(() =>
  import('./products/workspace/pages/PlannedModulePage').then((module) => ({
    default: module.PlannedModule,
  })),
);
const ProfilePage = lazy(() =>
  import('./products/accounts/pages/AccountServicesPage').then((module) => ({
    default: module.ProfilePage,
  })),
);
const PrivacyPage = lazy(() =>
  import('./products/accounts/pages/AccountServicesPage').then((module) => ({
    default: module.PrivacyPage,
  })),
);
const PayoutSettingsPage = lazy(() =>
  import('./products/accounts/pages/AccountServicesPage').then((module) => ({
    default: module.PayoutSettingsPage,
  })),
);
const AnalyticsPage = lazy(() =>
  import('./products/analytics/pages/AnalyticsPage').then((module) => ({
    default: module.AnalyticsPage,
  })),
);
const DisputesPage = lazy(() =>
  import('./products/commercial/pages/DisputesPage').then((module) => ({
    default: module.DisputesPage,
  })),
);
function RouteEffects() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    // A hash target (e.g. a CTA linking to a section on the current page) scrolls to that
    // element instead of always forcing the scroll back to the top.
    const target = hash && document.getElementById(hash.slice(1));
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    else window.scrollTo(0, 0);

    const page = pages.find((p) => p.route === pathname);
    // Must match the server's PUBLIC_ORIGIN (.env) — a canonical URL, sitemap, or JSON-LD
    // identity pointing at the wrong domain actively confuses search engines, it doesn't just
    // miss an optimization.
    const siteUrl = 'https://lamidconsulting.com';
    const canonicalPath = page?.canonical || pathname;
    const fullCanonicalUrl = `${siteUrl}${canonicalPath.startsWith('/') ? canonicalPath : `/${canonicalPath}`}`;
    const pageTitle = page?.seo_title || 'LAMID ONE — Continuous Human–AI Growth Operating System';
    const pageDescription =
      page?.meta_description ||
      'A connected space for your context, decisions, and continuous human-AI growth.';

    document.title = pageTitle;

    // Indexing control: allow public editorial pages to be indexed, while keeping authenticated
    // workspace /os/* and account routes strictly noindex.
    let robots = document.querySelector('meta[name="robots"]');
    if (!robots) {
      robots = document.createElement('meta');
      robots.setAttribute('name', 'robots');
      document.head.appendChild(robots);
    }
    const isPrivate =
      pathname.startsWith('/os') ||
      pathname.startsWith('/workspace') ||
      [
        '/start',
        '/signup',
        '/login',
        '/password-recovery',
        '/reset-password',
        '/verify-account',
      ].includes(pathname);

    const indexing = isPrivate ? 'noindex, nofollow' : page?.indexing || 'index, follow';
    robots.setAttribute('content', indexing);

    let description = document.querySelector('meta[name="description"]');
    if (!description) {
      description = document.createElement('meta');
      description.setAttribute('name', 'description');
      document.head.appendChild(description);
    }
    description.setAttribute('content', pageDescription);

    // Canonical URL
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', fullCanonicalUrl);

    // OpenGraph & Twitter helpers
    const setMetaTag = (attr: 'name' | 'property', key: string, val: string) => {
      let tag = document.querySelector(`meta[${attr}="${key}"]`);
      if (!tag) {
        tag = document.createElement('meta');
        tag.setAttribute(attr, key);
        document.head.appendChild(tag);
      }
      tag.setAttribute('content', val);
    };

    setMetaTag('property', 'og:title', pageTitle);
    setMetaTag('property', 'og:description', pageDescription);
    setMetaTag('property', 'og:url', fullCanonicalUrl);
    setMetaTag('property', 'og:type', pathname === '/' ? 'website' : 'article');
    setMetaTag('property', 'og:site_name', 'LAMID ONE');

    setMetaTag('name', 'twitter:card', 'summary_large_image');
    setMetaTag('name', 'twitter:title', pageTitle);
    setMetaTag('name', 'twitter:description', pageDescription);

    // Structured JSON-LD
    let script = document.getElementById('ld-json-schema') as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement('script');
      script.id = 'ld-json-schema';
      script.type = 'application/ld+json';
      document.head.appendChild(script);
    }
    script.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'Organization',
          '@id': `${siteUrl}/#organization`,
          name: 'LAMID Consulting',
          url: siteUrl,
          logo: `${siteUrl}/favicon.svg`,
          description:
            'Continuous Human–AI Growth Operating System built from 35+ years of consulting experience.',
        },
        {
          '@type': 'WebSite',
          '@id': `${siteUrl}/#website`,
          url: siteUrl,
          name: 'LAMID ONE',
          publisher: { '@id': `${siteUrl}/#organization` },
        },
        {
          '@type': 'WebPage',
          '@id': `${fullCanonicalUrl}#webpage`,
          url: fullCanonicalUrl,
          name: pageTitle,
          description: pageDescription,
          isPartOf: { '@id': `${siteUrl}/#website` },
        },
      ],
    });
  }, [pathname, hash]);
  return null;
}
export function App() {
  return (
    <>
      <RouteEffects />
      <div id="top" />
      <Suspense
        fallback={
          <div role="status" className="panel">
            Loading page?
          </div>
        }
      >
        <Routes>
          <Route path="/" element={<ContentPage />} />
          <Route
            path="/start"
            element={
              <ContentPage>
                <AuthPage key="start" />
              </ContentPage>
            }
          />
          <Route
            path="/signup"
            element={
              <ContentPage>
                <AuthPage key="signup" />
              </ContentPage>
            }
          />
          <Route
            path="/login"
            element={
              <ContentPage>
                <AuthPage key="login" login />
              </ContentPage>
            }
          />
          <Route
            path="/demo"
            element={
              <ContentPage>
                <DemoToolsPage />
              </ContentPage>
            }
          />
          <Route
            path="/forgot-password"
            element={
              <ContentPage>
                <PasswordRecovery />
              </ContentPage>
            }
          />
          <Route
            path="/reset-password"
            element={
              <ContentPage>
                <ResetPassword />
              </ContentPage>
            }
          />
          <Route
            path="/verify"
            element={
              <ContentPage>
                <VerifyAccount />
              </ContentPage>
            }
          />
          <Route
            path="/onboarding"
            element={
              <ContentPage>
                <AuthPage key="onboarding" />
              </ContentPage>
            }
          />
          <Route path="/demo/workspace" element={<DemoWorkspacePage />} />
          <Route path="/demo/classic" element={<ClassicDemoPage />} />
          <Route path="/os/demo" element={<Navigate to="/demo#profile-demos" replace />} />
          <Route path="/os" element={<WorkspaceShell />}>
            <Route index element={<Dashboard />} />
            <Route path="today" element={<ActionsPage today />} />
            <Route path="clarity" element={<Clarity />} />
            <Route path="capability" element={<Capability />} />
            <Route path="consistency" element={<ActionsPage />} />
            <Route path="companion" element={<Companion />} />
            <Route path="companion/chat" element={<CompanionChatPage />} />
            <Route path="workflows" element={<Workflows />} />
            <Route path="workflows/:id" element={<Workflows />} />
            <Route path="settings/notifications" element={<Notifications />} />
            <Route path="notifications" element={<Notifications />} />
            <Route path="teams" element={<TeamsPage />} />
            <Route path="opportunities" element={<OpportunitiesPage />} />
            <Route path="growth" element={<GrowthPage />} />
            <Route path="integrations" element={<ConnectorsPage />} />
            <Route path="whats-new" element={<ReturnStatePage />} />
            <Route path="rhythm" element={<Rhythm />} />
            <Route path="progress" element={<Progress />} />
            <Route path="governance" element={<Governance />} />
            <Route path="audit" element={<Governance />} />
            <Route path="settings" element={<Settings />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="settings/privacy" element={<PrivacyPage />} />
            <Route path="settings/payouts" element={<PayoutSettingsPage />} />
            <Route path="analytics" element={<AnalyticsPage />} />
            <Route path="disputes" element={<DisputesPage />} />
            <Route path="admin" element={<Members />} />
            <Route path="settings/members" element={<Members />} />
            <Route path="commercial" element={<Commercial />} />
            <Route path="commercial/projects" element={<ProjectsListPage />} />
            <Route path="escrows" element={<EscrowsPage />} />
            <Route path="commercial/projects/:id" element={<ProjectDetailPage />} />
            <Route path="concierge" element={<ConciergePage />} />
            <Route path="talent" element={<TalentDashboardPage />} />
            <Route path="job-matcher" element={<JobMatcherPage />} />
            <Route path="finance" element={<FinancePage />} />
            <Route path="engines" element={<EnginesPage />} />
            <Route path="people" element={<PeoplePage />} />
            <Route path="pricing" element={<PricingBillablesPage />} />
            <Route path="scoping/new" element={<ScopingWizardPage />} />
            <Route path="learning" element={<LearningPage />} />
            <Route path="knowledge" element={<Knowledge />} />
            <Route path="insights" element={<Intelligence />} />
            <Route path="settings/ai" element={<Intelligence settings />} />
            <Route path="*" element={<PlannedModule />} />
          </Route>
          <Route path="*" element={<ContentPage />} />
        </Routes>
      </Suspense>
      <CompanionWidget />
    </>
  );
}
