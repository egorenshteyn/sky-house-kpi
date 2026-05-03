import {
  getAllMonthly,
  getAllCompetitors,
  getCompPricing,
  getAllBookings,
  getAllKnowledge,
} from "./queries";

export type ComputedInsight = {
  type: string;
  title: string;
  summary: string;
  priority: "high" | "medium" | "low";
  actionRecommendation?: string;
};

const MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export function computeInsights(): ComputedInsight[] {
  const all = getAllMonthly();
  const byYear: Record<number, typeof all> = {};
  for (const m of all) {
    (byYear[m.year] = byYear[m.year] || []).push(m);
  }
  const years = Object.keys(byYear).map(Number).sort();
  const lastYear = years[years.length - 1];
  if (!lastYear) return [];

  const out: ComputedInsight[] = [];
  const cur = byYear[lastYear];
  const prev = byYear[lastYear - 1] || [];

  const sumRev = (rows: typeof all) => rows.reduce((a, m) => a + (m.bookedRevenue || 0), 0);
  const sumNights = (rows: typeof all) => rows.reduce((a, m) => a + (m.totalNights || 0), 0);
  const sumStays = (rows: typeof all) => rows.reduce((a, m) => a + (m.totalStays || 0), 0);

  const curRev = sumRev(cur);
  const prevRev = sumRev(prev);
  if (prevRev > 0) {
    const delta = ((curRev - prevRev) / prevRev) * 100;
    out.push({
      type: "pacing",
      title: delta >= 0 ? "Revenue ahead of last year" : "Revenue behind last year",
      summary: `${lastYear} revenue (${dollars(curRev)}) is ${delta >= 0 ? "+" : ""}${delta.toFixed(1)}% vs ${lastYear - 1} (${dollars(prevRev)}).`,
      priority: Math.abs(delta) > 15 ? "high" : "medium",
    });
  }

  // Empty months in current year
  const empty = cur.filter((m) => (m.bookedRevenue || 0) === 0 && (m.totalNights || 0) === 0);
  if (empty.length > 0) {
    out.push({
      type: "alert",
      title: `${empty.length} empty month${empty.length > 1 ? "s" : ""} in ${lastYear}`,
      summary: `Months with zero stays: ${empty.map((m) => monthName(m.month)).join(", ")}. Consider promotions or maintenance windows.`,
      priority: "high",
      actionRecommendation: "Build off-season campaign or block as owner-use",
    });
  }

  // Channel dependency
  const totals = {
    Direct: cur.reduce((a, m) => a + (m.revenueDirect || 0), 0),
    Airbnb: cur.reduce((a, m) => a + (m.revenueAirbnb || 0), 0),
    Luxe: cur.reduce((a, m) => a + (m.revenueLuxe || 0), 0),
    VRBO: cur.reduce((a, m) => a + (m.revenueVrbo || 0), 0),
    TripAdvisor: cur.reduce((a, m) => a + (m.revenueTripadvisor || 0), 0),
    "Booking.com": cur.reduce((a, m) => a + (m.revenueBookingcom || 0), 0),
    StayOne: cur.reduce((a, m) => a + (m.revenueStayone || 0), 0),
  };
  const grand = Object.values(totals).reduce((a, b) => a + b, 0) || 1;
  for (const [name, val] of Object.entries(totals)) {
    const pct = (val / grand) * 100;
    if (pct >= 50) {
      out.push({
        type: "channel",
        title: `${pct.toFixed(0)}% revenue from ${name}`,
        summary: `${name} is generating ${dollars(val)} of ${dollars(grand)} this year. High channel dependency increases risk.`,
        priority: "medium",
        actionRecommendation: "Diversify by reactivating other channels",
      });
    }
  }
  // Channels that went to zero
  const prevTotals = {
    Direct: prev.reduce((a, m) => a + (m.revenueDirect || 0), 0),
    Airbnb: prev.reduce((a, m) => a + (m.revenueAirbnb || 0), 0),
    Luxe: prev.reduce((a, m) => a + (m.revenueLuxe || 0), 0),
    VRBO: prev.reduce((a, m) => a + (m.revenueVrbo || 0), 0),
  } as Record<string, number>;
  for (const [name, prevVal] of Object.entries(prevTotals)) {
    const curVal = (totals as Record<string, number>)[name];
    if (curVal === 0 && prevVal > 0) {
      out.push({
        type: "channel",
        title: `${name} channel went silent`,
        summary: `Last year ${name} generated ${dollars(prevVal)}. ${lastYear} has $0 from this channel — verify listing status.`,
        priority: "high",
        actionRecommendation: `Reactivate ${name} listing or reallocate marketing`,
      });
    }
  }

  // ADR trend
  const curNights = sumNights(cur);
  const prevNights = sumNights(prev);
  const curAdr = curNights > 0 ? curRev / curNights : 0;
  const prevAdr = prevNights > 0 ? prevRev / prevNights : 0;
  if (prevAdr > 0) {
    const adrDelta = ((curAdr - prevAdr) / prevAdr) * 100;
    out.push({
      type: "trend",
      title: `ADR ${adrDelta >= 0 ? "rising" : "falling"}`,
      summary: `Average daily rate is ${dollars(curAdr)} this year vs ${dollars(prevAdr)} last year (${adrDelta >= 0 ? "+" : ""}${adrDelta.toFixed(1)}%).`,
      priority: "low",
    });
  }

  // Avg stay length
  const curStays = sumStays(cur);
  const prevStays = sumStays(prev);
  if (curStays > 0 && prevStays > 0) {
    const curAvg = curNights / curStays;
    const prevAvg = prevNights / prevStays;
    if (Math.abs(curAvg - prevAvg) > 0.3) {
      out.push({
        type: "trend",
        title: `Avg stay length ${curAvg > prevAvg ? "increased" : "decreased"}`,
        summary: `Avg stay length is ${curAvg.toFixed(1)} nights vs ${prevAvg.toFixed(1)} last year. ${
          curAvg > prevAvg
            ? "Longer stays reduce turnover costs."
            : "Shorter stays can mean more weekend bookings."
        }`,
        priority: "low",
      });
    }
  }

  // Competitive insights (only if comp data is present)
  out.push(...computeCompetitiveInsights());

  // Knowledge base references (surface relevant strategy notes)
  out.push(...computeKnowledgeInsights());

  return out;
}

