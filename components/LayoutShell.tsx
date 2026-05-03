"use client";

import { usePathname } from "next/navigation";

export default function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLogin = pathname === "/login";
  return <main className={isLogin ? "" : "ml-16"}>{children}</main>;
}
