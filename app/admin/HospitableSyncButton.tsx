"use client";

import { useState } from "react";

type SyncResult = {
  fetched: number;
  created: number;
  updated: number;
  skipped: number;
  errors: string[];
  from: string;
  to: string;
  batchId: string;
};

export default function HospitableSyncButton() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SyncResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function sync() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/hospitable/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Hospitable sync failed");
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Hospitable sync failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="data-card rounded-lg p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-[#161616]">Hospitable Sync</h3>
          <p className="mt-1 text-xs text-gray-500">
            Pull reservations from Hospitable into bookings, calendar, dashboard, and CRM.
          </p>
        </div>
        <button
          type="button"
          onClick={sync}
          disabled={loading}
          className="rounded-md bg-[#0f62fe] px-3 py-2 text-xs font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Syncing…" : "Sync reservations from Hospitable"}
        </button>
      </div>

      {result && (
        <div className="mt-4 grid grid-cols-5 gap-3 text-xs">
          {[
            ["Fetched", result.fetched],
            ["Created", result.created],
            ["Updated", result.updated],
            ["Skipped", result.skipped],
            ["Errors", result.errors.length],
          ].map(([label, value]) => (
            <div key={label} className="rounded-md border border-gray-100 bg-gray-50 px-3 py-2">
              <div className="text-[10px] uppercase tracking-wide text-gray-400">{label}</div>
              <div className="mt-1 font-mono text-lg font-semibold text-[#161616]">{value}</div>
            </div>
          ))}
          <div className="col-span-5 text-[11px] text-gray-500">
            Synced {result.from} → {result.to}. Batch {result.batchId.slice(0, 8)}.
          </div>
        </div>
      )}

      {error && <div className="mt-4 rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>}
    </div>
  );
}
