"use client";

import Modal from "@/components/Modal";

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
  const [error, setError] = useState<string | null>(null);
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
    setError(null);
    try {
    const res = await fetch("/api/comps/pricing", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error("Could not save snapshot. Please try again.");
    router.refresh();
    onClose();
    } catch { setError("Could not save snapshot. Please try again."); }
    finally { setSubmitting(false); }
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
    <Modal label={`Pricing for ${competitorName} on ${date}`} onClose={onClose}>
      <div className="space-y-4 pt-5">
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        <div>
          <div className="text-xs text-gray-400 font-mono uppercase">
            {competitorName}
          </div>
          <h3 className="text-sm font-semibold text-[#161616]">{date}</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor="comppricingcelleditor-field-1" className="block text-xs text-gray-500 mb-1">
              Nightly rate ($)
            </label>
            <input id="comppricingcelleditor-field-1"
              type="number"
              step="0.01"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
              className="input-base"
              />
          </div>
          <div>
            <label htmlFor="comppricingcelleditor-field-2" className="block text-xs text-gray-500 mb-1">Min nights</label>
            <input id="comppricingcelleditor-field-2"
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
          <label htmlFor="comppricingcelleditor-field-3" className="block text-xs text-gray-500 mb-1">Notes</label>
          <input id="comppricingcelleditor-field-3"
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
    </Modal>
  );
}
