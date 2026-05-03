"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import BookingForm from "../bookings/BookingForm";

export default function UploadForm() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    if (f.type.startsWith("image/")) {
      setPreviewUrl(URL.createObjectURL(f));
    } else {
      setPreviewUrl(null);
    }
    setShowForm(true);
  }

  return (
    <div className="space-y-4">
      <div className="data-card rounded-lg p-6">
        <h3 className="text-sm font-semibold text-[#161616] mb-2">1. Drop a file</h3>
        <p className="text-xs text-gray-500 mb-4">
          Supports screenshots from Airbnb, VRBO, Booking.com, etc. AI extraction is on the
          roadmap — for v1, you&apos;ll fill in the form below manually.
        </p>
        <label className="block border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-[#0f62fe] transition-colors">
          <input
            type="file"
            accept="image/*,application/pdf"
            onChange={onFileChange}
            className="hidden"
          />
          {file ? (
            <div>
              <div className="text-sm font-medium text-[#161616]">{file.name}</div>
              <div className="text-xs text-gray-400 mt-1 font-mono">
                {(file.size / 1024).toFixed(1)} KB · {file.type}
              </div>
              {previewUrl && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="mx-auto mt-4 max-h-64 rounded border border-gray-200"
                />
              )}
              <div className="text-xs text-[#0f62fe] mt-3">Click to choose a different file</div>
            </div>
          ) : (
            <div>
              <svg
                className="mx-auto w-10 h-10 text-gray-300 mb-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                />
              </svg>
              <div className="text-sm text-gray-500">Click to choose a screenshot or PDF</div>
              <div className="text-xs text-gray-400 mt-1 font-mono">
                File is held in your browser only — extraction is not yet wired up
              </div>
            </div>
          )}
        </label>
      </div>

      {showForm && (
        <div className="data-card rounded-lg p-6">
          <h3 className="text-sm font-semibold text-[#161616] mb-2">2. Fill in the booking</h3>
          <p className="text-xs text-gray-500 mb-4">
            Use the screenshot above as a reference, then save.
          </p>
          <BookingForm />
        </div>
      )}
    </div>
  );
}
