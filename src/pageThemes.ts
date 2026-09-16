/** Product-family assignments are design choices using the specified brand palette. */
export function pageTheme(path: string) {
  if (path.startsWith('/who-its-for')) return path.split('/')[2] || 'audiences';
  if (/finance/.test(path)) return 'finance';
  if (/capability|people/.test(path)) return 'talent';
  if (/growth|progress|opportunities/.test(path)) return 'growth';
  if (path.startsWith('/product/')) return path.split('/')[2];
  if (path.startsWith('/product')) return 'product';
  if (path.startsWith('/experts')) return 'experts';
  if (path.startsWith('/how-it-works') || path === '/os') return 'core';
  return undefined;
}
