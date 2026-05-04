"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ChannelRow } from "@/lib/queries";

export default function ChannelManager({
  channels,
}: {
  channels: ChannelRow[];
}) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<ChannelRow | null>(null);

  async function toggleActive(c: ChannelRow) {
    await fetch(`/api/channels/${c.id}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...c, active: c.active ? 0 : 1 }),
    });
    router.refresh();
  }

  async function remove(c: ChannelRow) {
    if (
      !confirm(
        `Delete channel "${c.name}"? Bookings already attached will not be removed but the channel listing will be lost.`,
      )
    )
      return;
    await fetch(`/api/channels/${c.id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <>
      <div className="data-card rounded-lg overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-[#161616]">Manage channels</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Add, edit, deactivate, or remove listing platforms.
            </p>
          </div>
          <button
            onClick={() => {
              setEditing(null);
              setShowForm(true);
            }}
            className="btn-primary inline-flex items-center gap-1.5"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Add channel
          </button>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-gray-400 font-mono uppercase bg-gray-50/50">
              <th className="px-5 py-2.5 font-medium">Name</th>
              <th className="px-5 py-2.5 font-medium">Listing URL</th>
              <th className="px-5 py-2.5 font-medium">Admin URL</th>
              <th className="px-5 py-2.5 font-medium text-right">Commission</th>
              <th className="px-5 py-2.5 font-medium">Status</th>
              <th className="px-5 py-2.5 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {channels.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center text-gray-400">
                  No channels yet.
                </td>
              </tr>
            ) : (
              channels.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50/50">
                  <td className="px-5 py-3 font-medium">{c.name}</td>
                  <td className="px-5 py-3 text-xs">
                    {c.listingUrl ? (
                      <a
                        href={c.listingUrl.startsWith("http") ? c.listingUrl : `https://${c.listingUrl}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#0f62fe] hover:underline truncate inline-block max-w-xs"
                      >
                        {c.listingUrl}
                      </a>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-xs">
                    {c.adminUrl ? (
                      <a
                        href={c.adminUrl.startsWith("http") ? c.adminUrl : `https://${c.adminUrl}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#0f62fe] hover:underline truncate inline-block max-w-xs"
                      >
                        {c.adminUrl}
                      </a>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-right font-mono text-xs">
                    {c.commissionRate !== null
                      ? `${(c.commissionRate * 100).toFixed(1)}%`
                      : "—"}
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={`text-xs ${c.active ? "text-emerald-600" : "text-gray-400"}`}
                    >
                      {c.active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <div className="inline-flex items-center gap-3 text-xs">
                      <button
                        onClick={() => toggleActive(c)}
                        className="text-gray-400 hover:text-[#161616]"
                      >
                        {c.active ? "Deactivate" : "Activate"}
                      </button>
                      <button
                        onClick={() => {
                          setEditing(c);
                          setShowForm(true);
                        }}
                        className="text-gray-400 hover:text-[#0f62fe]"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => remove(c)}
                        className="text-gray-400 hover:text-red-600"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showForm && (
        <Modal onClose={() => setShowForm(false)}>
          <h3 className="text-sm font-semibold text-[#161616] mb-4">
            {editing ? "Edit channel" : "Add channel"}
          </h3>
          <ChannelForm
            initial={editing || undefined}
            onClose={() => setShowForm(false)}
          />
        </Modal>
      )}
    </>
  );
}

function ChannelForm({
  initial,
  onClose,
}: {
  initial?: ChannelRow;
  onClose: () => void;
}) {
  const router = useRouter();
  const [form, setForm] = useState({
    name: initial?.name || "",
    listingUrl: initial?.listingUrl || "",
    adminUrl: initial?.adminUrl || "",
    commissionRate:
      initial?.commissionRate !== null && initial?.commissionRate !== undefined
        ? (initial.commissionRate * 100).toString()
        : "",
    active: initial?.active === 0 ? 0 : 1,
    notes: initial?.notes || "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setErr(null);
    const body = {
      name: form.name,
      listingUrl: form.listingUrl || null,
      adminUrl: form.adminUrl || null,
      commissionRate: form.commissionRate
        ? parseFloat(form.commissionRate) / 100
        : null,
      active: form.active,
      notes: form.notes || null,
    };
    try {
      const url = initial?.id ? `/api/channels/${initial.id}` : "/api/channels";
      const res = await fetch(url, {
        method: initial?.id ? "PUT" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed to save");
      router.refresh();
      onClose();
    } catch (e) {
      setErr((e as Error).message);
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
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className="input-base"
            required
          />
        </Field>
        <Field label="Listing URL" full>
          <input
            type="url"
            value={form.listingUrl}
            onChange={(e) =>
              setForm((f) => ({ ...f, listingUrl: e.target.value }))
            }
            className="input-base"
            placeholder="https://..."
          />
        </Field>
        <Field label="Admin URL" full>
          <input
            type="url"
            value={form.adminUrl}
            onChange={(e) =>
              setForm((f) => ({ ...f, adminUrl: e.target.value }))
            }
            className="input-base"
            placeholder="https://..."
          />
        </Field>
        <Field label="Commission rate (%)">
          <input
            type="number"
            step="0.1"
            min={0}
            max={100}
            value={form.commissionRate}
            onChange={(e) =>
              setForm((f) => ({ ...f, commissionRate: e.target.value }))
            }
            className="input-base font-mono"
            placeholder="3.0"
          />
        </Field>
        <Field label="Status">
          <select
            value={form.active}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                active: parseInt(e.target.value, 10) as 0 | 1,
              }))
            }
            className="input-base"
          >
            <option value={1}>Active</option>
            <option value={0}>Inactive</option>
          </select>
        </Field>
        <Field label="Notes" full>
          <textarea
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            className="input-base min-h-[60px]"
          />
        </Field>
      </div>
      {err && <div className="text-sm text-red-600">{err}</div>}
      <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
        <button
          type="button"
          onClick={onClose}
          className="text-sm text-gray-600 hover:text-[#161616] px-4 py-2"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="btn-primary disabled:opacity-50"
        >
          {submitting ? "Saving…" : initial?.id ? "Save changes" : "Add channel"}
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

function Modal({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
