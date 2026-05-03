import SubHeader from "@/components/SubHeader";
import KpiCard from "@/components/KpiCard";
import RevenueBarChart from "@/components/charts/RevenueBarChart";
import OccupancyLineChart from "@/components/charts/OccupancyLineChart";
import {
  getMonthlyForYear,
  getYearTotals,
  getAvailableNightsInYear,
  getUpcomingBookings,
  getActiveInsights,
} from "@/lib/queries";
import { computeInsights } from "@/lib/insights";
import {
  formatMoney,
  formatPct,
  formatNumber,
  formatDateShort,
  channelBadgeClass,
} from "@/lib/format";
import Link from "next/link";

const MONTHS_FULL = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export const dynamic = "force-dynamic";

function pad12(values: number[]): number[] {
  const arr = [...values];
  while (arr.length < 12) arr.push(0);
  return arr.slice(0, 12);
}

function monthlyArrays(months: { month: number; bookedRevenue: number; occupancyRate: number; totalNights: number }[]) {
  const rev = Array(12).fill(0);
  const occ = Array(12).fill(0);
  const nights = Array(12).fill(0);
  for (const m of months) {
    const idx = (m.month || 1) - 1;
    if (idx >= 0 && idx < 12) {
      rev[idx] = m.bookedRevenue || 0;
      occ[idx] = m.occupancyRate || 0;
      nights[idx] = m.totalNights || 0;
    }
  }
  return { rev, occ, nights };
}

