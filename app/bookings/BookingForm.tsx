"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

const CHANNELS = ["Direct", "Airbnb", "Luxe", "VRBO", "TripAdvisor", "Booking.com", "StayOne"];
const STATUSES = ["booked", "inquiry", "completed", "cancelled", "refunded", "owner_block", "maintenance_block"];

type Initial = {
  id?: string;
  channel?: string | null;
  status?: string | null;
  guestName?: string | null;
  guestPhone?: string | null;
  guestEmail?: string | null;
  guestLocation?: string | null;
  numAdults?: number | null;
  numChildren?: number | null;
  numPets?: number | null;
  checkIn?: string | null;
  checkOut?: string | null;
  bookingCreatedDate?: string | null;
  grossRevenue?: number | null;
  cleaningFee?: number | null;
  petFee?: number | null;
  platformFees?: number | null;
  taxes?: number | null;
  netPayout?: number | null;
  internalNotes?: string | null;
  guestNotes?: string | null;
  tags?: string | null;
};

export default function BookingForm({ initial }: { initial?: Initial }) {
  const router = useRouter();
  const [form, setForm] = useState({
    channel: initial?.channel || "Direct",
    status: initial?.status || "booked",
    guestName: initial?.guestName || "",
    guestPhone: initial?.guestPhone || "",
    guestEmail: initial?.guestEmail || "",
    guestLocation: initial?.guestLocation || "",
    numAdults: initial?.numAdults?.toString() || "2",
    numChildren: initial?.numChildren?.toString() || "0",
    numPets: initial?.numPets?.toString() || "0",
    checkIn: initial?.checkIn || "",
    checkOut: initial?.checkOut || "",
    bookingCreatedDate:
      initial?.bookingCreatedDate || new Date().toISOString().slice(0, 10),
    grossRevenue: initial?.grossRevenue?.toString() || "",
    cleaningFee: initial?.cleaningFee?.toString() || "650",
    petFee: initial?.petFee?.toString() || "0",
    platformFees: initial?.platformFees?.toString() || "0",
    taxes: initial?.taxes?.toString() || "0",
    netPayout: initial?.netPayout?.toString() || "",
    internalNotes: initial?.internalNotes || "",
    guestNotes: initial?.guestNotes || "",
    tags: initial?.tags || "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const nights = useMemo(() => {
    if (!form.checkIn || !form.checkOut) return 0;
    const a = new Date(form.checkIn);
    const b = new Date(form.checkOut);
    return Math.max(0, Math.round((b.getTime() - a.getTime()) / 86400000));
  }, [form.checkIn, form.checkOut]);

  const adr = useMemo(() => {
    const gross = parseFloat(form.grossRevenue || "0");
    if (!gross || nights <= 0) return 0;
    return gross / nights;
  }, [form.grossRevenue, nights]);

  function set<K extends keyof typeof form>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setErr(null);
    const body = {
      ...form,
      numAdults: parseInt(form.numAdults || "0"),
      numChildren: parseInt(form.numChildren || "0"),
      numPets: parseInt(form.numPets || "0"),
      grossRevenue: parseFloat(form.grossRevenue || "0"),
      cleaningFee: parseFloat(form.cleaningFee || "0"),
      petFee: parseFloat(form.petFee || "0"),
      platformFees: parseFloat(form.platformFees || "0"),
      taxes: parseFloat(form.taxes || "0"),
      netPayout: parseFloat(form.netPayout || "0") || parseFloat(form.grossRevenue || "0") * 0.85,
      nights,
      avgNightlyRate: adr,
    };
    try {
      const url = initial?.id ? `/api/bookings/${initial.id}` : "/api/bookings";
      const res = await fetch(url, {
        method: initial?.id ? "PUT" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed to save");
      const data = await res.json();
      router.push(`/bookings/${data.id || initial?.id}`);
      router.refresh();
    } catch (e: any) {
      setErr(e.message);
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="data-card rounded-lg p-6 space-y-6">
      <Section title="Channel & Status">
        <Field label="Channel">
          <select
            value={form.channel}
            onChange={(e) => set("channel", e.target.value)}
            className="input-base"
          >
            {CHANNELS.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </Field>
        <Field label="Status">
          <select
            value={form.status}
            onChange={(e) => set("status", e.target.value)}
            className="input-base"
          >
            {STATUSES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </Field>
        <Field label="Booking date">
          <input
            type="date"
            value={form.bookingCreatedDate}
            onChange={(e) => set("bookingCreatedDate", e.target.value)}
            className="input-base"
          />
        </Field>
      </Section>

      <Section title="Guest">
        <Field label="Name">
          <input
            type="text"
            value={form.guestName}
            onChange={(e) => set("guestName", e.target.value)}
            className="input-base"
            required
          />
        </Field>
        <Field label="Phone">
          <input
            type="text"
            value={form.guestPhone}
            onChange={(e) => set("guestPhone", e.target.value)}
            className="input-base"
          />
        </Field>
        <Field label="Email">
          <input
            type="email"
            value={form.guestEmail}
            onChange={(e) => set("guestEmail", e.target.value)}
            className="input-base"
          />
        </Field>
        <Field label="Location">
          <input
            type="text"
            value={form.guestLocation}
            onChange={(e) => set("guestLocation", e.target.value)}
            placeholder="City, State"
            className="input-base"
          />
        </Field>
        <Field label="Adults">
          <input
            type="number"
            value={form.numAdults}
            onChange={(e) => set("numAdults", e.target.value)}
            className="input-base"
            min={0}
          />
        </Field>
        <Field label="Children">
          <input
            type="number"
            value={form.numChildren}
            onChange={(e) => set("numChildren", e.target.value)}
            className="input-base"
            min={0}
          />
        </Field>
        <Field label="Pets">
          <input
            type="number"
            value={form.numPets}
            onChange={(e) => set("numPets", e.target.value)}
            className="input-base"
            min={0}
          />
        </Field>
      </Section>

      <Section title="Stay">
        <Field label="Check-in">
          <input
            type="date"
            value={form.checkIn}
            onChange={(e) => set("checkIn", e.target.value)}
            className="input-base"
            required
          />
        </Field>
        <Field label="Check-out">
          <input
            type="date"
            value={form.checkOut}
            onChange={(e) => set("checkOut", e.target.value)}
            className="input-base"
            required
          />
        </Field>
        <Field label="Nights">
          <input
            type="number"
            value={nights}
            disabled
            className="input-base bg-gray-50"
          />
        </Field>
      </Section>

      <Section title="Revenue">
        <Field label="Gross revenue">
          <input
            type="number"
            step="0.01"
            value={form.grossRevenue}
            onChange={(e) => set("grossRevenue", e.target.value)}
            className="input-base"
          />
        </Field>
        <Field label="Cleaning fee">
          <input
            type="number"
            step="0.01"
            value={form.cleaningFee}
            onChange={(e) => set("cleaningFee", e.target.value)}
            className="input-base"
          />
        </Field>
        <Field label="Pet fee">
          <input
            type="number"
            step="0.01"
            value={form.petFee}
            onChange={(e) => set("petFee", e.target.value)}
            className="input-base"
          />
        </Field>
        <Field label="Platform fees">
          <input
            type="number"
            step="0.01"
            value={form.platformFees}
            onChange={(e) => set("platformFees", e.target.value)}
            className="input-base"
          />
        </Field>
        <Field label="Taxes">
          <input
            type="number"
            step="0.01"
            value={form.taxes}
            onChange={(e) => set("taxes", e.target.value)}
            className="input-base"
          />
        </Field>
        <Field label="Net payout">
          <input
            type="number"
            step="0.01"
            value={form.netPayout}
            onChange={(e) => set("netPayout", e.target.value)}
            placeholder="Auto: 85% of gross"
            className="input-base"
          />
        </Field>
        <Field label="ADR (computed)">
          <input
            type="text"
            value={adr ? `$${adr.toFixed(2)}` : "—"}
            disabled
            className="input-base bg-gray-50"
          />
        </Field>
      </Section>

      <Section title="Notes">
        <Field label="Internal notes" full>
          <textarea
            value={form.internalNotes}
            onChange={(e) => set("internalNotes", e.target.value)}
            className="input-base min-h-[80px]"
          />
        </Field>
        <Field label="Guest-facing notes" full>
          <textarea
            value={form.guestNotes}
            onChange={(e) => set("guestNotes", e.target.value)}
            className="input-base min-h-[60px]"
          />
        </Field>
        <Field label="Tags (comma separated)" full>
          <input
            type="text"
            value={form.tags}
            onChange={(e) => set("tags", e.target.value)}
            placeholder="VIP, repeat, anniversary"
            className="input-base"
          />
        </Field>
      </Section>

      {err && <div className="text-sm text-red-600">{err}</div>}

      <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
        <button
          type="button"
          onClick={() => router.back()}
          className="text-sm text-gray-600 hover:text-[#161616] px-4 py-2"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="bg-[#0f62fe] hover:bg-[#0353e9] text-white text-sm font-medium px-4 py-2 rounded-md transition-colors disabled:opacity-50"
        >
          {submitting ? "Saving…" : initial?.id ? "Save changes" : "Create booking"}
        </button>
      </div>
    </form>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xs uppercase font-mono text-gray-400 mb-3 tracking-wider">{title}</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">{children}</div>
    </div>
  );
}

function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <div className={full ? "md:col-span-3" : ""}>
      <label className="block text-xs text-gray-500 mb-1">{label}</label>
      {children}
    </div>
  );
}
