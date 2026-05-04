"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { PERIODS, type Period, type RevenueBasis } from "@/lib/dashboard";

export default function DashboardControls({
  period,
  basis,
}: {
  period: Period;
  basis: RevenueBasis;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  function nav(updates: Record<string, string>) {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(updates)) {
      if (!v) next.delete(k);
      else next.set(k, v);
    }
    const qs = next.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  return (
    <>
      <div className="flex border border-gray-200 rounded-md overflow-hidden text-sm">
        {PERIODS.map((p) => {
          const active = p === period;
          return (
            <button
              key={p}
              type="button"
              onClick={() => nav({ period: p === "YTD" ? "" : p })}
              className={
                active
                  ? "px-3 py-1.5 bg-[#161616] text-white font-medium"
                  : "px-3 py-1.5 text-gray-500 hover:bg-gray-50"
              }
              aria-pressed={active}
            >
              {p}
            </button>
          );
        })}
      </div>
      <select
        value={basis}
        onChange={(e) => nav({ basis: e.target.value === "stay" ? "" : e.target.value })}
        className="text-sm border border-gray-200 rounded-md px-3 py-1.5 text-gray-600 bg-white"
        aria-label="Revenue basis"
      >
        <option value="stay">Stay-date revenue</option>
        <option value="booking">Booking-date revenue</option>
        <option value="payout">Payout-date revenue</option>
      </select>
    </>
  );
}
