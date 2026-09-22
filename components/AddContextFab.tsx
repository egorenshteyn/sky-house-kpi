"use client";

import Modal from "./Modal";

import { useRouter, usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { isPublicStandaloneRoute } from "@/lib/publicRoutes";

const TYPES = [
  "note",
  "market",
  "pricing",
  "guest",
  "property",
  "channel",
  "strategy",
  "experiment",
];

export default function AddContextFab() {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState("note");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) {
      // Focus the textarea after the panel is mounted
      const t = setTimeout(() => textareaRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [open]);

  if (pathname === "/login" || isPublicStandaloneRoute(pathname)) return null;

  async function submit() {
    if (!content.trim()) return;
    setSubmitting(true);
    const tagList = tags
      ? tags.split(",").map((s) => s.trim()).filter(Boolean)
      : [];
    setError(null);
    try {
    const res = await fetch("/api/knowledge", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        type,
        content: content.trim(),
        tags: tagList,
        source: "manual",
      }),
    });
    if (!res.ok) throw new Error("Could not save context. Please try again.");
    if (res.ok) {
      setContent("");
      setTags("");
      setSavedAt(Date.now());
      router.refresh();
      // Auto-collapse after a short delay so the user sees the saved indicator
      setTimeout(() => {
        setOpen(false);
        setSavedAt(null);
      }, 1000);
    }
    } catch { setError("Could not save context. Please try again."); }
    finally { setSubmitting(false); }
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      submit();
    }
    if (e.key === "Escape") {
      setOpen(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="context-fab bg-[#0f62fe] hover:bg-[#0353e9] text-white rounded-full shadow-lg px-4 py-3 text-sm font-medium inline-flex items-center gap-2 transition-colors"
        title="Add context to knowledge base"
        aria-label="Add context"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 6v6m0 0v6m0-6h6m-6 0H6"
          />
        </svg>
        <span className="hidden sm:inline">Add context</span>
      </button>
    );
  }

  return (
    <Modal label="Add context" onClose={() => setOpen(false)}>
    <div onKeyDown={onKeyDown}>
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded bg-[#0f62fe] flex items-center justify-center">
            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6v6m0 0v6m0-6h6m-6 0H6"
              />
            </svg>
          </div>
          <h3 className="text-sm font-semibold text-[#161616]">Add context</h3>
        </div>
        <button
          onClick={() => setOpen(false)}
          className="text-gray-400 hover:text-[#161616]"
          aria-label="Close"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div className="p-4 space-y-3">
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        <div className="flex items-center gap-2">
          <select aria-label="Context type"
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="text-xs border border-gray-200 rounded-md px-2 py-1.5 bg-white"
          >
            {TYPES.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
          <input
            type="text"
            aria-label="Context tags"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="tags (comma-sep)"
            className="flex-1 text-xs border border-gray-200 rounded-md px-2 py-1.5"
          />
        </div>
        <textarea aria-label="Context"
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="What did you observe? What's the context?"
          className="input-base min-h-[100px] text-sm"
        />
        <div className="flex items-center justify-between">
          <div className="text-[10px] font-mono text-gray-400">
            {savedAt
              ? "Saved ✓"
              : "⌘/Ctrl + Enter to save · Esc to close"}
          </div>
          <button
            onClick={submit}
            disabled={submitting || !content.trim()}
            className="btn-primary disabled:opacity-40"
          >
            {submitting ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div></Modal>
  );
}
