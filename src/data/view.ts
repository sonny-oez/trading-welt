export type AppView = 'welt' | 'dashboard';

export function readAppView(search: string): AppView {
  const query = search.startsWith('?') ? search.slice(1) : search;
  return new URLSearchParams(query).get('view') === 'dashboard' ? 'dashboard' : 'welt';
}

export function hrefForView(next: AppView, href: string): string {
  const url = new URL(href);
  if (next === 'dashboard') url.searchParams.set('view', 'dashboard');
  else url.searchParams.delete('view');
  return `${url.pathname}${url.search}${url.hash}`;
}
