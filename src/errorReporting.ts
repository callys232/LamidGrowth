export function reportClientError(type: 'render' | 'error' | 'rejection', value: unknown) {
  const error = value instanceof Error ? value : new Error(String(value));
  const apiBase = import.meta.env.VITE_API_BASE_URL || '';
  void fetch(`${apiBase}/api/client-errors`, {
    method: 'POST',
    credentials: apiBase ? 'include' : 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type,
      name: error.name.slice(0, 100),
      message: error.message.slice(0, 500),
    }),
  }).catch(() => {});
}
