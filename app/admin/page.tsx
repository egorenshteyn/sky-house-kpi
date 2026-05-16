import SubHeader from "@/components/SubHeader";
import { getAllBookings, getAllMonthly } from "@/lib/queries";
import { formatDateShort, formatMoney } from "@/lib/format";
import { getSqlite } from "@/lib/db";
import LodgifySyncButton from "./LodgifySyncButton";
import Link from "next/link";

export const dynamic = "force-dynamic";

type ImportBatchRow = {
  id: string;
  source_type: string;
  source_file: string | null;
  imported_at: string;
  records_created: number;
  reviewed: number;
};

export default function AdminPage() {
  const bookings = getAllBookings();
  const all = getAllMonthly();
  const db = getSqlite();
  const importBatches = db.prepare(`SELECT * FROM import_batches ORDER BY imported_at DESC`).all() as ImportBatchRow[];

  // Quality checks
  const overlaps: { a: typeof bookings[0]; b: typeof bookings[0] }[] = [];
  for (let i = 0; i < bookings.length; i++) {
    for (let j = i + 1; j < bookings.length; j++) {
      const a = bookings[i];
      const b = bookings[j];
      if (!a.checkIn || !a.checkOut || !b.checkIn || !b.checkOut) continue;
      if (a.checkIn < b.checkOut && b.checkIn < a.checkOut) {
        overlaps.push({ a, b });
      }
    }
  }

  const missingFields = bookings.filter(
    (b) =>
      !b.guestName ||
      !b.channel ||
      !b.checkIn ||
      !b.checkOut ||
      (b.grossRevenue || 0) === 0,
  );

  // Duplicate guest names
  const nameCounts: Record<string, number> = {};
  for (const b of bookings) {
    if (!b.guestName) continue;
    nameCounts[b.guestName] = (nameCounts[b.guestName] || 0) + 1;
  }
  const possibleDupes = Object.entries(nameCounts).filter(([, count]) => count > 1);

  // Counts
  const counts = {
    bookings: bookings.length,
    monthly: all.length,
    guests: (db.prepare(`SELECT COUNT(*) as c FROM guests`).get() as { c: number }).c,
    channels: (db.prepare(`SELECT COUNT(*) as c FROM channels`).get() as { c: number }).c,
    expenses: (db.prepare(`SELECT COUNT(*) as c FROM expenses`).get() as { c: number }).c,
    insights: (db.prepare(`SELECT COUNT(*) as c FROM ai_insights`).get() as { c: number }).c,
  };

  return (
    <>
      <SubHeader title="Data Admin" subtitle="Quality checks, import history, exports" />
      <div className="px-6 py-6 space-y-4">
        <LodgifySyncButton />

        <div className="grid grid-cols-6 gap-4">
          {Object.entries(counts).map(([k, v]) => (
            <div key={k} className="data-card rounded-lg p-4">
              <div className="text-xs text-gray-400 font-medium mb-1 uppercase">{k}</div>
              <div className="text-2xl font-bold font-mono text-[#161616]">{v}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-4">
          <Quality label="Overlapping bookings" count={overlaps.length} tone={overlaps.length ? "red" : "green"}>
            {overlaps.slice(0, 5).map((o, i) => (
              <div key={i} className="text-xs text-gray-600 py-1 font-mono">
                {o.a.guestName} ({formatDateShort(o.a.checkIn || "")}) overlaps {o.b.guestName} (
                {formatDateShort(o.b.checkIn || "")})
              </div>
            ))}
          </Quality>
          <Quality label="Bookings with missing fields" count={missingFields.length} tone={missingFields.length ? "amber" : "green"}>
            {missingFields.slice(0, 5).map((b) => (
              <Link
                key={b.id}
                href={`/bookings/${b.id}`}
                className="block text-xs text-gray-600 py-1 hover:text-[#0f62fe]"
              >
                {b.guestName || "(no name)"} — missing key fields
              </Link>
            ))}
          </Quality>
          <Quality
            label="Possible duplicate guests"
            count={possibleDupes.length}
            tone={possibleDupes.length ? "amber" : "green"}
          >
            {possibleDupes.slice(0, 5).map(([name, count]) => (
              <div key={name} className="text-xs text-gray-600 py-1">
                {name} appears in {count} bookings
              </div>
            ))}
          </Quality>
        </div>

        <div className="data-card rounded-lg overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[#161616]">Import batches</h3>
            <div className="flex gap-2">
              <a
                href="/api/admin/export?type=bookings"
                className="text-xs text-[#0f62fe] font-medium hover:underline"
              >
                Export bookings CSV
              </a>
              <a
                href="/api/admin/export?type=monthly"
                className="text-xs text-[#0f62fe] font-medium hover:underline"
              >
                Export monthly CSV
              </a>
            </div>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-400 font-mono uppercase bg-gray-50/50">
                <th className="px-5 py-2.5 font-medium">Source</th>
                <th className="px-5 py-2.5 font-medium">File</th>
                <th className="px-5 py-2.5 font-medium">Imported</th>
                <th className="px-5 py-2.5 font-medium text-right">Records</th>
                <th className="px-5 py-2.5 font-medium">Reviewed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {importBatches.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-gray-400">
                    No imports recorded.
                  </td>
                </tr>
              ) : (
                importBatches.map((b) => (
                  <tr key={b.id} className="hover:bg-gray-50/50">
                    <td className="px-5 py-3 text-xs uppercase font-mono text-gray-500">
                      {b.source_type}
                    </td>
                    <td className="px-5 py-3 text-gray-600 font-mono text-xs">
                      {b.source_file || "—"}
                    </td>
                    <td className="px-5 py-3 text-gray-600 font-mono text-xs">
                      {b.imported_at?.slice(0, 10) || "—"}
                    </td>
                    <td className="px-5 py-3 text-right font-mono">{b.records_created}</td>
                    <td className="px-5 py-3">
                      {b.reviewed ? (
                        <span className="text-emerald-600 text-xs">✓ reviewed</span>
                      ) : (
                        <span className="text-amber-600 text-xs">pending</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function Quality({
  label,
  count,
  tone,
  children,
}: {
  label: string;
  count: number;
  tone: "green" | "amber" | "red";
  children: React.ReactNode;
}) {
  const toneColor =
    tone === "green"
      ? "text-emerald-600"
      : tone === "amber"
        ? "text-amber-600"
        : "text-red-600";
  return (
    <div className="data-card rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs text-gray-400 font-medium">{label}</div>
        <div className={`text-2xl font-bold font-mono ${toneColor}`}>{count}</div>
      </div>
      <div className="space-y-0.5 mt-2">
        {count === 0 ? (
          <div className="text-xs text-gray-400">All good ✓</div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}
