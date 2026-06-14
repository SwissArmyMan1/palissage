/**
 * Zone / subdomain resolution.
 *
 * In production each role lives on its own subdomain of palissage.net:
 *   palissage.net          → public (landing + auth)
 *   winery.palissage.net   → winery app at root
 *   shop.palissage.net     → shop app at root
 *   admin.palissage.net    → admin app at root
 *   app.palissage.net      → consumer app at root
 *
 * In local dev there is no subdomain, so the public host also exposes
 * every zone under a path prefix (/winery, /shop, /admin, /consumer)
 * so the whole product is reachable on one origin. The `zoneLink`
 * helper produces the right href for either model.
 *
 * Override for testing: ?zone=admin in the URL, or VITE_ZONE env.
 */
export type Zone = 'public' | 'winery' | 'shop' | 'admin' | 'consumer';

const SUBDOMAIN_MAP: Record<string, Zone> = {
  winery: 'winery',
  shop: 'shop',
  admin: 'admin',
  app: 'consumer',
  my: 'consumer',
  consumer: 'consumer',
};

export function resolveZone(): Zone {
  if (typeof window === 'undefined') return 'public';

  const params = new URLSearchParams(window.location.search);
  const q = params.get('zone');
  if (q && q in SUBDOMAIN_MAP) return SUBDOMAIN_MAP[q];
  if (q === 'public') return 'public';

  const env = (import.meta.env as Record<string, string | undefined>).VITE_ZONE;
  if (env && env in SUBDOMAIN_MAP) return SUBDOMAIN_MAP[env];

  const host = window.location.hostname;
  const first = host.split('.')[0];
  if (
    SUBDOMAIN_MAP[first] &&
    !['localhost', '127', '0', '192'].includes(first)
  ) {
    return SUBDOMAIN_MAP[first];
  }
  return 'public';
}

export const ZONE: Zone = resolveZone();

/** True when we are served from a role subdomain (routes live at root). */
export const isSubdomainMode: boolean = ZONE !== 'public';

/** Path prefix for a role's routes given the current serving model. */
export function zoneBase(role: Exclude<Zone, 'public'>): string {
  // On the role's own subdomain its routes sit at root.
  if (ZONE === role) return '';
  // Otherwise (public host / dev) they are path-prefixed.
  return `/${role}`;
}

/** Build a link to a path inside a role, correct for subdomain or dev. */
export function zoneLink(role: Exclude<Zone, 'public'>, path = ''): string {
  const base = zoneBase(role);
  const clean = path && !path.startsWith('/') ? `/${path}` : path;
  return base + clean || '/';
}

export const PROD_HOSTS: Record<Zone, string> = {
  public: 'palissage.net',
  winery: 'winery.palissage.net',
  shop: 'shop.palissage.net',
  admin: 'admin.palissage.net',
  consumer: 'app.palissage.net',
};
