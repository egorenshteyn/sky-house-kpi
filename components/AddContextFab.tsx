"use client";

import { useRouter, usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

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
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) {
      // Focus the textarea after the panel is mounted
      const t = setTimeout(() => textareaRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [open]);

  if (pathname === "/login") return null;

  async function submit() {
    if (!content.trim()) return;
    setSubmitting(true);
    const tagList = tags
      ? tags.split(",").map((s) => s.trim()).filter(Boolean)
      : [];
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
    setSubmitting(false);
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
        className="fixed bottom-6 right-6 z-40 bg-[#0f62fe] hover:bg-[#0353e9] text-white rounded-full shadow-lg px-4 py-3 text-sm font-medium inline-flex items-center gap-2 transition-colors"
        title="Add context to knowledge base"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 6v6m0 0v6m0-6h6m-6 0H6"
          />
        </svg>
        Add context
      </button>
    );
  }

  return (
    <div
      className="fixed bottom-6 right-6 z-40 bg-white rounded-lg shadow-2xl border border-gray-200 w-[420px] max-w-[calc(100vw-3rem)]"
      onKeyDown={onKeyDown}
    >
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
        <div className="flex items-center gap-2">
          <select
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
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="tags (comma-sep)"
            className="flex-1 text-xs border border-gray-200 rounded-md px-2 py-1.5"
          />
        </div>
        <textarea
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
    </div>
  );
}
