"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Snapshot = {
  id?: string;
  nightlyRate?: number | null;
  minimumNights?: number | null;
  available?: number;
  notes?: string | null;
};

export default function CompPricingCellEditor({
  competitorId,
  competitorName,
  date,
  initial,
  onClose,
}: {
  competitorId: string;
  competitorName: string;
  date: string;
  initial?: Snapshot;
  onClose: () => void;
}) {
  const router = useRouter();
  const [rate, setRate] = useState(initial?.nightlyRate?.toString() || "");
  const [minNights, setMinNights] = useState(initial?.minimumNights?.toString() || "");
  const [available, setAvailable] = useState(initial?.available !== 0);
  const [notes, setNotes] = useState(initial?.notes || "");
  const [submitting, setSubmitting] = useState(false);

  async function save() {
    setSubmitting(true);
    const body = {
      competitorId,
      date,
      nightlyRate: rate ? parseFloat(rate) : null,
      minimumNights: minNights ? parseInt(minNights, 10) : null,
      available: available ? 1 : 0,
      notes: notes || null,
    };
    await fetch("/api/comps/pricing", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    router.refresh();
    onClose();
  }

  async function remove() {
    if (!initial?.id) return onClose();
    if (!confirm("Delete this snapshot?")) return;
    setSubmitting(true);
    await fetch(`/api/comps/pricing/${initial.id}`, { method: "DELETE" });
    router.refresh();
    onClose();
  }

  return (
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg max-w-md w-full p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div>
          <div className="text-xs text-gray-400 font-mono uppercase">
            {competitorName}
          </div>
          <h3 className="text-sm font-semibold text-[#161616]">{date}</h3>
        </div>

        <div className="grid grid-cols-2 gap-3">
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
              autoFocus
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
        </div>

        <div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={available}
              onChange={(e) => setAvailable(e.target.checked)}
            />
            Available (uncheck if booked/blocked)
          </label>
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1">Notes</label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="input-base"
            placeholder="Optional"
          />
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          {initial?.id ? (
            <button
              type="button"
              onClick={remove}
              disabled={submitting}
              className="text-sm text-red-600 hover:text-red-700"
            >
              Delete
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="text-sm text-gray-600 hover:text-[#161616] px-3 py-2"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={save}
              disabled={submitting}
              className="btn-primary disabled:opacity-50"
            >
              {submitting ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
