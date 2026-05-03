"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const PLATFORMS = ["Airbnb", "VRBO", "Booking.com", "Direct", "Other"];
const PROPERTY_TYPES = ["house", "condo", "cabin", "apartment", "villa", "cottage", "other"];

type Initial = {
  id?: string;
  name?: string | null;
  platform?: string | null;
  listingUrl?: string | null;
  location?: string | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  maxGuests?: number | null;
  propertyType?: string | null;
  amenities?: string | null;
  avgRating?: number | null;
  reviewCount?: number | null;
  active?: number | null;
  notes?: string | null;
};

export default function CompetitorForm({
  initial,
  onClose,
}: {
  initial?: Initial;
  onClose?: () => void;
}) {
  const router = useRouter();
  const initialAmenities = (() => {
    if (!initial?.amenities) return "";
    try {
      const parsed = JSON.parse(initial.amenities);
      if (Array.isArray(parsed)) return parsed.join(", ");
    } catch {}
    return initial.amenities || "";
  })();
  const [form, setForm] = useState({
    name: initial?.name || "",
    platform: initial?.platform || "Airbnb",
    listingUrl: initial?.listingUrl || "",
    location: initial?.location || "Dillon Beach, CA",
    bedrooms: initial?.bedrooms?.toString() || "",
    bathrooms: initial?.bathrooms?.toString() || "",
    maxGuests: initial?.maxGuests?.toString() || "",
    propertyType: initial?.propertyType || "house",
    amenities: initialAmenities,
    avgRating: initial?.avgRating?.toString() || "",
    reviewCount: initial?.reviewCount?.toString() || "",
    active: initial?.active === 0 ? 0 : 1,
    notes: initial?.notes || "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function set<K extends keyof typeof form>(k: K, v: typeof form[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setErr(null);
    const amenities = form.amenities
      ? form.amenities.split(",").map((s) => s.trim()).filter(Boolean)
      : [];
    const body = {
      name: form.name,
      platform: form.platform,
      listingUrl: form.listingUrl,
      location: form.location || null,
      bedrooms: form.bedrooms ? parseInt(form.bedrooms, 10) : null,
      bathrooms: form.bathrooms ? parseFloat(form.bathrooms) : null,
      maxGuests: form.maxGuests ? parseInt(form.maxGuests, 10) : null,
      propertyType: form.propertyType,
      amenities,
      avgRating: form.avgRating ? parseFloat(form.avgRating) : null,
      reviewCount: form.reviewCount ? parseInt(form.reviewCount, 10) : null,
      active: form.active,
      notes: form.notes || null,
    };
    try {
      const url = initial?.id ? `/api/comps/${initial.id}` : "/api/comps";
      const res = await fetch(url, {
        method: initial?.id ? "PUT" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed to save");
      router.refresh();
      onClose?.();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Name" full>
          <input
            type="text"
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            className="input-base"
            required
          />
        </Field>
        <Field label="Platform">
          <select
            value={form.platform}
            onChange={(e) => set("platform", e.target.value)}
            className="input-base"
          >
            {PLATFORMS.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </Field>
        <Field label="Property type">
          <select
            value={form.propertyType}
            onChange={(e) => set("propertyType", e.target.value)}
            className="input-base"
          >
            {PROPERTY_TYPES.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </Field>
        <Field label="Listing URL" full>
          <input
            type="url"
            value={form.listingUrl}
            onChange={(e) => set("listingUrl", e.target.value)}
            className="input-base"
            required
            placeholder="https://..."
          />
        </Field>
        <Field label="Location" full>
          <input
            type="text"
            value={form.location}
            onChange={(e) => set("location", e.target.value)}
            className="input-base"
          />
        </Field>
        <Field label="Bedrooms">
          <input
            type="number"
            value={form.bedrooms}
            onChange={(e) => set("bedrooms", e.target.value)}
            className="input-base"
            min={0}
          />
        </Field>
        <Field label="Bathrooms">
          <input
            type="number"
            step="0.5"
            value={form.bathrooms}
            onChange={(e) => set("bathrooms", e.target.value)}
            className="input-base"
            min={0}
          />
        </Field>
        <Field label="Max guests">
          <input
            type="number"
            value={form.maxGuests}
            onChange={(e) => set("maxGuests", e.target.value)}
            className="input-base"
            min={1}
          />
        </Field>
        <Field label="Avg rating">
          <input
            type="number"
            step="0.01"
            value={form.avgRating}
            onChange={(e) => set("avgRating", e.target.value)}
            className="input-base"
            min={0}
            max={5}
          />
        </Field>
        <Field label="Review count">
          <input
            type="number"
            value={form.reviewCount}
            onChange={(e) => set("reviewCount", e.target.value)}
            className="input-base"
            min={0}
          />
        </Field>
        <Field label="Active">
          <select
            value={form.active}
            onChange={(e) => set("active", parseInt(e.target.value, 10) as 0 | 1)}
            className="input-base"
          >
            <option value={1}>Active</option>
            <option value={0}>Inactive</option>
          </select>
        </Field>
        <Field label="Amenities (comma separated)" full>
          <input
            type="text"
            value={form.amenities}
            onChange={(e) => set("amenities", e.target.value)}
            placeholder="hot tub, pool, ocean view, pet friendly"
            className="input-base"
          />
        </Field>
        <Field label="Notes" full>
          <textarea
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
            className="input-base min-h-[60px]"
          />
        </Field>
      </div>
      {err && <div className="text-sm text-red-600">{err}</div>}
      <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-gray-600 hover:text-[#161616] px-4 py-2"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={submitting}
          className="btn-primary disabled:opacity-50"
        >
          {submitting ? "Saving…" : initial?.id ? "Save changes" : "Add competitor"}
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  children,
  full,
}: {
  label: string;
  children: React.ReactNode;
  full?: boolean;
}) {
  return (
    <div className={full ? "col-span-2" : ""}>
      <label className="block text-xs text-gray-500 mb-1">{label}</label>
      {children}
    </div>
  );
}
