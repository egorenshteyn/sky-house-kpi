"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { isPublicStandaloneRoute } from "@/lib/publicRoutes";

type IconProps = { className?: string };

const NAV_LINKS: { href: string; label: string; icon: (props: IconProps) => JSX.Element }[] = [
  {
    href: "/",
    label: "Dashboard",
    icon: ({ className }) => (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z" />
      </svg>
    ),
  },
  {
    href: "/calendar",
    label: "Calendar",
    icon: ({ className }) => (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 3v4M16 3v4M4 9h16M5 6h14a1 1 0 011 1v12a1 1 0 01-1 1H5a1 1 0 01-1-1V7a1 1 0 011-1z" />
      </svg>
    ),
  },
  {
    href: "/bookings",
    label: "Bookings",
    icon: ({ className }) => (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5h6a1 1 0 011 1v1h2a1 1 0 011 1v12a1 1 0 01-1 1H6a1 1 0 01-1-1V8a1 1 0 011-1h2V6a1 1 0 011-1zM9 12h6M9 16h6" />
      </svg>
    ),
  },
  {
    href: "/guests",
    label: "Guests",
    icon: ({ className }) => (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11a3 3 0 100-6 3 3 0 000 6zM8 11a3 3 0 100-6 3 3 0 000 6zM2 20c0-2.5 2.5-4.5 6-4.5s6 2 6 4.5M14 20c0-2.5 2.5-4.5 6-4.5" />
      </svg>
    ),
  },
  {
    href: "/performance",
    label: "Performance",
    icon: ({ className }) => (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 20h16M7 16V10M12 16V6M17 16v-9" />
      </svg>
    ),
  },
  {
    href: "/annual",
    label: "Annual",
    icon: ({ className }) => (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3l9 5-9 5-9-5 9-5zM3 13l9 5 9-5M3 17l9 5 9-5" />
      </svg>
    ),
  },
  {
    href: "/financials",
    label: "Financials",
    icon: ({ className }) => (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3v18M16 7H10a2.5 2.5 0 000 5h4a2.5 2.5 0 010 5H8" />
      </svg>
    ),
  },
  {
    href: "/pricing",
    label: "Pricing",
    icon: ({ className }) => (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 17l6-6 4 4 6-8M5 20h14" />
      </svg>
    ),
  },
  {
    href: "/channels",
    label: "Channels",
    icon: ({ className }) => (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 21a9 9 0 100-18 9 9 0 000 18zM3 12h18M12 3a14 14 0 010 18M12 3a14 14 0 000 18" />
      </svg>
    ),
  },
  {
    href: "/comps",
    label: "Comps",
    icon: ({ className }) => (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3v18M5 6h14M3 12l3-6 3 6a3 3 0 11-6 0zM15 12l3-6 3 6a3 3 0 11-6 0z" />
      </svg>
    ),
  },
  {
    href: "/insights",
    label: "AI Insights",
    icon: ({ className }) => (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 3L4 14h7l-1 7 9-11h-7l1-7z" />
      </svg>
    ),
  },
  {
    href: "/knowledge",
    label: "Knowledge",
    icon: ({ className }) => (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 5a2 2 0 012-2h12a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V5zM4 17h14M8 7h8M8 11h6" />
      </svg>
    ),
  },
  {
    href: "/admin",
    label: "Admin",
    icon: ({ className }) => (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15a3 3 0 100-6 3 3 0 000 6z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09a1.65 1.65 0 001.51-1 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
      </svg>
    ),
  },
];

export default function Header() {
  const pathname = usePathname();
  if (pathname === "/login" || isPublicStandaloneRoute(pathname)) return null;

  return (
    <aside className="sidebar group fixed top-0 left-0 z-40 h-screen bg-[#161616] text-white flex flex-col overflow-hidden">
      <Link href="/" className="sidebar-logo shrink-0 border-b border-white/5">
        <span className="sidebar-logo-mark">S</span>
        <span className="nav-label sidebar-logo-label">SKY HOUSE</span>
      </Link>

      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3 space-y-1">
        {NAV_LINKS.map((link) => {
          const isActive =
            link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`sidebar-link ${isActive ? "active" : ""}`}
              title={link.label}
            >
              <Icon className="sidebar-icon" />
              <span className="nav-label sidebar-link-label">{link.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="shrink-0 border-t border-white/5 py-3 space-y-1">
        <Link href="/bookings/new" className="sidebar-action sidebar-action-primary" title="New Booking">
          <svg className="sidebar-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v14M5 12h14" />
          </svg>
          <span className="nav-label sidebar-link-label">New Booking</span>
        </Link>
        <Link href="/upload" className="sidebar-action sidebar-action-ghost" title="Upload">
          <svg className="sidebar-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          <span className="nav-label sidebar-link-label">Upload</span>
        </Link>
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="sidebar-action sidebar-action-ghost w-full"
          title="Sign out"
        >
          <svg className="sidebar-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H9m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h6a3 3 0 013 3v1" />
          </svg>
          <span className="nav-label sidebar-link-label">Sign out</span>
        </button>
      </div>
    </aside>
  );
}
