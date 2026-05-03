"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { KnowledgeRow } from "@/lib/queries";
import KnowledgeForm from "./KnowledgeForm";

const TYPE_LABELS: Record<string, string> = {
  market: "Market",
  pricing: "Pricing",
  guest: "Guest",
  property: "Property",
  channel: "Channel",
  strategy: "Strategy",
  experiment: "Experiment",
  note: "Note",
};

const TYPE_COLORS: Record<string, string> = {
  market: "bg-blue-50 text-blue-700",
  pricing: "bg-emerald-50 text-emerald-700",
  guest: "bg-purple-50 text-purple-700",
  property: "bg-amber-50 text-amber-700",
  channel: "bg-pink-50 text-pink-700",
  strategy: "bg-indigo-50 text-indigo-700",
  experiment: "bg-rose-50 text-rose-700",
  note: "bg-gray-100 text-gray-700",
};

export default function KnowledgeClient({
  entries,
  currentSearch,
  currentType,
}: {
  entries: KnowledgeRow[];
  currentSearch: string;
  currentType: string;
}) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<KnowledgeRow | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function remove(id: string) {
    if (!confirm("Delete this entry?")) return;
    await fetch(`/api/knowledge/${id}`, { method: "DELETE" });
    router.refresh();
  }

  function applyFilters(next: { search?: string; type?: string }) {
    const params = new URLSearchParams();
    const search = next.search ?? currentSearch;
    const type = next.type ?? currentType;
    if (search) params.set("q", search);
    if (type) params.set("type", type);
    router.push(`/knowledge${params.toString() ? `?${params.toString()}` : ""}`);
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <input
            type="text"
            defaultValue={currentSearch}
            placeholder="Search title, content, tags…"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                applyFilters({ search: (e.target as HTMLInputElement).value });
              }
            }}
            className="text-sm border border-gray-200 rounded-md px-3 py-1.5 w-64"
          />
          <select
            value={currentType}
            onChange={(e) => applyFilters({ type: e.target.value })}
            className="text-sm border border-gray-200 rounded-md px-3 py-1.5 bg-white"
          >
            <option value="">All types</option>
            {Object.entries(TYPE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          {(currentSearch || currentType) && (
            <button
              onClick={() => router.push("/knowledge")}
              className="text-xs text-gray-400 hover:text-[#161616]"
            >
              Clear
            </button>
          )}
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
          Add Entry
        </button>
      </div>

      {entries.length === 0 ? (
        <div className="data-card rounded-lg p-10 text-center">
          <div className="text-sm text-gray-400">
            {currentSearch || currentType
              ? "No entries match your filters."
              : "No knowledge entries yet. Add one to start building context."}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {entries.map((e) => {
            const isExpanded = expanded.has(e.id);
            const tags = parseTags(e.tags);
            const typeColor = TYPE_COLORS[e.type] || "bg-gray-100 text-gray-700";
            const preview = e.content.length > 200 && !isExpanded
              ? e.content.slice(0, 200) + "…"
              : e.content;
            return (
              <div key={e.id} className="data-card rounded-lg p-4">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`text-[10px] font-medium px-2 py-0.5 rounded uppercase font-mono ${typeColor}`}
                    >
                      {TYPE_LABELS[e.type] || e.type}
                    </span>
                    {e.title && (
                      <span className="text-sm font-semibold text-[#161616]">
                        {e.title}
                      </span>
                    )}
                    {e.source && e.source !== "manual" && (
                      <span className="text-[10px] text-gray-400 font-mono uppercase">
                        {e.source}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-gray-400 font-mono whitespace-nowrap">
                      {formatDate(e.updatedAt || e.createdAt)}
                    </span>
                    <button
                      onClick={() => {
                        setEditing(e);
                        setShowForm(true);
                      }}
                      className="text-gray-400 hover:text-[#0f62fe]"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => remove(e.id)}
                      className="text-gray-400 hover:text-red-600"
                    >
                      Delete
                    </button>
                  </div>
                </div>
                <div
                  className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap cursor-pointer"
                  onClick={() => e.content.length > 200 && toggleExpand(e.id)}
                >
                  {preview}
                </div>
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {tags.map((t, i) => (
                      <span
                        key={i}
                        className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600"
                      >
                        #{t}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showForm && (
        <Modal onClose={() => setShowForm(false)}>
          <h3 className="text-sm font-semibold text-[#161616] mb-4">
            {editing ? "Edit entry" : "Add knowledge entry"}
          </h3>
          <KnowledgeForm
            initial={editing || undefined}
            onClose={() => setShowForm(false)}
          />
        </Modal>
      )}
    </>
  );
}

function parseTags(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
  } catch {}
  return raw.split(",").map((s) => s.trim()).filter(Boolean);
}

function formatDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
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
