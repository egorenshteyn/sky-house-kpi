"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function BookingDeleteButton({
  id,
  guestName,
}: {
  id: string;
  guestName?: string | null;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function onDelete() {
    const label = guestName ? `the booking for ${guestName}` : "this booking";
    if (!confirm(`Delete ${label}? This cannot be undone.`)) return;
    setPending(true);
    try {
      const res = await fetch(`/api/bookings/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete booking");
      router.push("/bookings");
      router.refresh();
    } catch (e) {
      alert((e as Error).message);
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      onClick={onDelete}
      disabled={pending}
      className="text-sm px-3 py-1.5 rounded border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50"
    >
      {pending ? "Deleting…" : "Delete booking"}
    </button>
  );
}
