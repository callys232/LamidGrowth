import { useEffect } from 'react';

/** Public pages: images fade in slowly once they are both loaded and on screen, instead of
 * popping in. The hiding style only applies while this hook has marked the page
 * (`data-image-reveal`), so if it never runs images simply show as normal. Skipped entirely with
 * reduced motion. Styles live in public-refresh.css. */
export function useImageReveal(key: string) {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const root = document.querySelector<HTMLElement>('main.content-page');
    if (!root) return;
    root.dataset.imageReveal = '';

    const reveal = (img: HTMLImageElement) => img.setAttribute('data-revealed', '');
    const intersection = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const img = entry.target as HTMLImageElement;
          intersection.unobserve(img);
          if (img.complete) reveal(img);
          else {
            img.addEventListener('load', () => reveal(img), { once: true });
            img.addEventListener('error', () => reveal(img), { once: true });
          }
        }
      },
      { rootMargin: '0px 0px -8% 0px' },
    );
    const watch = (img: HTMLImageElement) => {
      if (!img.hasAttribute('data-revealed')) intersection.observe(img);
    };
    root.querySelectorAll('img').forEach(watch);

    // Sections render progressively; pick up images added after the first pass.
    const mutations = new MutationObserver((records) => {
      for (const record of records)
        record.addedNodes.forEach((node) => {
          if (node instanceof HTMLImageElement) watch(node);
          else if (node instanceof Element) node.querySelectorAll('img').forEach(watch);
        });
    });
    mutations.observe(root, { childList: true, subtree: true });

    return () => {
      intersection.disconnect();
      mutations.disconnect();
      delete root.dataset.imageReveal;
    };
  }, [key]);
}
