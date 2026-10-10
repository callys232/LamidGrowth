export function demoDestination(pathname: string, search = '') {
  if (pathname === '/demo') {
    const tour = new URLSearchParams(search).get('tour');
    return `/demo${tour ? `?tour=${encodeURIComponent(tour)}` : ''}#demo-player`;
  }
  const tour = pathname.includes('integrations')
    ? 'integrations'
    : pathname.includes('rhythm')
      ? 'rhythm'
      : /capability|professionals/.test(pathname)
        ? 'capability'
        : /growth|founders|creators|finance|smes/.test(pathname)
          ? 'growth'
          : /consistency|teams|enterprise|organizations|workflows/.test(pathname)
            ? 'consistency'
            : 'clarity';
  return `/demo?tour=${tour}#demo-player`;
}
