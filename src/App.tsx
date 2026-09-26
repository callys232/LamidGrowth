import { useEffect } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import pages from './content/catalog';
import { AuthPage } from './products/accounts/pages/AuthPage';
import { DemoToolsPage } from './products/website/pages/demo/DemoToolsPage';
import { PasswordRecovery } from './products/accounts/pages/PasswordRecovery';
import { ResetPassword } from './products/accounts/pages/ResetPassword';
import { VerifyAccount } from './products/accounts/pages/VerifyAccount';
import { Capability } from './products/capability/pages/CapabilityPage';
import { Clarity } from './products/clarity/pages/ClarityPage';
import { Commercial } from './products/commercial/pages/CommercialPage';
import { ProjectDetailPage } from './products/commercial/pages/ProjectDetailPage';
import { ProjectsListPage } from './products/commercial/pages/ProjectsListPage';
import { ConciergePage } from './products/concierge/pages/ConciergePage';
import { FinancePage } from './products/finance/pages/FinancePage';
import { EnginesPage } from './products/engines/pages/EnginesPage';
import { PeoplePage } from './products/people/pages/PeoplePage';
import { TalentDashboardPage } from './products/talent/pages/TalentDashboardPage';
import { Companion } from './products/companion/pages/CompanionPage';
import { CompanionChatPage } from './products/companion/pages/CompanionChatPage';
import { CompanionWidget } from './products/companion/components/CompanionWidget';
import { ActionsPage } from './products/consistency/pages/ActionsPage';
import { Governance } from './products/governance/pages/GovernancePage';
import { Intelligence } from './products/intelligence/pages/IntelligencePage';
import { Knowledge } from './products/knowledge/pages/KnowledgePage';
import { Notifications } from './products/notifications/pages/NotificationsPage';
import { Members } from './products/organizations/pages/MembersPage';
import { TeamsPage } from './products/organizations/pages/TeamsPage';
import { OpportunitiesPage } from './products/commercial/pages/OpportunitiesPage';
import { GrowthPage } from './products/commercial/pages/GrowthPage';
import { ConnectorsPage } from './products/integrations/pages/ConnectorsPage';
import { ReturnStatePage } from './products/workspace/pages/ReturnStatePage';
import { PricingBillablesPage } from './products/pricing/pages/PricingBillablesPage';
import { Progress } from './products/progress/pages/ProgressPage';
import { Rhythm } from './products/rhythm/pages/RhythmPage';
import { ScopingWizardPage } from './products/scoping/pages/ScopingWizardPage';
import { LearningPage } from './products/learning/pages/LearningPage';
import { Settings } from './products/settings/pages/SettingsPage';
import { ContentPage } from './products/website/pages/ContentPage';
import { Workflows } from './products/workflows/pages/WorkflowsPage';
import { WorkspaceShell } from './products/workspace/components/WorkspaceShell';
import { Dashboard } from './products/workspace/pages/DashboardPage';
import { PlannedModule } from './products/workspace/pages/PlannedModulePage';
function RouteEffects() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    // A hash target (e.g. a CTA linking to a section on the current page) scrolls to that
    // element instead of always forcing the scroll back to the top.
    const target = hash && document.getElementById(hash.slice(1));
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    else window.scrollTo(0, 0);

    const page = pages.find((p) => p.route === pathname);
    const siteUrl = 'https://lamid.one';
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
          '@id': 'https://lamid.one/#organization',
          name: 'LAMID Consulting',
          url: 'https://lamid.one',
          logo: 'https://lamid.one/favicon.svg',
          description:
            'Continuous Human–AI Growth Operating System built from 35+ years of consulting experience.',
        },
        {
          '@type': 'WebSite',
          '@id': 'https://lamid.one/#website',
          url: 'https://lamid.one',
          name: 'LAMID ONE',
          publisher: { '@id': 'https://lamid.one/#organization' },
        },
        {
          '@type': 'WebPage',
          '@id': `${fullCanonicalUrl}#webpage`,
          url: fullCanonicalUrl,
          name: pageTitle,
          description: pageDescription,
          isPartOf: { '@id': 'https://lamid.one/#website' },
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
          <Route path="admin" element={<Members />} />
          <Route path="settings/members" element={<Members />} />
          <Route path="commercial" element={<Commercial />} />
          <Route path="commercial/projects" element={<ProjectsListPage />} />
          <Route path="commercial/projects/:id" element={<ProjectDetailPage />} />
          <Route path="concierge" element={<ConciergePage />} />
          <Route path="talent" element={<TalentDashboardPage />} />
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
      <CompanionWidget />
    </>
  );
}
