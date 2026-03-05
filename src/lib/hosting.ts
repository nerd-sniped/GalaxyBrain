export function normalizeBase(base: string): string {
  if (!base || base === '/') return '/';
  const trimmed = base.trim().replace(/^\/+|\/+$/g, '');
  return trimmed ? `/${trimmed}` : '/';
}

export function detectGitHubPagesBase(): string {
  const isPages = process.env.GITHUB_PAGES === 'true';
  if (!isPages) return '/';

  const repo = process.env.GITHUB_REPOSITORY ?? '';
  const [owner, name] = repo.split('/');
  if (!owner || !name) return '/';

  if (name.toLowerCase() === `${owner.toLowerCase()}.github.io`) {
    return '/';
  }

  return normalizeBase(name);
}

export function detectSiteUrl(): string | undefined {
  if (process.env.GITHUB_PAGES === 'true') {
    const repo = process.env.GITHUB_REPOSITORY ?? '';
    const [owner] = repo.split('/');
    if (owner) return `https://${owner}.github.io`;
  }

  if (process.env.URL) return process.env.URL;
  if (process.env.DEPLOY_PRIME_URL) return process.env.DEPLOY_PRIME_URL;

  return undefined;
}

export function withBasePath(pathname: string, base = '/'): string {
  const normalizedBase = normalizeBase(base);
  const normalizedPath = pathname.startsWith('/') ? pathname : `/${pathname}`;
  if (normalizedBase === '/') return normalizedPath;
  return `${normalizedBase}${normalizedPath}`;
}
