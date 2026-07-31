export const associationEmail = 'info@sangajorbcs8.org';
export const siteUrl = 'https://sangajorbcs8.org';

/**
 * Return an absolute application URL. Production and hosted previews always use
 * the canonical domain; Vite's local development server remains local so auth
 * flows can be exercised without leaving the developer's machine.
 */
export function applicationUrl(path = '/') {
  const localOrigin = typeof window !== 'undefined' && /^(localhost|127\.0\.0\.1)$/.test(window.location.hostname)
    ? window.location.origin
    : siteUrl;
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${localOrigin}${normalizedPath}`;
}
