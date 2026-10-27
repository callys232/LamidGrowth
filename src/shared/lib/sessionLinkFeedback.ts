const STORAGE_KEY = 'lamid:session-visited-content-links';
const LINK_SELECTOR = 'main a:not([class]), .modal a:not([class])';

function readVisitedLinks(): Set<string> {
  try {
    const stored: unknown = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || '[]');
    return new Set(
      Array.isArray(stored)
        ? stored.filter((value): value is string => typeof value === 'string')
        : [],
    );
  } catch {
    return new Set();
  }
}

function linkKey(link: HTMLAnchorElement): string {
  return `${link.pathname}${link.search}${link.hash}`;
}

export function installSessionLinkFeedback(): void {
  const visited = readVisitedLinks();

  const markVisited = (root: ParentNode = document): void => {
    if (root instanceof HTMLAnchorElement && root.matches(LINK_SELECTOR)) {
      if (visited.has(linkKey(root))) root.dataset.sessionVisited = 'true';
    }
    root.querySelectorAll<HTMLAnchorElement>(LINK_SELECTOR).forEach((link) => {
      if (visited.has(linkKey(link))) link.dataset.sessionVisited = 'true';
    });
  };

  markVisited();
  document.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const link = target.closest<HTMLAnchorElement>(LINK_SELECTOR);
    if (!link) return;

    visited.add(linkKey(link));
    link.dataset.sessionVisited = 'true';
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify([...visited]));
    } catch {
      // Keep the clicked link marked for this render if storage is unavailable.
    }
  });

  new MutationObserver((records) => {
    records.forEach(({ addedNodes }) => {
      addedNodes.forEach((node) => {
        if (node instanceof Element) markVisited(node);
      });
    });
  }).observe(document.documentElement, { childList: true, subtree: true });
}
