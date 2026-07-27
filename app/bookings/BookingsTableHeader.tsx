import React from "react";
import Link from "next/link";
import type { BookingSortKey, SortDirection } from "@/lib/booking-list";

const COLUMNS: Array<{
  key: BookingSortKey;
  label: string;
  align?: "right";
}> = [
  { key: "guest", label: "Guest" },
  { key: "channel", label: "Channel" },
  { key: "status", label: "Status" },
  { key: "bookingDate", label: "Booking Date" },
  { key: "checkIn", label: "Check-in" },
  { key: "checkOut", label: "Check-out" },
  { key: "nights", label: "Nights" },
  { key: "revenue", label: "Revenue", align: "right" },
  { key: "adr", label: "ADR", align: "right" },
];

type FilterSearchParams = {
  q?: string;
  channel?: string;
  status?: string;
};

function sortHref(
  searchParams: FilterSearchParams,
  key: BookingSortKey,
  direction: SortDirection,
): string {
  const params = new URLSearchParams();
  for (const name of ["q", "channel", "status"] as const) {
    const value = searchParams[name];
    if (value) params.set(name, value);
  }
  params.set("sort", key);
  params.set("direction", direction);
  return `/bookings?${params.toString()}`;
}

export default function BookingsTableHeader({
  activeSort,
  direction,
  searchParams,
}: {
  activeSort: BookingSortKey;
  direction: SortDirection;
  searchParams: FilterSearchParams;
}) {
  return (
    <thead>
      <tr className="text-left text-xs text-gray-400 font-mono uppercase bg-gray-50/50">
        {COLUMNS.map(({ key, label, align }) => {
          const active = activeSort === key;
          const nextDirection: SortDirection = active && direction === "asc" ? "desc" : "asc";
          return (
            <th
              key={key}
              scope="col"
              aria-sort={active ? (direction === "asc" ? "ascending" : "descending") : "none"}
              className={`px-5 py-2.5 font-medium whitespace-nowrap ${align === "right" ? "text-right" : ""}`}
            >
              <Link
                className={`inline-flex w-full items-center gap-1 rounded-sm hover:text-[#161616] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0f62fe] ${
                  align === "right" ? "justify-end" : "justify-start"
                }`}
                aria-label={`Sort by ${label} ${nextDirection === "asc" ? "ascending" : "descending"}`}
                href={sortHref(searchParams, key, nextDirection)}
              >
                {label}
                <span
                  aria-hidden="true"
                  className={`text-[10px] leading-none ${active ? "text-[#0f62fe]" : "text-gray-300"}`}
                >
                  {active ? (direction === "asc" ? "↑" : "↓") : "↕"}
                </span>
              </Link>
            </th>
          );
        })}
      </tr>
    </thead>
  );
}
