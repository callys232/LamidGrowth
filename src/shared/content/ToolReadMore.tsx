import { useEffect, useRef, type ReactNode } from 'react';
import './tool-read-more.css';

export function ToolReadMore({ children, label }: { children: ReactNode; label: string }) {
  const ref = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const details = ref.current;
    const card = details?.closest('article');
    if (!details || !card) return;
    const toggle = (event: Event) => {
      const target = event.target as HTMLElement;
      if (target.closest('details, a, button, input')) return;
      if (event instanceof KeyboardEvent && !['Enter', ' '].includes(event.key)) return;
      if (event instanceof KeyboardEvent) event.preventDefault();
      details.open = !details.open;
    };
    card.addEventListener('click', toggle);
    card.addEventListener('keydown', toggle);
    const closeOutside = (event: MouseEvent) => {
      if (details.open && !card.contains(event.target as Node)) details.open = false;
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && details.open) {
        details.open = false;
        if (details.contains(document.activeElement)) {
          details.querySelector<HTMLElement>('summary')?.focus();
        }
      }
    };
    document.addEventListener('click', closeOutside);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      card.removeEventListener('click', toggle);
      card.removeEventListener('keydown', toggle);
      document.removeEventListener('click', closeOutside);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, []);
  return (
    <details ref={ref} name="suite-tool-cards" className="tool-read-more">
      <summary aria-label={`Details about ${label}`}>
        <span className="tool-read-more-open">Read more</span>
        <span className="tool-read-more-close">Read less</span>
      </summary>
      <div className="tool-read-more-body">{children}</div>
    </details>
  );
}
