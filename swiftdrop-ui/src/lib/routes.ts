import type { UserRole } from "@/types/api";

export type PortalKey = "customer" | "merchant" | "courier" | "staff";

export const PUBLIC_ROUTES = ["/", "/auth", "/staff-login", "/forgot-password", "/reset-password"];
export const ADMIN_ROUTES = [
  "/dashboard",
  "/orders",
  "/drivers",
  "/merchants",
  "/event-stream",
  "/outbox",
  "/system-monitoring",
  "/health",
  "/users-approvals",
  "/settings",
  "/profile",
];
export const PORTAL_ROUTES = ["/customer", "/merchant", "/courier"];

export const PORTAL_ROUTE_BY_ROLE: Record<UserRole, string> = {
  ADMIN: "/dashboard",
  CUSTOMER: "/customer",
  MERCHANT: "/merchant",
  DRIVER: "/courier",
};

export const AUTH_PORTAL_BY_ROLE: Record<UserRole, PortalKey> = {
  ADMIN: "staff",
  CUSTOMER: "customer",
  MERCHANT: "merchant",
  DRIVER: "courier",
};

export const PORTAL_ROLE_BY_ROUTE: Record<string, UserRole> = {
  "/customer": "CUSTOMER",
  "/merchant": "MERCHANT",
  "/courier": "DRIVER",
};

export function isRouteMatch(pathname: string, routes: string[]) {
  return routes.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

export function isPublicRoute(pathname: string) {
  return isRouteMatch(pathname, PUBLIC_ROUTES);
}

export function resolveRoleRedirect(role: UserRole) {
  return PORTAL_ROUTE_BY_ROLE[role];
}

export function resolveAuthPortal(role: UserRole) {
  return AUTH_PORTAL_BY_ROLE[role];
}

export function resolvePortalRouteRole(pathname: string) {
  const route = PORTAL_ROUTES.find((portalRoute) => (
    pathname === portalRoute || pathname.startsWith(`${portalRoute}/`)
  ));

  return route ? PORTAL_ROLE_BY_ROUTE[route] : null;
}
