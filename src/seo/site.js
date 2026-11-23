// Resolves the public site address (no trailing slash).
// Order: SITE_URL → VITE_SITE_URL → Vercel's production domain → localhost (dev only).
export function resolveSiteUrl(env = globalThis.process?.env || {}) {
  const clean = (v) => (v && v !== 'undefined' ? String(v).trim() : '');
  const fromVercel = clean(env.VERCEL_PROJECT_PRODUCTION_URL);
  const raw =
    clean(env.SITE_URL) ||
    clean(env.VITE_SITE_URL) ||
    (fromVercel ? `https://${fromVercel}` : '') ||
    'http://localhost:3000';
  return raw.replace(/\/+$/, '');
}

// Only plain numeric ESPN ids are accepted in URLs.
export function isValidEspnId(id) {
  return typeof id === 'string' && /^\d{1,12}$/.test(id);
}
