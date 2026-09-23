export type CalendarEvent = {
  id: string;
  startAt: string;
  endAt: string;
  label: string;
  status: string;
};

function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** A 7-day-wide view starting today, grouping events by calendar day. Not a full calendar app —
 * just enough visual structure to see a week of availability/bookings at a glance instead of
 * scanning a flat list. */
export function WeekCalendar({ events }: { events: CalendarEvent[] }) {
  const today = startOfDay(new Date());
  const days = Array.from({ length: 7 }, (_, i) => {
    const day = new Date(today);
    day.setDate(day.getDate() + i);
    return day;
  });

  return (
    <div className="week-calendar">
      {days.map((day) => {
        const dayEnd = new Date(day);
        dayEnd.setDate(dayEnd.getDate() + 1);
        const dayEvents = events
          .filter((event) => {
            const start = new Date(event.startAt);
            return start >= day && start < dayEnd;
          })
          .sort((a, b) => a.startAt.localeCompare(b.startAt));
        return (
          <div key={day.toISOString()} className="week-calendar-day">
            <div className="week-calendar-day-heading">
              <span>{day.toLocaleDateString(undefined, { weekday: 'short' })}</span>
              <span>{day.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
            </div>
            {dayEvents.length === 0 ? (
              <p className="week-calendar-empty">—</p>
            ) : (
              <ul>
                {dayEvents.map((event) => (
                  <li
                    key={event.id}
                    className={`week-calendar-event week-calendar-event-${event.status}`}
                  >
                    <strong>
                      {new Date(event.startAt).toLocaleTimeString(undefined, {
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </strong>
                    <span>{event.label}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}
