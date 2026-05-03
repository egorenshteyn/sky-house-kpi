"use client";

import { useState } from "react";
import CompPricingCellEditor from "./CompPricingCellEditor";

type Snapshot = {
  id: string;
  competitorId: string;
  date: string;
  nightlyRate: number | null;
  minimumNights: number | null;
  available: number;
  notes: string | null;
};

type Comp = {
  id: string;
  name: string;
};

type SkyDay = {
  date: string;
  rate: number | null;
  status: string | null;
};

export default function CompCalendarGrid({
  competitors,
  snapshots,
  skyHouseDays,
  monthDays,
  monthLabel,
}: {
  competitors: Comp[];
  snapshots: Snapshot[];
  skyHouseDays: SkyDay[];
  monthDays: string[];
  monthLabel: string;
}) {
  const [editing, setEditing] = useState<{
    competitorId: string;
    competitorName: string;
    date: string;
    snapshot?: Snapshot;
  } | null>(null);

  const skyByDate = new Map<string, SkyDay>();
  for (const d of skyHouseDays) skyByDate.set(d.date, d);

  const snapByKey = new Map<string, Snapshot>();
  for (const s of snapshots) snapByKey.set(`${s.competitorId}:${s.date}`, s);

  function avgCompRate(date: string): number | null {
    const rates = competitors
      .map((c) => snapByKey.get(`${c.id}:${date}`))
      .filter((s) => s && s.available && s.nightlyRate)
      .map((s) => s!.nightlyRate!);
    if (rates.length === 0) return null;
    return rates.reduce((a, b) => a + b, 0) / rates.length;
  }

  function tone(skyRate: number | null, compAvg: number | null): string {
    if (skyRate === null || compAvg === null || compAvg === 0)
      return "bg-white";
    const ratio = skyRate / compAvg;
    if (ratio <= 1.05) return "bg-emerald-50";
    if (ratio <= 1.2) return "bg-amber-50";
    return "bg-red-50";
  }

  return (
    <>
      <div className="data-card rounded-lg overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="px-3 py-2 text-left font-mono text-[10px] uppercase text-gray-400 sticky left-0 bg-gray-50 z-10 min-w-[160px]">
                {monthLabel}
              </th>
              {monthDays.map((d) => {
                const dayNum = parseInt(d.slice(8, 10), 10);
                const dayOfWeek = new Date(d + "T00:00:00Z").getUTCDay();
                const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                return (
                  <th
                    key={d}
                    className={`px-1 py-2 text-center font-mono font-medium w-[50px] ${
                      isWeekend ? "text-[#0f62fe]" : "text-gray-500"
                    }`}
                  >
                    {dayNum}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {/* Sky House anchor row */}
            <tr className="border-b-2 border-[#0f62fe] bg-blue-50/30">
              <td className="px-3 py-2 sticky left-0 bg-blue-50 z-10">
                <div className="text-sm font-semibold text-[#161616]">Sky House</div>
                <div className="text-[10px] text-gray-400 font-mono">your property</div>
              </td>
              {monthDays.map((d) => {
                const sky = skyByDate.get(d);
                return (
                  <td key={d} className="text-center px-1 py-2">
                    {sky?.rate ? (
                      <div className="font-mono font-semibold text-[#161616]">
                        ${Math.round(sky.rate)}
                      </div>
                    ) : sky?.status === "booked" ? (
                      <div className="text-[10px] text-gray-400 font-mono">Bkd</div>
                    ) : (
                      <div className="text-[10px] text-gray-300 font-mono">—</div>
                    )}
                  </td>
                );
              })}
            </tr>

            {competitors.map((c) => (
              <tr key={c.id} className="border-b border-gray-100 hover:bg-gray-50/30">
                <td className="px-3 py-2 sticky left-0 bg-white z-10 border-r border-gray-100">
                  <div className="text-sm font-medium text-[#161616]">{c.name}</div>
                </td>
                {monthDays.map((d) => {
                  const snap = snapByKey.get(`${c.id}:${d}`);
                  const sky = skyByDate.get(d);
                  const compAvg = avgCompRate(d);
                  const t = sky?.rate ? tone(sky.rate, compAvg) : "bg-white";
                  return (
                    <td
                      key={d}
                      onClick={() =>
                        setEditing({
                          competitorId: c.id,
                          competitorName: c.name,
                          date: d,
                          snapshot: snap,
                        })
                      }
                      className={`text-center px-1 py-2 cursor-pointer hover:bg-blue-50 ${t}`}
                      title="Click to add/edit snapshot"
                    >
                      {snap ? (
                        snap.available ? (
                          snap.nightlyRate ? (
                            <div className="font-mono text-[#161616]">
                              ${Math.round(snap.nightlyRate)}
                            </div>
                          ) : (
                            <div className="text-[10px] text-gray-400 font-mono">N/A</div>
                          )
                        ) : (
                          <div className="text-[10px] text-gray-400 font-mono">Bkd</div>
                        )
                      ) : (
                        <div className="text-[10px] text-gray-200 font-mono">+</div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="mt-4 flex items-center gap-4 text-xs text-gray-500">
        <span className="font-mono">Color coding (your rate vs comp avg):</span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-emerald-50 border border-emerald-200" />
          Competitive (≤105%)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-amber-50 border border-amber-200" />
          Above market (105–120%)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-red-50 border border-red-200" />
          Way above (&gt;120%)
        </span>
      </div>

      {editing && (
        <CompPricingCellEditor
          competitorId={editing.competitorId}
          competitorName={editing.competitorName}
          date={editing.date}
          initial={editing.snapshot}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  );
}
