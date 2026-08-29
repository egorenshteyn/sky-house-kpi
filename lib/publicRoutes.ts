export const PUBLIC_STANDALONE_ROUTES = ["/dillon-beach-revenue-estimator"] as const;

export function isPublicStandaloneRoute(pathname: string) {
  return PUBLIC_STANDALONE_ROUTES.some((route) => pathname === route);
}

export function isPublicRoute(pathname: string) {
  return (
    pathname.startsWith("/login") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/images/") ||
    pathname === "/favicon.ico" ||
    isPublicStandaloneRoute(pathname)
  );
}
