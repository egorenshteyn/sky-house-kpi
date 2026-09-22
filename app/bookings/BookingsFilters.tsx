"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

const CHANNELS = ["", "Direct", "Airbnb", "Luxe", "VRBO", "TripAdvisor", "Booking.com", "StayOne"];
const STATUSES = ["", "booked", "completed", "cancelled", "inquiry", "owner_block"];

export default function BookingsFilters({
  initial,
}: {
  initial: { q: string; channel: string; status: string };
}) {
  const router = useRouter();
  const sp = useSearchParams();
  const [q, setQ] = useState(initial.q);

  useEffect(() => { setQ(initial.q); }, [initial.q]);

  function update(name: string, value: string) {
    const params = new URLSearchParams(sp.toString());
    if (value) params.set(name, value);
    else params.delete(name);
    router.push(`/bookings?${params.toString()}`);
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        update("q", q);
      }}
      className="data-card rounded-lg p-4 flex flex-wrap items-center gap-3"
    >
      <input
        type="search"
        aria-label="Search bookings"
        placeholder="Search guest, phone, or email…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        className="input-base w-full sm:max-w-xs"
      />
      <select
        aria-label="Filter by channel"
        value={initial.channel}
        onChange={(e) => update("channel", e.target.value)}
        className="text-sm border border-gray-200 rounded-md px-3 py-2 text-gray-600 bg-white"
      >
        {CHANNELS.map((c) => (
          <option key={c} value={c}>
            {c || "All channels"}
          </option>
        ))}
      </select>
      <select
        aria-label="Filter by status"
        value={initial.status}
        onChange={(e) => update("status", e.target.value)}
        className="text-sm border border-gray-200 rounded-md px-3 py-2 text-gray-600 bg-white"
      >
        {STATUSES.map((s) => (
          <option key={s} value={s}>
            {s || "All statuses"}
          </option>
        ))}
      </select>
      <select aria-label="Sort bookings" value={sp.get("sort") || "checkIn"} onChange={(e) => update("sort", e.target.value)} className="input-base sm:!w-auto lg:hidden">
        <option value="guest">Guest name</option><option value="channel">Channel</option><option value="status">Status</option><option value="bookingDate">Booking date</option><option value="checkIn">Check-in</option><option value="checkOut">Check-out</option><option value="nights">Nights</option><option value="revenue">Revenue</option><option value="adr">Nightly rate</option>
      </select>
      <select aria-label="Sort direction" value={sp.get("direction") || "desc"} onChange={(e) => update("direction", e.target.value)} className="input-base sm:!w-auto lg:hidden"><option value="asc">Ascending</option><option value="desc">Descending</option></select>
      {(initial.q || initial.channel || initial.status) && <button type="button" className="text-sm text-[#0f62fe]" onClick={() => { setQ(""); router.push("/bookings"); }}>Clear filters</button>}
      <button type="submit" className="text-sm bg-[#161616] text-white px-4 py-2 rounded-md">
        Search
      </button>
    </form>
  );
}
