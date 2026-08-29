"use client";

import { isPublicStandaloneRoute } from "@/lib/publicRoutes";
import { SessionProvider } from "next-auth/react";
import { usePathname } from "next/navigation";

export function Providers({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (isPublicStandaloneRoute(pathname)) {
    return <>{children}</>;
  }

  return <SessionProvider>{children}</SessionProvider>;
}
