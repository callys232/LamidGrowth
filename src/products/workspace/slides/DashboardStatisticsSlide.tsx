import { CalendarDays, CheckCircle2, GitBranch, Target } from 'lucide-react';
import type { useDashboardPage } from '../hooks/useDashboardPage';

export function DashboardStatisticsSlide({
  active,
  state,
  done,
}: Pick<ReturnType<typeof useDashboardPage>, 'active' | 'state' | 'done'>) {
  return (
    <>
      <div className="stat-grid">
        {[
          {
            label: 'Active objectives',
            value: active.length,
            detail: 'A direction worth moving toward',
            icon: Target,
          },
          {
            label: 'Actions in motion',
            value: state.actions.filter((a) => a.status === 'In progress').length,
            detail: 'Intent, turning into execution',
            icon: GitBranch,
          },
          {
            label: 'Actions completed',
            value: done,
            detail: 'Each step builds on the last',
            icon: CheckCircle2,
          },
          {
            label: 'Reflections recorded',
            value: state.reviews.length,
            detail: 'Learning that carries forward',
            icon: CalendarDays,
          },
        ].map(({ label, value, detail, icon: Icon }) => (
          <div className="stat-card" key={label}>
            <div>
              <span>{label}</span>
              <Icon size={17} />
            </div>
            <strong>{value.toString().padStart(2, '0')}</strong>
            <small>{detail}</small>
          </div>
        ))}
      </div>
    </>
  );
}
