import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import './scroll-pop.css';

const targets =
  'main section > *, main article, main figure, .lamid-home section > *, .lamid-home article';
const excluded =
  'nav, footer, header, [role="tablist"], [role="menu"], [role="dialog"], [data-scroll-pop="off"]';

function usePhone() {
  const query = '(max-width: 768px) and (prefers-reduced-motion: no-preference)';
  const [on, setOn] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const media = window.matchMedia(query);
    const update = () => setOn(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  return on;
}

/** On phones, sections, cards, assets and buttons pop into view as they are scrolled to. */
export function ScrollPop() {
  const { pathname } = useLocation();
  const phone = usePhone();
  useEffect(() => {
    const root = document.getElementById('root');
    if (!root || !phone || !('IntersectionObserver' in window)) return;
    const tracked = new Set<HTMLElement>();
    let frame = 0;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          (entry.target as HTMLElement).dataset.scrollPop = 'in';
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
    );
    const sync = () => {
      frame = 0;
      root.querySelectorAll<HTMLElement>(targets).forEach((item) => {
        if (tracked.has(item) || item.closest(excluded)) return;
        tracked.add(item);
        const index = Array.from(item.parentElement?.children ?? []).indexOf(item);
        item.style.setProperty('--pop-delay', `${Math.min(index, 3) * 70}ms`);
        item.dataset.scrollPop = 'out';
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
        delete item.dataset.scrollPop;
        item.style.removeProperty('--pop-delay');
      }
    };
  }, [pathname, phone]);
  return null;
}
