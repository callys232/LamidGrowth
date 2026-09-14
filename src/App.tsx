import { useEffect } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import pages from './content/catalog';
import { AuthPage } from './products/accounts/pages/AuthPage';
import { PasswordRecovery } from './products/accounts/pages/PasswordRecovery';
import { ResetPassword } from './products/accounts/pages/ResetPassword';
import { VerifyAccount } from './products/accounts/pages/VerifyAccount';
import { Capability } from './products/capability/pages/CapabilityPage';
import { Clarity } from './products/clarity/pages/ClarityPage';
import { Commercial } from './products/commercial/pages/CommercialPage';
import { ProjectDetailPage } from './products/commercial/pages/ProjectDetailPage';
import { ProjectsListPage } from './products/commercial/pages/ProjectsListPage';
import { ConciergePage } from './products/concierge/pages/ConciergePage';
import { TalentDashboardPage } from './products/talent/pages/TalentDashboardPage';
import { Companion } from './products/companion/pages/CompanionPage';
import { CompanionChatPage } from './products/companion/pages/CompanionChatPage';
import { ActionsPage } from './products/consistency/pages/ActionsPage';
import { Governance } from './products/governance/pages/GovernancePage';
import { Intelligence } from './products/intelligence/pages/IntelligencePage';
import { Knowledge } from './products/knowledge/pages/KnowledgePage';
import { Notifications } from './products/notifications/pages/NotificationsPage';
import { Members } from './products/organizations/pages/MembersPage';
import { PricingBillablesPage } from './products/pricing/pages/PricingBillablesPage';
import { Progress } from './products/progress/pages/ProgressPage';
import { Rhythm } from './products/rhythm/pages/RhythmPage';
import { Settings } from './products/settings/pages/SettingsPage';
import { ContentPage } from './products/website/pages/ContentPage';
import { Workflows } from './products/workflows/pages/WorkflowsPage';
import { WorkspaceShell } from './products/workspace/components/WorkspaceShell';
import { Dashboard } from './products/workspace/pages/DashboardPage';
import { PlannedModule } from './products/workspace/pages/PlannedModulePage';
function RouteEffects() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
    const page = pages.find((p) => p.route === pathname);
    document.title = page?.seo_title || 'LAMID ONE';
    let robots = document.querySelector('meta[name="robots"]');
    if (!robots) {
      robots = document.createElement('meta');
      robots.setAttribute('name', 'robots');
      document.head.appendChild(robots);
    }
    robots.setAttribute('content', 'noindex, nofollow');
    const description = document.querySelector('meta[name="description"]');
    if (description)
      description.setAttribute(
        'content',
        page?.meta_description ||
          'A connected space for your context, decisions, and next chapter.',
      );
  }, [pathname]);
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
          <Route path="pricing" element={<PricingBillablesPage />} />
          <Route path="knowledge" element={<Knowledge />} />
          <Route path="insights" element={<Intelligence />} />
          <Route path="settings/ai" element={<Intelligence settings />} />
          <Route path="*" element={<PlannedModule />} />
        </Route>
        <Route path="*" element={<ContentPage />} />
      </Routes>
    </>
  );
}
