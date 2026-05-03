"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const TYPES = [
  "market",
  "pricing",
  "guest",
  "property",
  "channel",
  "strategy",
  "experiment",
  "note",
];

type Initial = {
  id?: string;
  type?: string | null;
  title?: string | null;
  content?: string | null;
  tags?: string | null;
  relatedBookingId?: string | null;
  relatedGuestId?: string | null;
};

export default function KnowledgeForm({
  initial,
  onClose,
}: {
  initial?: Initial;
  onClose?: () => void;
}) {
  const router = useRouter();
  const initialTags = (() => {
    if (!initial?.tags) return "";
    try {
      const parsed = JSON.parse(initial.tags);
      if (Array.isArray(parsed)) return parsed.join(", ");
    } catch {}
    return initial.tags || "";
  })();
  const [form, setForm] = useState({
    type: initial?.type || "note",
    title: initial?.title || "",
    content: initial?.content || "",
    tags: initialTags,
    relatedBookingId: initial?.relatedBookingId || "",
    relatedGuestId: initial?.relatedGuestId || "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function set<K extends keyof typeof form>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setErr(null);
    const tags = form.tags
      ? form.tags.split(",").map((s) => s.trim()).filter(Boolean)
      : [];
    const body = {
      type: form.type,
      title: form.title || null,
      content: form.content,
      tags,
      relatedBookingId: form.relatedBookingId || null,
      relatedGuestId: form.relatedGuestId || null,
      source: "manual",
    };
    try {
      const url = initial?.id ? `/api/knowledge/${initial.id}` : "/api/knowledge";
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
        <div>
          <label className="block text-xs text-gray-500 mb-1">Type</label>
          <select
            value={form.type}
            onChange={(e) => set("type", e.target.value)}
            className="input-base"
          >
            {TYPES.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">
            Title (optional)
          </label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => set("title", e.target.value)}
            className="input-base"
          />
        </div>
        <div className="col-span-2">
          <label className="block text-xs text-gray-500 mb-1">Content</label>
          <textarea
            value={form.content}
            onChange={(e) => set("content", e.target.value)}
            className="input-base min-h-[140px]"
            required
            autoFocus
          />
        </div>
        <div className="col-span-2">
          <label className="block text-xs text-gray-500 mb-1">
            Tags (comma separated)
          </label>
          <input
            type="text"
            value={form.tags}
            onChange={(e) => set("tags", e.target.value)}
            placeholder="summer, pricing, weekday"
            className="input-base"
          />
        </div>
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
          {submitting ? "Saving…" : initial?.id ? "Save changes" : "Add entry"}
        </button>
      </div>
    </form>
  );
}
