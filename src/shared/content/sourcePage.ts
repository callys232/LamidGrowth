import pages from '../../content/pageIndex';
export function documentRoute(path: string) {
  return path.startsWith('/os/workflows/') ? '/os/workflows/[id]' : path;
}
export function sourcePage(path: string) {
  return pages.find((page) => page.route === documentRoute(path));
}
