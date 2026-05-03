"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { CompetitorRow, CompPricingRow } from "@/lib/queries";

export default function BulkPricingClient({
  competitors,
  recent,
}: {
  competitors: CompetitorRow[];
  recent: CompPricingRow[];
}) {
  const router = useRouter();
  const [competitorId, setCompetitorId] = useState(competitors[0]?.id || "");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [rate, setRate] = useState("");
  const [minNights, setMinNights] = useState("");
  const [available, setAvailable] = useState(true);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!competitorId || !startDate || !endDate) {
      setMsg("Pick a competitor and a date range.");
      return;
    }
    setSubmitting(true);
    setMsg(null);
    const res = await fetch("/api/comps/pricing", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        competitorId,
        startDate,
        endDate,
        nightlyRate: rate ? parseFloat(rate) : null,
        minimumNights: minNights ? parseInt(minNights, 10) : null,
        available: available ? 1 : 0,
        notes: notes || null,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      setMsg(`Saved ${data.count} snapshot${data.count === 1 ? "" : "s"}.`);
      router.refresh();
    } else {
      setMsg("Failed to save.");
    }
    setSubmitting(false);
  }

  async function remove(id: string) {
    if (!confirm("Delete this snapshot?")) return;
    await fetch(`/api/comps/pricing/${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <form
        onSubmit={submit}
        className="data-card rounded-lg p-5 space-y-4"
      >
        <h3 className="text-sm font-semibold text-[#161616]">Bulk pricing entry</h3>
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-3">
            <label className="block text-xs text-gray-500 mb-1">Competitor</label>
            <select
              value={competitorId}
              onChange={(e) => setCompetitorId(e.target.value)}
              className="input-base"
            >
              {competitors.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {!c.active ? "(inactive)" : ""}
                </option>
              ))}
              {competitors.length === 0 && <option value="">No competitors</option>}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Start date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="input-base"
              required
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">End date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="input-base"
              required
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">
              Nightly rate ($)
            </label>
            <input
              type="number"
              step="0.01"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
              className="input-base"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Min nights</label>
            <input
              type="number"
              value={minNights}
              onChange={(e) => setMinNights(e.target.value)}
              className="input-base"
              min={1}
            />
          </div>
          <div className="col-span-2 flex items-end">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={available}
                onChange={(e) => setAvailable(e.target.checked)}
              />
              Available across this range
            </label>
          </div>
          <div className="col-span-3">
            <label className="block text-xs text-gray-500 mb-1">Notes</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="input-base"
            />
          </div>
        </div>
        {msg && (
          <div className="text-xs text-gray-600 bg-gray-50 px-3 py-2 rounded">
            {msg}
          </div>
        )}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={submitting || competitors.length === 0}
            className="btn-primary disabled:opacity-50"
          >
            {submitting ? "Saving…" : "Save snapshots"}
          </button>
        </div>
      </form>

      <div className="data-card rounded-lg overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-[#161616]">Recent snapshots</h3>
          <p className="text-xs text-gray-400 mt-0.5">
            Last {recent.length} entries · click delete to remove
          </p>
        </div>
        {recent.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-gray-400">
            No pricing snapshots yet.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-400 font-mono uppercase bg-gray-50/50">
                <th className="px-5 py-2.5 font-medium">Date</th>
                <th className="px-5 py-2.5 font-medium">Competitor</th>
                <th className="px-5 py-2.5 font-medium text-right">Rate</th>
                <th className="px-5 py-2.5 font-medium">Min</th>
                <th className="px-5 py-2.5 font-medium">Status</th>
                <th className="px-5 py-2.5 font-medium">Notes</th>
                <th className="px-5 py-2.5 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {recent.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50/50">
                  <td className="px-5 py-2.5 font-mono text-xs">{s.date}</td>
                  <td className="px-5 py-2.5">{s.competitorName}</td>
                  <td className="px-5 py-2.5 text-right font-mono">
                    {s.nightlyRate ? `$${Math.round(s.nightlyRate)}` : "—"}
                  </td>
                  <td className="px-5 py-2.5 font-mono text-xs">
                    {s.minimumNights ?? "—"}
                  </td>
                  <td className="px-5 py-2.5">
                    {s.available ? (
                      <span className="text-xs text-emerald-600">Available</span>
                    ) : (
                      <span className="text-xs text-gray-400">Booked</span>
                    )}
                  </td>
                  <td className="px-5 py-2.5 text-xs text-gray-500 truncate max-w-[200px]">
                    {s.notes || "—"}
                  </td>
                  <td className="px-5 py-2.5 text-right">
                    <button
                      onClick={() => remove(s.id)}
                      className="text-xs text-gray-400 hover:text-red-600"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
