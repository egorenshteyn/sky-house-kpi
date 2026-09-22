"use client";

import { usePathname } from "next/navigation";
import { isPublicStandaloneRoute } from "@/lib/publicRoutes";

export default function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLogin = pathname === "/login";

  if (isPublicStandaloneRoute(pathname)) {
    return <>{children}</>;
  }

  return <main id="main-content" tabIndex={-1} className={isLogin ? "login-shell" : "app-shell"}>{children}</main>;
}
