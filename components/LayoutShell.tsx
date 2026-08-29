"use client";

import { usePathname } from "next/navigation";
import { isPublicStandaloneRoute } from "@/lib/publicRoutes";

export default function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLogin = pathname === "/login";
  return <main className={isLogin || isPublicStandaloneRoute(pathname) ? "" : "ml-16"}>{children}</main>;
}
