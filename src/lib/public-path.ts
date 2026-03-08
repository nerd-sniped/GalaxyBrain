function normalizeBase(base: string): string {
  if (!base || base === '/') return '/';
  return `/${base.replace(/^\/+|\/+$/g, '')}/`;
}

export function withPublicBase(pathname: string): string {
  const base = normalizeBase(import.meta.env.BASE_URL ?? '/');
  const trimmedPath = pathname.startsWith('/') ? pathname.slice(1) : pathname;
  if (base === '/') return `/${trimmedPath}`;
  return `${base}${trimmedPath}`;
}
