import { CalendarDays, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { AnimatePresence, m, useReducedMotion } from 'motion/react';

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function parseDate(value: string | undefined): Date | null {
  if (!value) return null;
  const [y, m, d] = value.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}
function formatValue(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function monthGrid(year: number, month: number): Date[] {
  const first = new Date(year, month, 1);
  const start = new Date(first);
  start.setDate(start.getDate() - first.getDay());
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

/** Self-contained calendar date picker — an uncontrolled drop-in for `<input type="date">` that
 * can actually be styled (the native picker is unstyleable browser chrome). Renders a hidden
 * input carrying the same YYYY-MM-DD value a native date input would, so every existing
 * FormData-based submit handler keeps working unchanged. */
export function DatePicker({
  name,
  defaultValue,
  required = false,
  placeholder = 'Select a date',
}: {
  name: string;
  defaultValue?: string;
  required?: boolean;
  placeholder?: string;
}) {
  const [value, setValue] = useState(defaultValue ?? '');
  const [open, setOpen] = useState(false);
  const [openUpward, setOpenUpward] = useState(false);
  const selected = parseDate(value);
  const [view, setView] = useState(() => selected ?? new Date());
  const wrapRef = useRef<HTMLDivElement>(null);
  const triggerId = useId();
  const reduced = useReducedMotion();
  const today = new Date();
  // Popovers open inside whatever scroll/height-constrained container they're in (typically a
  // <dialog>-based Modal) — flip upward when there isn't enough room below in the viewport,
  // instead of always opening down and spilling past the container's edge.
  const POPOVER_HEIGHT_ESTIMATE = 340;
  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    window.addEventListener('mousedown', onPointerDown);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('mousedown', onPointerDown);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const label = selected
    ? selected.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
    : placeholder;

  return (
    <div className="date-picker" ref={wrapRef}>
      <input type="hidden" name={name} value={value} required={required} />
      <button
        type="button"
        id={triggerId}
        className="date-picker-trigger"
        onClick={() => {
          setView(selected ?? new Date());
          const rect = wrapRef.current?.getBoundingClientRect();
          setOpenUpward(
            !!rect && window.innerHeight - rect.bottom < POPOVER_HEIGHT_ESTIMATE && rect.top > POPOVER_HEIGHT_ESTIMATE,
          );
          setOpen((o) => !o);
        }}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <CalendarDays size={15} strokeWidth={1.75} aria-hidden="true" />
        <span className={selected ? '' : 'date-picker-placeholder'}>{label}</span>
      </button>
      <AnimatePresence>
        {open && (
          <m.div
            className={`date-picker-popover${openUpward ? ' is-upward' : ''}`}
            role="dialog"
            aria-label="Choose a date"
            initial={reduced ? false : { opacity: 0, y: openUpward ? 6 : -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduced ? undefined : { opacity: 0, y: openUpward ? 6 : -6 }}
            transition={{ duration: 0.16 }}
          >
            <div className="date-picker-header">
              <button
                type="button"
                aria-label="Previous month"
                onClick={() => setView((v) => new Date(v.getFullYear(), v.getMonth() - 1, 1))}
              >
                <ChevronLeft size={16} />
              </button>
              <span>{view.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</span>
              <button
                type="button"
                aria-label="Next month"
                onClick={() => setView((v) => new Date(v.getFullYear(), v.getMonth() + 1, 1))}
              >
                <ChevronRight size={16} />
              </button>
            </div>
            <div className="date-picker-weekdays" aria-hidden="true">
              {WEEKDAYS.map((w, i) => (
                <span key={i}>{w}</span>
              ))}
            </div>
            <div className="date-picker-grid">
              {monthGrid(view.getFullYear(), view.getMonth()).map((day) => {
                const inMonth = day.getMonth() === view.getMonth();
                const isToday = isSameDay(day, today);
                const isSelected = selected && isSameDay(day, selected);
                return (
                  <button
                    type="button"
                    key={day.toISOString()}
                    className={[
                      inMonth ? '' : 'is-outside',
                      isToday ? 'is-today' : '',
                      isSelected ? 'is-selected' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    onClick={() => {
                      setValue(formatValue(day));
                      setOpen(false);
                    }}
                  >
                    {day.getDate()}
                  </button>
                );
              })}
            </div>
            {value && (
              <button
                type="button"
                className="date-picker-clear"
                onClick={() => {
                  setValue('');
                  setOpen(false);
                }}
              >
                <X size={13} /> Clear date
              </button>
            )}
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}
