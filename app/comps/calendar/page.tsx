import SubHeader from "@/components/SubHeader";
import {
  getAllCompetitors,
  getCompPricing,
  getAllBookings,
} from "@/lib/queries";
import CompCalendarGrid from "./CompCalendarGrid";
import Link from "next/link";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export const dynamic = "force-dynamic";

export default function CompPricingCalendarPage({
  searchParams,
}: {
  searchParams?: { year?: string; month?: string };
}) {
  const today = new Date();
  const year = parseInt(searchParams?.year || String(today.getFullYear()));
  const month = parseInt(searchParams?.month || String(today.getMonth() + 1));

  const competitors = getAllCompetitors().filter((c) => c.active);

  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const monthDays: string[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    monthDays.push(
      `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
    );
  }
  const fromDate = monthDays[0];
  const toDate = monthDays[monthDays.length - 1];

  const snapshots = getCompPricing({ fromDate, toDate });

  // Build Sky House rate per day from existing bookings (ADR for nights covered)
  const allBookings = getAllBookings();
  const skyHouseDays = monthDays.map((iso) => {
    const covering = allBookings.find(
      (b) => b.checkIn && b.checkOut && b.checkIn <= iso && iso < b.checkOut,
    );
    if (!covering) return { date: iso, rate: null, status: null };
    return {
      date: iso,
      rate: covering.avgNightlyRate || null,
      status: covering.status,
    };
  });

  // Summary stats
  const yourRates = skyHouseDays.map((d) => d.rate).filter((r): r is number => !!r);
  const compAvgPerDay = monthDays
    .map((d) => {
      const rates = competitors
        .map((c) => snapshots.find((s) => s.competitorId === c.id && s.date === d))
        .filter((s) => s && s.available && s.nightlyRate)
        .map((s) => s!.nightlyRate!);
      if (rates.length === 0) return null;
      return rates.reduce((a, b) => a + b, 0) / rates.length;
    })
    .filter((r): r is number => r !== null);

  const yourAvg = yourRates.length > 0
    ? yourRates.reduce((a, b) => a + b, 0) / yourRates.length
    : 0;
  const compAvg = compAvgPerDay.length > 0
    ? compAvgPerDay.reduce((a, b) => a + b, 0) / compAvgPerDay.length
    : 0;
  const premiumPct = compAvg > 0 ? ((yourAvg - compAvg) / compAvg) * 100 : 0;

  // Comp availability ratio (across all comp/day cells we have data for)
  const totalSnapshots = snapshots.length;
  const availableSnapshots = snapshots.filter((s) => s.available).length;
  const availabilityPct = totalSnapshots > 0
    ? (availableSnapshots / totalSnapshots) * 100
    : 0;

  const prev = month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
  const next = month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 };

  return (
    <>
      <SubHeader
        title="Comp Pricing Calendar"
        subtitle={`${MONTH_NAMES[month - 1]} ${year} · ${competitors.length} active competitor${competitors.length === 1 ? "" : "s"}`}
        actions={
          <div className="flex items-center gap-2">
            <Link
              href="/comps"
              className="text-sm border border-gray-200 rounded-md px-3 py-1.5 text-gray-600 hover:bg-gray-50"
            >
              Manage comps
            </Link>
            <Link
              href={`/comps/calendar?year=${prev.year}&month=${prev.month}`}
              className="text-sm border border-gray-200 rounded-md px-3 py-1.5 text-gray-600 hover:bg-gray-50"
            >
              ←
            </Link>
            <Link
              href={`/comps/calendar?year=${today.getFullYear()}&month=${today.getMonth() + 1}`}
              className="text-sm border border-gray-200 rounded-md px-3 py-1.5 text-gray-600 hover:bg-gray-50"
            >
              Today
            </Link>
            <Link
              href={`/comps/calendar?year=${next.year}&month=${next.month}`}
              className="text-sm border border-gray-200 rounded-md px-3 py-1.5 text-gray-600 hover:bg-gray-50"
            >
              →
            </Link>
          </div>
        }
      />
      <div className="px-6 py-6 space-y-6">
        {competitors.length === 0 ? (
          <div className="data-card rounded-lg p-10 text-center">
            <div className="text-sm text-gray-400 mb-3">
              No active competitors yet. Add some on the comps page first.
            </div>
            <Link href="/comps" className="btn-primary inline-block">
              Manage comps
            </Link>
          </div>
        ) : (
          <>
            <CompCalendarGrid
              competitors={competitors.map((c) => ({ id: c.id, name: c.name }))}
              snapshots={snapshots.map((s) => ({
                id: s.id,
                competitorId: s.competitorId,
                date: s.date,
                nightlyRate: s.nightlyRate,
                minimumNights: s.minimumNights,
                available: s.available,
                notes: s.notes,
              }))}
              skyHouseDays={skyHouseDays}
              monthDays={monthDays}
              monthLabel={`${MONTH_NAMES[month - 1]} ${year}`}
            />

            <div className="grid grid-cols-4 gap-4">
              <SummaryCard
                label="Your avg rate"
                value={yourAvg ? `$${Math.round(yourAvg)}` : "—"}
                caption={`${yourRates.length} occupied nights`}
              />
              <SummaryCard
                label="Comp avg rate"
                value={compAvg ? `$${Math.round(compAvg)}` : "—"}
                caption={`${competitors.length} comp set`}
              />
              <SummaryCard
                label="Your premium"
                value={
                  compAvg && yourAvg
                    ? `${premiumPct >= 0 ? "+" : ""}${premiumPct.toFixed(1)}%`
                    : "—"
                }
                caption={
                  premiumPct > 20
                    ? "Way above market"
                    : premiumPct > 5
                      ? "Above market"
                      : premiumPct >= -5
                        ? "Competitive"
                        : "Below market"
                }
                tone={
                  premiumPct > 20
                    ? "red"
                    : premiumPct > 5
                      ? "amber"
                      : "green"
                }
              />
              <SummaryCard
                label="Comp availability"
                value={`${availabilityPct.toFixed(0)}%`}
                caption={`${availableSnapshots}/${totalSnapshots} snapshots avail`}
              />
            </div>
          </>
        )}
      </div>
    </>
  );
}

function SummaryCard({
  label,
  value,
  caption,
  tone,
}: {
  label: string;
  value: string;
  caption: string;
  tone?: "red" | "amber" | "green";
}) {
  const valueColor =
    tone === "red"
      ? "text-red-600"
      : tone === "amber"
        ? "text-amber-600"
        : tone === "green"
          ? "text-emerald-600"
          : "text-[#161616]";
  return (
    <div className="data-card rounded-lg p-4">
      <div className="text-xs text-gray-400 mb-1 font-mono uppercase">{label}</div>
      <div className={`text-2xl font-bold font-mono ${valueColor}`}>{value}</div>
      <div className="text-xs text-gray-400 mt-0.5">{caption}</div>
    </div>
  );
}
