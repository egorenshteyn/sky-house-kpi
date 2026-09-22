"use client";

import { useEffect, useRef } from "react";

/** Native modal semantics provide focus containment, Escape and an inert background. */
export default function Modal({ children, onClose, label = "Edit details", className = "" }: {
  children: React.ReactNode;
  onClose: () => void;
  label?: string;
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const dialog = ref.current!;
    const trigger = document.activeElement as HTMLElement | null;
    const previous = document.body.style.overflow;
    dialog.showModal();
    dialog.querySelector<HTMLElement>("input, select, textarea")?.focus();
    document.body.style.overflow = "hidden";
    return () => {
      dialog.close();
      document.body.style.overflow = previous;
      trigger?.focus();
    };
  }, []);
  return (
    <dialog ref={ref} aria-label={label} className={`carbon-dialog ${className}`}
      onKeyDown={(event) => {
        if (event.key !== "Tab") return;
        const items = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]')).filter(el => el.getClientRects().length > 0);
        const first = items[0], last = items[items.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }}
      onCancel={(event) => { event.preventDefault(); close.current(); }}
      onClick={(event) => { if (event.target === event.currentTarget) close.current(); }}>
      <div className="dialog-body">
        <button type="button" className="dialog-close" aria-label={`Close ${label}`} onClick={onClose}>×</button>
        {children}
      </div>
    </dialog>
  );
}
