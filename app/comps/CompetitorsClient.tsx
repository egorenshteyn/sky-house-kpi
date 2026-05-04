"use client";

import { useEffect, useMemo, useState } from "react";
import CompetitorForm from "./CompetitorForm";
import type { CompetitorRow } from "@/lib/queries";

const STORAGE_KEY = "sh.comps.overlay.v1";

type Overlay = {
  deleted: string[];
  edits: Record<string, CompetitorRow>;
  added: CompetitorRow[];
};

const EMPTY_OVERLAY: Overlay = { deleted: [], edits: {}, added: [] };

function loadOverlay(): Overlay {
  if (typeof window === "undefined") return EMPTY_OVERLAY;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY_OVERLAY;
    const parsed = JSON.parse(raw);
    return {
      deleted: Array.isArray(parsed?.deleted) ? parsed.deleted : [],
      edits:
        parsed?.edits && typeof parsed.edits === "object" && !Array.isArray(parsed.edits)
          ? parsed.edits
          : {},
      added: Array.isArray(parsed?.added) ? parsed.added : [],
    };
  } catch {
    return EMPTY_OVERLAY;
  }
}

export default function CompetitorsClient({
  competitors,
}: {
  competitors: CompetitorRow[];
}) {
  const [overlay, setOverlay] = useState<Overlay>(EMPTY_OVERLAY);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<CompetitorRow | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setOverlay(loadOverlay());
  }, []);

  const effective = useMemo(() => {
    const deleted = new Set(overlay.deleted);
    const map = new Map<string, CompetitorRow>();
    for (const c of competitors) {
      if (deleted.has(c.id)) continue;
      const edited = overlay.edits[c.id];
      map.set(c.id, edited ? { ...c, ...edited, id: c.id } : c);
    }
    for (const c of overlay.added) {
      if (deleted.has(c.id)) continue;
      const edited = overlay.edits[c.id];
      map.set(c.id, edited ? { ...c, ...edited, id: c.id } : c);
    }
    return Array.from(map.values()).sort((a, b) => {
      const aActive = a.active ? 1 : 0;
      const bActive = b.active ? 1 : 0;
      if (bActive !== aActive) return bActive - aActive;
      return (a.name || "").localeCompare(b.name || "");
    });
  }, [competitors, overlay]);

  function persistOverlay(next: Overlay) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch (e: any) {
      throw new Error(
        "Could not save changes locally: " + (e?.message || "storage unavailable"),
      );
    }
    setOverlay(next);
    setError(null);
  }

  function applyAdd(record: CompetitorRow) {
    const next: Overlay = {
      ...overlay,
      added: [...overlay.added.filter((a) => a.id !== record.id), record],
      deleted: overlay.deleted.filter((id) => id !== record.id),
    };
    persistOverlay(next);
  }

  function applyEdit(record: CompetitorRow) {
    const isAdded = overlay.added.some((a) => a.id === record.id);
    const next: Overlay = isAdded
      ? {
          ...overlay,
          added: overlay.added.map((a) => (a.id === record.id ? record : a)),
        }
      : {
          ...overlay,
          edits: { ...overlay.edits, [record.id]: record },
        };
    persistOverlay(next);
  }

  function applyDelete(id: string) {
    const isAdded = overlay.added.some((a) => a.id === id);
    const newEdits = { ...overlay.edits };
    delete newEdits[id];
    const next: Overlay = isAdded
      ? {
          ...overlay,
          added: overlay.added.filter((a) => a.id !== id),
          edits: newEdits,
        }
      : {
          ...overlay,
          deleted: overlay.deleted.includes(id)
            ? overlay.deleted
            : [...overlay.deleted, id],
          edits: newEdits,
        };
    persistOverlay(next);
  }

  function toggleActive(c: CompetitorRow) {
    const updated: CompetitorRow = {
      ...c,
      active: c.active ? 0 : 1,
      updatedAt: new Date().toISOString(),
    };
    try {
      applyEdit(updated);
    } catch (e: any) {
      setError(e?.message || "Could not save changes locally");
      return;
    }
    fetch(`/api/comps/${c.id}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ...updated,
        amenities: updated.amenities,
      }),
    }).catch(() => {});
  }

  function remove(c: CompetitorRow) {
    if (
      !confirm(
        `Delete competitor "${c.name}"? This will also delete all their pricing snapshots.`,
      )
    )
      return;
    try {
      applyDelete(c.id);
    } catch (e: any) {
      setError(e?.message || "Could not save changes locally");
      return;
    }
    fetch(`/api/comps/${c.id}`, { method: "DELETE" }).catch(() => {});
  }

  function handleSave(record: CompetitorRow) {
    if (editing) applyEdit(record);
    else applyAdd(record);
  }

  return (
    <>
      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 flex items-start justify-between gap-3">
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            className="text-red-500 hover:text-red-700 text-xs"
          >
            Dismiss
          </button>
        </div>
      )}
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm text-gray-500">
          {effective.length} competitor{effective.length === 1 ? "" : "s"} ·{" "}
          {effective.filter((c) => c.active).length} active
        </div>
        <button
          onClick={() => {
            setEditing(null);
            setShowForm(true);
          }}
          className="btn-primary inline-flex items-center gap-1.5"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Competitor
        </button>
      </div>

      {effective.length === 0 ? (
        <div className="data-card rounded-lg p-10 text-center">
          <div className="text-sm text-gray-400 mb-3">No competitors tracked yet.</div>
          <button
            onClick={() => {
              setEditing(null);
              setShowForm(true);
            }}
            className="btn-primary"
          >
            Add your first competitor
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {effective.map((c) => {
            const amenities = (() => {
              if (!c.amenities) return [] as string[];
              try {
                const parsed = JSON.parse(c.amenities);
                if (Array.isArray(parsed)) return parsed as string[];
              } catch {}
              return c.amenities.split(",").map((s) => s.trim()).filter(Boolean);
            })();
            return (
              <div key={c.id} className="data-card rounded-lg overflow-hidden flex flex-col">
                <CompPhoto imageUrl={c.imageUrl} name={c.name} />
                <div className="p-5 space-y-3 flex-1 flex flex-col">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-sm font-semibold text-[#161616] truncate">
                        {c.name}
                      </h3>
                      {!c.active && (
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 uppercase font-mono">
                          Inactive
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-400 font-mono">
                      {c.platform || "—"} · {c.location || "—"}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs">
                  <Stat label="BR" value={c.bedrooms?.toString() || "—"} />
                  <Stat label="BA" value={c.bathrooms?.toString() || "—"} />
                  <Stat label="Sleeps" value={c.maxGuests?.toString() || "—"} />
                </div>

                {(c.avgRating !== null || c.reviewCount !== null) && (
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    {c.avgRating !== null && (
                      <span className="font-mono">
                        ★ {c.avgRating?.toFixed(2)}
                      </span>
                    )}
                    {c.reviewCount !== null && (
                      <span className="font-mono text-gray-400">
                        {c.reviewCount} reviews
                      </span>
                    )}
                  </div>
                )}

                {amenities.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {amenities.slice(0, 4).map((a, i) => (
                      <span
                        key={i}
                        className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600"
                      >
                        {a}
                      </span>
                    ))}
                    {amenities.length > 4 && (
                      <span className="text-[10px] text-gray-400">
                        +{amenities.length - 4}
                      </span>
                    )}
                  </div>
                )}

                <div className="mt-auto flex items-center justify-between pt-3 border-t border-gray-100">
                  <a
                    href={c.listingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-[#0f62fe] hover:text-[#0353e9]"
                  >
                    View listing →
                  </a>
                  <div className="flex items-center gap-2 text-xs">
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
                </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showForm && (
        <Modal onClose={() => setShowForm(false)}>
          <h3 className="text-sm font-semibold text-[#161616] mb-4">
            {editing ? "Edit competitor" : "Add competitor"}
          </h3>
          <CompetitorForm
            initial={editing || undefined}
            onSave={handleSave}
            onClose={() => setShowForm(false)}
          />
        </Modal>
      )}
    </>
  );
}

function CompPhoto({ imageUrl, name }: { imageUrl: string | null; name: string }) {
  const [errored, setErrored] = useState(false);
  const showImage = imageUrl && !errored;
  return (
    <div className="aspect-video w-full bg-gradient-to-br from-gray-100 to-gray-200 relative overflow-hidden">
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageUrl}
          alt={name}
          className="w-full h-full object-cover"
          onError={() => setErrored(true)}
        />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
          <svg className="w-10 h-10 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span className="text-[10px] uppercase font-mono tracking-wider">No photo</span>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gray-50 rounded p-2 text-center">
      <div className="text-[10px] uppercase font-mono text-gray-400">{label}</div>
      <div className="text-sm font-mono font-semibold text-[#161616]">{value}</div>
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
