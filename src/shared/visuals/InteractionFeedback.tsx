import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const candidates = 'main li, [role="main"] li, .lamid-home li, .modal li';
const excluded =
  'nav, footer, [role="menu"], [role="listbox"], [role="tablist"], [role="tree"], [data-scroll-feedback="off"]';

/** One observer for reading feedback, including lists loaded after navigation. */
export function InteractionFeedback() {
  const { pathname } = useLocation();
  useEffect(() => {
    const root = document.getElementById('root');
    if (!root || !('IntersectionObserver' in window)) return;
    const tracked = new Set<HTMLElement>();
    let frame = 0;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          (entry.target as HTMLElement).dataset.scrollActive = String(entry.isIntersecting);
        }
      },
      { rootMargin: '-18% 0px -25% 0px', threshold: 0.15 },
    );
    const sync = () => {
      frame = 0;
      for (const item of tracked) {
        if (!root.contains(item)) {
          observer.unobserve(item);
          tracked.delete(item);
        }
      }
      root.querySelectorAll<HTMLElement>(candidates).forEach((item) => {
        if (
          tracked.has(item) ||
          item.closest(excluded) ||
          item.hasAttribute('role') ||
          item.querySelector('ul, ol')
        )
          return;
        tracked.add(item);
        item.dataset.scrollFeedback = 'true';
        observer.observe(item);
      });
    };
    sync();
    const mutations = new MutationObserver(() => {
      if (!frame) frame = requestAnimationFrame(sync);
    });
    mutations.observe(root, { childList: true, subtree: true });
    return () => {
      cancelAnimationFrame(frame);
      mutations.disconnect();
      observer.disconnect();
      for (const item of tracked) {
        delete item.dataset.scrollFeedback;
        delete item.dataset.scrollActive;
      }
    };
  }, [pathname]);
  return null;
}
