import pages from '../../content/pageIndex';

export function documentRoute(path: string) {
  // Normalize trailing slashes so /pricing, /pricing/, /product, /product/ resolve identically
  const clean = path.length > 1 && path.endsWith('/') ? path.replace(/\/+$/, '') : path;
  return clean.startsWith('/os/workflows/') ? '/os/workflows/[id]' : clean;
}

export function sourcePage(path: string) {
  return pages.find((page) => page.route === documentRoute(path));
}