export function computeCompetitiveInsights(): ComputedInsight[] {
  const out: ComputedInsight[] = [];
  let competitors: ReturnType<typeof getAllCompetitors> = [];
  let snapshots: ReturnType<typeof getCompPricing> = [];
  let bookings: ReturnType<typeof getAllBookings> = [];
  try {
    competitors = getAllCompetitors().filter((c) => c.active);
    snapshots = getCompPricing();
    bookings = getAllBookings();
  } catch {
    return out;
  }
  if (competitors.length === 0 || snapshots.length === 0) return out;

  // Group snapshots by month (YYYY-MM) and compute comp avg per month
  const compByMonth: Record<string, number[]> = {};
  for (const s of snapshots) {
    if (!s.available || !s.nightlyRate) continue;
    const key = s.date.slice(0, 7);
    (compByMonth[key] = compByMonth[key] || []).push(s.nightlyRate);
  }

  // Sky House ADR per month (from bookings, weighted by nights of stay)
  const skyByMonth: Record<string, { rev: number; nights: number }> = {};
  for (const b of bookings) {
    if (!b.checkIn || !b.checkOut || !b.grossRevenue || !b.nights) continue;
    const start = new Date(b.checkIn + "T00:00:00Z");
    const end = new Date(b.checkOut + "T00:00:00Z");
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) continue;
    const adr = (b.avgNightlyRate || b.grossRevenue / b.nights) || 0;
    for (let d = new Date(start); d < end; d.setUTCDate(d.getUTCDate() + 1)) {
      const key = d.toISOString().slice(0, 7);
      (skyByMonth[key] = skyByMonth[key] || { rev: 0, nights: 0 });
      skyByMonth[key].rev += adr;
      skyByMonth[key].nights += 1;
    }
  }

  for (const [monthKey, rates] of Object.entries(compByMonth)) {
    if (rates.length < 2) continue;
    const compAvg = rates.reduce((a, b) => a + b, 0) / rates.length;
    const sky = skyByMonth[monthKey];
    if (!sky || sky.nights === 0) continue;
    const skyAdr = sky.rev / sky.nights;
    if (compAvg === 0) continue;
    const diffPct = ((skyAdr - compAvg) / compAvg) * 100;
    const [yearStr, monStr] = monthKey.split("-");
    const monLabel = `${MONTH_LABELS[parseInt(monStr, 10) - 1]} ${yearStr}`;
    if (diffPct >= 15) {
      out.push({
        type: "competitive",
        title: `${monLabel} ADR ${diffPct.toFixed(0)}% above comp set`,
        summary: `Your ${monLabel} ADR of $${Math.round(skyAdr).toLocaleString()} is ${diffPct.toFixed(0)}% above the comp set average of $${Math.round(compAvg).toLocaleString()}.`,
        priority: diffPct >= 30 ? "high" : "medium",
        actionRecommendation:
          "Verify guest mix and amenities justify the premium, or test a softer rate to push occupancy.",
      });
    } else if (diffPct <= -10) {
      out.push({
        type: "pricing_recommendation",
        title: `${monLabel} ADR below comp set`,
        summary: `Your ${monLabel} ADR of $${Math.round(skyAdr).toLocaleString()} is ${Math.abs(diffPct).toFixed(0)}% below the comp set average of $${Math.round(compAvg).toLocaleString()}. There may be room to raise rates.`,
        priority: diffPct <= -20 ? "high" : "medium",
        actionRecommendation: "Consider raising nightly rates for upcoming bookings.",
      });
    }
  }

  return out;
}

export function computeKnowledgeInsights(): ComputedInsight[] {
  const out: ComputedInsight[] = [];
  let entries: ReturnType<typeof getAllKnowledge> = [];
  try {
    entries = getAllKnowledge();
  } catch {
    return out;
  }
  // Surface the most recent strategy/experiment entries
  const interesting = entries.filter(
    (e) => e.type === "strategy" || e.type === "experiment" || e.type === "pricing",
  );
  for (const e of interesting.slice(0, 2)) {
    const title = e.title || `${capitalize(e.type)} note`;
    const preview = e.content.length > 160 ? e.content.slice(0, 160) + "…" : e.content;
    out.push({
      type: "knowledge_reference",
      title: `Note: ${title}`,
      summary: preview,
      priority: "low",
      actionRecommendation: "Open Knowledge Base to revisit the full context.",
    });
  }
  return out;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function dollars(n: number): string {
  if (Math.abs(n) >= 1000) return `$${(n / 1000).toFixed(1)}K`;
  return `$${Math.round(n)}`;
}

function monthName(m: number): string {
  return ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][m - 1] || String(m);
}
