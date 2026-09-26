/** Shimmering placeholder blocks shown in place of real content while it loads. Compose the
 * primitives below to approximate the shape of whatever they're standing in for — a row of
 * `SkeletonLine`s for text, `SkeletonBlock` for a card/panel, `SkeletonList` for repeated rows. */
export function SkeletonLine({ width = '100%', height = 12 }: { width?: number | string; height?: number }) {
  return <span className="skeleton skeleton-line" style={{ width, height }} />;
}

export function SkeletonBlock({ width = '100%', height = 80 }: { width?: number | string; height?: number }) {
  return <div className="skeleton skeleton-block" style={{ width, height }} />;
}

export function SkeletonCircle({ size = 32 }: { size?: number }) {
  return <span className="skeleton skeleton-circle" style={{ width: size, height: size }} />;
}

/** A vertical stack of list-item skeletons, each with a title line and a subtitle line —
 * the shape shared by every activity-feed/catalog/table-row list in this app. */
export function SkeletonList({ rows = 5 }: { rows?: number }) {
  return (
    <ul className="skeleton-list" aria-hidden="true">
      {Array.from({ length: rows }, (_, i) => (
        <li key={i} className="skeleton-list-row">
          <SkeletonLine width="60%" height={14} />
          <SkeletonLine width="35%" height={10} />
        </li>
      ))}
    </ul>
  );
}

/** A grid of card skeletons — dashboards and catalogs that lay out in cards rather than rows. */
export function SkeletonCards({ count = 4 }: { count?: number }) {
  return (
    <div className="skeleton-cards" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="skeleton-card">
          <SkeletonLine width="50%" height={14} />
          <SkeletonBlock height={48} />
        </div>
      ))}
    </div>
  );
}
