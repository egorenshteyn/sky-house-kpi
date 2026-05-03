import SubHeader from "@/components/SubHeader";
import RevenueBarChart from "@/components/charts/RevenueBarChart";
import {
  getAllMonthly,
  getAvailableYears,
  getAvailableNightsInYear,
} from "@/lib/queries";
import { formatMoney, formatPct, formatNumber } from "@/lib/format";

export const dynamic = "force-dynamic";

const COLORS = ["#0f62fe", "#6929c4", "#198038", "#FF5A5F", "#0043ce", "#a8a8a8", "#161616"];

export default function AnnualPage() {
  const years = getAvailableYears();
  const all = getAllMonthly();

  const yearStats = years.map((y) => {
    const months = all.filter((m) => m.year === y);
    const revenue = months.reduce((a, m) => a + (m.bookedRevenue || 0), 0);
    const nights = months.reduce((a, m) => a + (m.totalNights || 0), 0);
    const stays = months.reduce((a, m) => a + (m.totalStays || 0), 0);
    const direct = months.reduce((a, m) => a + (m.revenueDirect || 0), 0);
    const airbnb = months.reduce((a, m) => a + (m.revenueAirbnb || 0), 0);
    const luxe = months.reduce((a, m) => a + (m.revenueLuxe || 0), 0);
    const vrbo = months.reduce((a, m) => a + (m.revenueVrbo || 0), 0);
    const trip = months.reduce((a, m) => a + (m.revenueTripadvisor || 0), 0);
    const bcom = months.reduce((a, m) => a + (m.revenueBookingcom || 0), 0);
    const stay1 = months.reduce((a, m) => a + (m.revenueStayone || 0), 0);
    const occupancy = nights > 0 ? (nights / getAvailableNightsInYear(y)) * 100 : 0;
    const adr = nights > 0 ? revenue / nights : 0;
    return { year: y, revenue, nights, stays, direct, airbnb, luxe, vrbo, trip, bcom, stay1, occupancy, adr };
  });

  // Latest 3 years for the chart
  const recent = yearStats.slice(-3);
  const series = recent.map((y, i) => {
    const months = all.filter((m) => m.year === y.year).sort((a, b) => a.month - b.month);
    const data = Array(12).fill(0);
    months.forEach((m) => {
      const idx = (m.month || 1) - 1;
      if (idx >= 0 && idx < 12) data[idx] = m.bookedRevenue || 0;
    });
    return { year: y.year, data, color: COLORS[i] };
  });

  return (
    <>
      <SubHeader
        title="Annual Comparison"
        subtitle={`${years.length} years · ${formatMoney(
          yearStats.reduce((a, y) => a + y.revenue, 0),
          { compact: true },
        )} all-time revenue`}
      />
      <div className="px-6 py-6 space-y-4">
        <div className="data-card rounded-lg p-5">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-sm font-semibold text-[#161616]">Revenue by month</h3>
            <div className="flex gap-3 text-xs">
              {recent.map((y, i) => (
                <span key={y.year} className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-sm" style={{ background: COLORS[i] }} />
                  <span className="text-gray-400">{y.year}</span>
                </span>
              ))}
            </div>
          </div>
          <div className="h-72">
            <RevenueBarChart series={series} />
          </div>
        </div>

        <div className="data-card rounded-lg overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-[#161616]">Year-over-year totals</h3>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-400 font-mono uppercase bg-gray-50/50">
                <th className="px-5 py-2.5 font-medium">Year</th>
                <th className="px-5 py-2.5 font-medium text-right">Revenue</th>
                <th className="px-5 py-2.5 font-medium text-right">Nights</th>
                <th className="px-5 py-2.5 font-medium text-right">Stays</th>
                <th className="px-5 py-2.5 font-medium text-right">Occupancy</th>
                <th className="px-5 py-2.5 font-medium text-right">ADR</th>
                <th className="px-5 py-2.5 font-medium">Channel mix</th>
                <th className="px-5 py-2.5 font-medium text-right">YoY</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {yearStats.map((y, i) => {
                const prior = yearStats[i - 1];
                const yoy = prior && prior.revenue > 0
                  ? ((y.revenue - prior.revenue) / prior.revenue) * 100
                  : null;
                const total = y.revenue || 1;
                const stack = [
                  { name: "Direct", val: y.direct, color: "#198038" },
                  { name: "Airbnb", val: y.airbnb, color: "#FF5A5F" },
                  { name: "Luxe", val: y.luxe, color: "#6929c4" },
                  { name: "VRBO", val: y.vrbo, color: "#0043ce" },
                  { name: "TripAdvisor", val: y.trip, color: "#00aa6c" },
                  { name: "Booking.com", val: y.bcom, color: "#003580" },
                  { name: "StayOne", val: y.stay1, color: "#a56eff" },
                ];
                return (
                  <tr key={y.year} className="hover:bg-gray-50/50">
                    <td className="px-5 py-3 font-medium font-mono">{y.year}</td>
                    <td className="px-5 py-3 text-right font-mono font-semibold">
                      {formatMoney(y.revenue)}
                    </td>
                    <td className="px-5 py-3 text-right font-mono">{formatNumber(y.nights)}</td>
                    <td className="px-5 py-3 text-right font-mono">{formatNumber(y.stays)}</td>
                    <td className="px-5 py-3 text-right font-mono">{formatPct(y.occupancy)}</td>
                    <td className="px-5 py-3 text-right font-mono">{formatMoney(y.adr)}</td>
                    <td className="px-5 py-3 w-56">
                      <div className="flex h-2 rounded-full overflow-hidden bg-gray-100">
                        {stack.map((s) =>
                          s.val > 0 ? (
                            <div
                              key={s.name}
                              style={{
                                width: `${(s.val / total) * 100}%`,
                                background: s.color,
                              }}
                              title={`${s.name}: ${formatMoney(s.val)} (${((s.val / total) * 100).toFixed(0)}%)`}
                            />
                          ) : null,
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-right font-mono">
                      {yoy === null ? (
                        <span className="text-gray-300">—</span>
                      ) : (
                        <span
                          className={
                            yoy > 0 ? "text-emerald-600" : yoy < 0 ? "text-red-500" : "text-gray-400"
                          }
                        >
                          {yoy > 0 ? "+" : ""}
                          {yoy.toFixed(1)}%
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
