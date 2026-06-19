export const PUBLIC_ROUTES = ["/", "/auth", "/staff-login", "/forgot-password", "/reset-password"];

export function isRouteMatch(pathname: string, routes: string[]) {
  return routes.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

export function isPublicRoute(pathname: string) {
  return isRouteMatch(pathname, PUBLIC_ROUTES);
}
