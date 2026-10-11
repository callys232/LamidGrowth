import { useEscrows } from '../../commercial/hooks/useEscrows';
import { ProjectEscrowSummary } from '../components/ProjectEscrowSummary';
import { SkeletonCards } from '../../../shared/ui/Skeleton';
export function DashboardProjectsSlide() {
  const page = useEscrows();
  if (page.loading) return <SkeletonCards count={2} />;
  if (page.error)
    return (
      <section className="panel">
        <h2>Projects & escrow</h2>
        <p role="alert">{page.error}</p>
        <button className="text-button" onClick={page.retry}>
          Retry
        </button>
      </section>
    );
  return (
    <ProjectEscrowSummary
      projectCount={page.projects.length + page.internalProjectCount}
      escrows={page.escrows}
    />
  );
}
