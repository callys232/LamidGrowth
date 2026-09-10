export function dateLabel(value: string) {
  if (!value) return 'No date';
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(
    new Date(`${value}T12:00:00`),
  );
}
