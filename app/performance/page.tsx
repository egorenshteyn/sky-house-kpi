import SubHeader from "@/components/SubHeader";
import { getAllMonthly, getAvailableYears } from "@/lib/queries";
import { formatMoney, formatPct, formatNumber } from "@/lib/format";
import Link from "next/link";

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export const dynamic = "force-dynamic";

export default function PerformancePage({
  searchParams,
}: {
  searchParams?: { year?: string };
}) {
  const years = getAvailableYears();
  const defaultYear = years[years.length - 1] || new Date().getFullYear();
  const selectedYear = parseInt(searchParams?.year || String(defaultYear));

  const all = getAllMonthly();
  const months = all.filter((m) => m.year === selectedYear).sort((a, b) => a.month - b.month);
  const priorMonths = all.filter((m) => m.year === selectedYear - 1);

  const yearTotals = months.reduce(
    (acc, m) => ({
      revenue: acc.revenue + (m.bookedRevenue || 0),
      nights: acc.nights + (m.totalNights || 0),
      stays: acc.stays + (m.totalStays || 0),
    }),
    { revenue: 0, nights: 0, stays: 0 },
  );
  const adr = yearTotals.nights > 0 ? yearTotals.revenue / yearTotals.nights : 0;

  return (
    <>
      <SubHeader
        title="Monthly Performance"
        subtitle={`${selectedYear} · ${months.length} months · ${formatMoney(yearTotals.revenue, { compact: true })} revenue`}
        actions={
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 font-mono">Year:</span>
            <div className="flex border border-gray-200 rounded-md overflow-hidden text-sm">
              {years.map((y) => (
                <Link
                  key={y}
                  href={`/performance?year=${y}`}
                  className={`px-3 py-1.5 ${
                    y === selectedYear
                      ? "bg-[#161616] text-white font-medium"
                      : "text-gray-400 hover:bg-gray-50"
                  }`}
                >
                  {y}
                </Link>
              ))}
            </div>
          </div>
        }
      />
      <div className="px-6 py-6 space-y-4">
        <div className="grid grid-cols-4 gap-4">
          <Stat label="Total Revenue" value={formatMoney(yearTotals.revenue, { compact: true })} />
          <Stat label="Nights" value={formatNumber(yearTotals.nights)} />
          <Stat label="Stays" value={formatNumber(yearTotals.stays)} />
          <Stat label="Year ADR" value={formatMoney(adr)} />
        </div>

        <div className="data-card rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-400 font-mono uppercase bg-gray-50/50">
                <th className="px-5 py-2.5 font-medium">Month</th>
                <th className="px-5 py-2.5 font-medium text-right">Revenue</th>
                <th className="px-5 py-2.5 font-medium text-right">Nights</th>
                <th className="px-5 py-2.5 font-medium text-right">Stays</th>
                <th className="px-5 py-2.5 font-medium text-right">Occupancy</th>
                <th className="px-5 py-2.5 font-medium text-right">ADR</th>
                <th className="px-5 py-2.5 font-medium text-right">RevPAN</th>
                <th className="px-5 py-2.5 font-medium">Channel mix</th>
                <th className="px-5 py-2.5 font-medium text-right">YoY</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {months.map((m) => {
                const days = daysInMonth(selectedYear, m.month);
                const adr = m.totalNights > 0 ? m.bookedRevenue / m.totalNights : 0;
                const revpan = m.bookedRevenue / days;
                const prior = priorMonths.find((p) => p.month === m.month);
                const yoy = prior && prior.bookedRevenue > 0
                  ? ((m.bookedRevenue - prior.bookedRevenue) / prior.bookedRevenue) * 100
                  : null;
                const total = m.bookedRevenue || 1;
                const stack = [
                  { name: "Direct", val: m.revenueDirect, color: "#198038" },
                  { name: "Airbnb", val: m.revenueAirbnb, color: "#FF5A5F" },
                  { name: "Luxe", val: m.revenueLuxe, color: "#6929c4" },
                  { name: "VRBO", val: m.revenueVrbo, color: "#0043ce" },
                  { name: "TripAdvisor", val: m.revenueTripadvisor, color: "#00aa6c" },
                  { name: "Booking.com", val: m.revenueBookingcom, color: "#003580" },
                  { name: "StayOne", val: m.revenueStayone, color: "#a56eff" },
                ];
                return (
                  <tr key={m.id} className="hover:bg-gray-50/50">
                    <td className="px-5 py-3 font-medium">
                      {MONTH_NAMES[m.month - 1]} {m.year}
                    </td>
                    <td className="px-5 py-3 text-right font-mono font-semibold">
                      {formatMoney(m.bookedRevenue || 0)}
                    </td>
                    <td className="px-5 py-3 text-right font-mono">{m.totalNights}</td>
                    <td className="px-5 py-3 text-right font-mono">{m.totalStays}</td>
                    <td className="px-5 py-3 text-right font-mono">{formatPct(m.occupancyRate)}</td>
                    <td className="px-5 py-3 text-right font-mono">{formatMoney(adr)}</td>
                    <td className="px-5 py-3 text-right font-mono">{formatMoney(revpan)}</td>
                    <td className="px-5 py-3 w-48">
                      <div className="flex h-2 rounded-full overflow-hidden bg-gray-100">
                        {stack.map((s) =>
                          s.val > 0 ? (
                            <div
                              key={s.name}
                              style={{
                                width: `${(s.val / total) * 100}%`,
                                background: s.color,
                              }}
                              title={`${s.name}: ${formatMoney(s.val)}`}
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
              {months.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-5 py-10 text-center text-gray-400">
                    No data for {selectedYear}.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="data-card rounded-lg p-4">
      <div className="text-xs text-gray-400 font-medium mb-1">{label}</div>
      <div className="text-2xl font-bold font-mono text-[#161616]">{value}</div>
    </div>
  );
}
