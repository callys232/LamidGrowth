export function returnDestination(params: URLSearchParams) {
  const requested = params.get('returnTo');
  return requested &&
    (requested === '/os' || requested.startsWith('/os/')) &&
    !requested.includes('\\')
    ? requested
    : '/os';
}