export default function DashboardPage() {
  const today = new Date();
  const currentYear = today.getFullYear();

  // Decide the "primary" year. If current year has any data, use it; else use most recent year with data.
  const primary = currentYear;
  const prior = primary - 1;
  const prior2 = primary - 2;

  const monthsPrimary = getMonthlyForYear(primary);
  const monthsPrior = getMonthlyForYear(prior);
  const monthsPrior2 = getMonthlyForYear(prior2);

  const totalsPrimary = getYearTotals(primary);
  const totalsPrior = getYearTotals(prior);

  // KPI calcs
  const revenue = totalsPrimary.bookedRevenue;
  const revenuePrior = totalsPrior.bookedRevenue;
  const revenueDeltaPct =
    revenuePrior > 0 ? ((revenue - revenuePrior) / revenuePrior) * 100 : 0;

  // Net payout: ~85% of gross as a rough estimate
  const netPayout = revenue * 0.85;

  const nights = totalsPrimary.totalNights;
  const nightsPrior = totalsPrior.totalNights;
  const availableNights = getAvailableNightsInYear(primary);
  const occupancy = nights > 0 ? (nights / availableNights) * 100 : 0;
  const occupancyPrior =
    nightsPrior > 0
      ? (nightsPrior / getAvailableNightsInYear(prior)) * 100
      : 0;
  const occupancyDelta = occupancy - occupancyPrior;

  const adr = nights > 0 ? revenue / nights : 0;
  const adrPrior = nightsPrior > 0 ? revenuePrior / nightsPrior : 0;
  const adrDeltaPct = adrPrior > 0 ? ((adr - adrPrior) / adrPrior) * 100 : 0;

  const revpan = revenue / availableNights;
  const revpanPrior = revenuePrior / getAvailableNightsInYear(prior);
  const revpanDeltaPct =
    revpanPrior > 0 ? ((revpan - revpanPrior) / revpanPrior) * 100 : 0;

  // Channel breakdown
  const channelTotals = [
    { name: "Airbnb", value: totalsPrimary.revenueAirbnb, color: "#FF5A5F" },
    { name: "Luxe", value: totalsPrimary.revenueLuxe, color: "#6929c4" },
    { name: "Direct", value: totalsPrimary.revenueDirect, color: "#198038" },
    { name: "VRBO", value: totalsPrimary.revenueVrbo, color: "#0043ce" },
    { name: "TripAdvisor", value: totalsPrimary.revenueTripadvisor, color: "#00aa6c" },
    { name: "Booking.com", value: totalsPrimary.revenueBookingcom, color: "#003580" },
    { name: "StayOne", value: totalsPrimary.revenueStayone, color: "#a56eff" },
  ].filter((c) => c.value > 0 || c.name === "Airbnb" || c.name === "Luxe" || c.name === "Direct" || c.name === "VRBO");

  const channelTotal = channelTotals.reduce((acc, c) => acc + c.value, 0);

  // Charts
  const arrPrimary = monthlyArrays(monthsPrimary);
  const arrPrior = monthlyArrays(monthsPrior);
  const arrPrior2 = monthlyArrays(monthsPrior2);

  const revenueSeries = [
    { year: primary, data: pad12(arrPrimary.rev), color: "#0f62fe" },
    { year: prior, data: pad12(arrPrior.rev), color: "#c6c6c6" },
    { year: prior2, data: pad12(arrPrior2.rev), color: "#e8e8e8" },
  ];

  const occupancySeries = [
    {
      year: primary,
      data: pad12(arrPrimary.occ),
      color: "#0f62fe",
      filled: true,
    },
    {
      year: prior,
      data: pad12(arrPrior.occ),
      color: "#c6c6c6",
      dashed: true,
    },
  ];

  // Pacing narrative
  const revenueGap = revenue - revenuePrior;
  const adrGap = adr - adrPrior;
  const pacingText =
    revenueGap >= 0
      ? `${primary} is pacing ahead of ${prior} by ${formatMoney(revenueGap, { compact: true })} in revenue`
      : `${primary} is pacing behind ${prior} by ${formatMoney(Math.abs(revenueGap), { compact: true })} in revenue but ${
          adrGap >= 0 ? "ahead" : "behind"
        } on ADR by ${formatMoney(Math.abs(adrGap))}/night`;
  const pacingSubtext = `Nights: ${nights} vs ${nightsPrior}. ADR: ${formatMoney(adr)} vs ${formatMoney(adrPrior)}.`;

  // Channel health warnings
  const warnings: { label: string; tone: "red" | "amber" }[] = [];
  if (totalsPrimary.revenueVrbo === 0 && totalsPrior.revenueVrbo > 0) {
    warnings.push({ label: "VRBO inactive", tone: "red" });
  }
  const airbnbPct = channelTotal > 0 ? (totalsPrimary.revenueAirbnb / channelTotal) * 100 : 0;
  if (airbnbPct >= 50) {
    warnings.push({
      label: `${airbnbPct.toFixed(0)}% Airbnb dependency`,
      tone: "amber",
    });
  }

  const upcoming = getUpcomingBookings(8);
  const stored = getActiveInsights();
  const computed = computeInsights();
  // Prioritize competitive/pricing/knowledge insights so the panel surfaces them when comp data exists
  const computedPriority = computed.filter((c) =>
    c.type === "competitive" || c.type === "pricing_recommendation" || c.type === "knowledge_reference",
  );
  const seen = new Set<string>();
  const insights = [
    ...computedPriority.map((c) => ({
      id: `c:${c.title}`,
      title: c.title,
      summary: c.summary,
      priority: c.priority,
    })),
    ...stored.map((s) => ({
      id: s.id,
      title: s.title,
      summary: s.summary,
      priority: s.priority as "high" | "medium" | "low",
    })),
    ...computed
      .filter((c) => c.type !== "competitive" && c.type !== "pricing_recommendation" && c.type !== "knowledge_reference")
      .map((c) => ({
        id: `c:${c.title}`,
        title: c.title,
        summary: c.summary,
        priority: c.priority,
      })),
  ]
    .filter((i) => {
      if (seen.has(i.title)) return false;
      seen.add(i.title);
      return true;
    })
    .slice(0, 4);

  return (
    <>
      <SubHeader
        title="Executive Dashboard"
        subtitle={`${primary} YTD · Dillon Beach, CA`}
        actions={
          <>
            <div className="flex border border-gray-200 rounded-md overflow-hidden text-sm">
              <button className="px-3 py-1.5 text-gray-400 hover:bg-gray-50">MTD</button>
              <button className="px-3 py-1.5 bg-[#161616] text-white font-medium">YTD</button>
              <button className="px-3 py-1.5 text-gray-400 hover:bg-gray-50">T12</button>
              <button className="px-3 py-1.5 text-gray-400 hover:bg-gray-50">ALL</button>
            </div>
            <select className="text-sm border border-gray-200 rounded-md px-3 py-1.5 text-gray-600 bg-white">
              <option>Stay-date revenue</option>
              <option>Booking-date revenue</option>
              <option>Payout-date revenue</option>
            </select>
          </>
        }
      />

      <div className="px-6 py-6 space-y-4">
        {/* KPI Row */}
        <div className="grid grid-cols-6 gap-3">
          <KpiCard
            label="Revenue"
            value={formatMoney(revenue, { compact: true })}
            delta={{
              value: `${revenueDeltaPct >= 0 ? "+" : ""}${revenueDeltaPct.toFixed(1)}%`,
              direction: revenueDeltaPct >= 0 ? "up" : "down",
            }}
          />
          <KpiCard
            label="Net Payout"
            value={formatMoney(netPayout, { compact: true })}
            bar={{ pct: 85, color: "#10b981", caption: "85% of gross" }}
          />
          <KpiCard
            label="Occupancy"
            value={formatPct(occupancy)}
            delta={{
              value: `${occupancyDelta >= 0 ? "+" : ""}${occupancyDelta.toFixed(1)}pp`,
              direction: occupancyDelta >= 0 ? "up" : "down",
            }}
          />
          <KpiCard
            label="ADR"
            value={formatMoney(adr)}
            delta={{
              value: `${adrDeltaPct >= 0 ? "+" : ""}${adrDeltaPct.toFixed(1)}%`,
              direction: adrDeltaPct >= 0 ? "up" : "down",
            }}
          />
          <KpiCard
            label="Nights"
            value={formatNumber(nights)}
            bar={{ pct: occupancy, caption: `of ${availableNights} available` }}
          />
          <KpiCard
            label="RevPAN"
            value={formatMoney(revpan)}
            delta={{
              value: `${revpanDeltaPct >= 0 ? "+" : ""}${revpanDeltaPct.toFixed(1)}%`,
              direction: revpanDeltaPct >= 0 ? "up" : "down",
            }}
          />
        </div>

        {/* Pacing Banner */}
        <div className="data-card rounded-lg p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
          <div className="flex-1">
            <div className="text-sm font-semibold text-[#161616]">{pacingText}</div>
            <div className="text-xs text-gray-400 mt-0.5">{pacingSubtext}</div>
          </div>
          <div className="flex-shrink-0 flex gap-3">
            <div className="text-center">
              <div className="text-lg font-bold font-mono text-[#161616]">
                {formatMoney(revenue, { compact: true })}
              </div>
              <div className="text-xs text-gray-400">{primary}</div>
            </div>
            <div className="text-center text-gray-300 self-center">/</div>
            <div className="text-center">
              <div className="text-lg font-bold font-mono text-gray-400">
                {formatMoney(revenuePrior, { compact: true })}
              </div>
              <div className="text-xs text-gray-400">{prior}</div>
            </div>
          </div>
        </div>

        {/* Charts row */}
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2 data-card rounded-lg p-5">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-4">
                <h3 className="text-sm font-semibold text-[#161616]">Monthly Revenue</h3>
                <div className="flex gap-3 text-xs">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-sm bg-[#0f62fe]" />
                    <span className="text-gray-400">{primary}</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-sm bg-gray-300" />
                    <span className="text-gray-400">{prior}</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-sm bg-gray-200" />
                    <span className="text-gray-400">{prior2}</span>
                  </span>
                </div>
              </div>
            </div>
            <div className="h-64">
              <RevenueBarChart series={revenueSeries} />
            </div>
          </div>
          <div className="data-card rounded-lg p-5">
            <h3 className="text-sm font-semibold text-[#161616] mb-5">Channel Breakdown</h3>
            <div className="space-y-4">
              {channelTotals.slice(0, 5).map((ch) => {
                const pct = channelTotal > 0 ? (ch.value / channelTotal) * 100 : 0;
                return (
                  <div key={ch.name}>
                    <div className="flex items-center justify-between text-sm mb-1.5">
                      <span className={`font-medium ${ch.value === 0 ? "text-gray-400" : ""}`}>
                        {ch.name}
                      </span>
                      <span className={`font-mono font-semibold ${ch.value === 0 ? "text-gray-400" : ""}`}>
                        {formatMoney(ch.value)}{" "}
                        <span className="text-gray-400 font-normal">{pct.toFixed(0)}%</span>
                      </span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full">
                      <div
                        className="h-2 rounded-full"
                        style={{ width: `${pct}%`, background: ch.color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            {warnings.length > 0 && (
              <div className="mt-5 pt-4 border-t border-gray-100">
                <div className="text-xs text-gray-400 mb-2">Channel health</div>
                <div className="flex items-center gap-2 text-xs flex-wrap">
                  {warnings.map((w, i) => (
                    <span
                      key={i}
                      className={`px-2 py-0.5 rounded font-medium ${
                        w.tone === "red"
                          ? "bg-red-50 text-red-600"
                          : "bg-amber-50 text-amber-600"
                      }`}
                    >
                      {w.label}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bottom: bookings + AI */}
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2 data-card rounded-lg overflow-hidden">
            <div className="px-5 py-4 flex items-center justify-between border-b border-gray-100">
              <h3 className="text-sm font-semibold text-[#161616]">Upcoming Stays</h3>
              <Link
                href="/bookings"
                className="text-xs text-[#0f62fe] hover:text-[#0353e9] font-medium"
              >
                View all
              </Link>
            </div>
            {upcoming.length === 0 ? (
              <div className="px-5 py-10 text-center text-sm text-gray-400">
                No upcoming stays. <Link href="/bookings/new" className="text-[#0f62fe]">Add one</Link>.
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-400 font-mono uppercase bg-gray-50/50">
                    <th className="px-5 py-2.5 font-medium">Guest</th>
                    <th className="px-5 py-2.5 font-medium">Check-in</th>
                    <th className="px-5 py-2.5 font-medium">Check-out</th>
                    <th className="px-5 py-2.5 font-medium">Nts</th>
                    <th className="px-5 py-2.5 font-medium">Channel</th>
                    <th className="px-5 py-2.5 font-medium text-right">Revenue</th>
                    <th className="px-5 py-2.5 font-medium text-right">ADR</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {upcoming.map((b) => (
                    <tr key={b.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-5 py-3 font-medium">{b.guestName || "—"}</td>
                      <td className="px-5 py-3 text-gray-600 font-mono text-xs">
                        {formatDateShort(b.checkIn || "")}
                      </td>
                      <td className="px-5 py-3 text-gray-600 font-mono text-xs">
                        {formatDateShort(b.checkOut || "")}
                      </td>
                      <td className="px-5 py-3 font-mono">{b.nights || 0}</td>
                      <td className="px-5 py-3">
                        <span
                          className={`${channelBadgeClass(b.channel || "")} px-2 py-0.5 rounded text-xs font-medium`}
                        >
                          {b.channel || "—"}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right font-mono font-semibold">
                        {formatMoney(b.grossRevenue || 0)}
                      </td>
                      <td className="px-5 py-3 text-right font-mono text-gray-400">
                        {formatMoney(b.avgNightlyRate || 0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* AI panel */}
          <div className="data-card rounded-lg flex flex-col">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
              <div className="w-5 h-5 rounded bg-[#0f62fe] flex items-center justify-center">
                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-sm font-semibold text-[#161616]">AI Analysis</h3>
            </div>
            <div className="p-4 space-y-3 flex-1">
              {insights.map((ins) => {
                const borderColor =
                  ins.priority === "high"
                    ? "border-red-500"
                    : ins.priority === "medium"
                      ? "border-amber-500"
                      : "border-[#0f62fe]";
                return (
                  <div
                    key={ins.id}
                    className={`p-3 rounded-md bg-gray-50 border-l-2 ${borderColor}`}
                  >
                    <div className="text-xs font-semibold text-[#161616] mb-1">
                      {ins.title}
                    </div>
                    <div className="text-xs text-gray-500 leading-relaxed">
                      {ins.summary}
                    </div>
                  </div>
                );
              })}
              {insights.length === 0 && (
                <div className="text-xs text-gray-400 text-center py-4">No insights yet.</div>
              )}
            </div>
            <div className="px-4 pb-4">
              <form action="/insights" className="relative">
                <input
                  type="text"
                  name="q"
                  placeholder="Ask about performance..."
                  className="input-base pr-8"
                />
                <button
                  type="submit"
                  className="absolute right-2.5 top-2.5 text-gray-300 hover:text-[#0f62fe]"
                  aria-label="Ask"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Occupancy chart */}
        <div className="data-card rounded-lg p-5">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-sm font-semibold text-[#161616]">Occupancy Comparison</h3>
            <div className="flex gap-3 text-xs">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-sm bg-[#0f62fe]" />
                <span className="text-gray-400">{primary}</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-sm bg-gray-300" />
                <span className="text-gray-400">{prior}</span>
              </span>
            </div>
          </div>
          <div className="h-48">
            <OccupancyLineChart series={occupancySeries} />
          </div>
        </div>
      </div>
    </>
  );
}
