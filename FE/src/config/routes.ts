/**
 * Single source of truth for URL paths. Add nested segments here as features grow.
 * Client: public / storefront routes. Admin: back-office under /admin.
 */

export const ROUTE_SEGMENTS = {
  admin: "admin",
} as const;

const adminRoot = `/${ROUTE_SEGMENTS.admin}`;

/** Public / client-facing paths */
export const clientRoutes = {
  home: "/",
  login: "/login",
  register: "/register",
  // menu: "/menu",
  // rewards: "/rewards",
} as const;

/** Admin console paths (all prefixed with /admin) */
export const adminRoutes = {
  home: adminRoot,
  users: `${adminRoot}/users`,
  cloud: `${adminRoot}/cloud`,
} as const;

export type ClientRouteKey = keyof typeof clientRoutes;
export type AdminRouteKey = keyof typeof adminRoutes;

/** Optional: middleware / guards can import this to match admin area */
export function isAdminPath(pathname: string): boolean {
  return pathname === adminRoot || pathname.startsWith(`${adminRoot}/`);
}
