import { SkeletonBlock, SkeletonLine } from './Skeleton';

/** Shown while the whole workspace shell (nav + session state) is first loading — a skeleton
 * of the shell itself (sidebar + header + content) rather than a bare spinner, so the page
 * doesn't visually jump once the real layout mounts. */
export function Loading() {
  return (
    <div className="workspace-shell-skeleton" role="status" aria-label="Loading your workspace">
      <div className="skeleton-sidebar">
        {Array.from({ length: 8 }, (_, i) => (
          <SkeletonLine key={i} width={i === 0 ? '70%' : '85%'} height={16} />
        ))}
      </div>
      <div className="skeleton-main">
        <div className="skeleton-header">
          <SkeletonLine width={220} height={22} />
          <SkeletonLine width={340} height={12} />
        </div>
        <SkeletonBlock height={100} />
        <SkeletonBlock height={100} />
      </div>
    </div>
  );
}
