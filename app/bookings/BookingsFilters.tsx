"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

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
        type="text"
        placeholder="Search guest, phone, or email…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        className="input-base !w-72"
      />
      <select
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
      <button type="submit" className="text-sm bg-[#161616] text-white px-4 py-2 rounded-md">
        Search
      </button>
    </form>
  );
}
