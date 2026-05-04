export type MonthlyAgg = {
  id: string;
  year: number;
  month: number;
  totalStays: number;
  totalNights: number;
  occupancyRate: number;
  bookedRevenue: number;
  cumulativeAnnualRevenue: number;
  totalCumulativeRevenue: number;
  revenueDirect: number;
  revenueAirbnb: number;
  revenueLuxe: number;
  revenueVrbo: number;
  revenueTripadvisor: number;
  revenueBookingcom: number;
  revenueStayone: number;
  notes: string | null;
};

export function getAvailableNightsInYear(year: number): number {
  const isLeap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  return isLeap ? 366 : 365;
}

export type Period = "MTD" | "YTD" | "T12" | "ALL";
export type RevenueBasis = "stay" | "booking" | "payout";

export const PERIODS: Period[] = ["MTD", "YTD", "T12", "ALL"];

export function parsePeriod(v: string | undefined): Period {
  const upper = (v || "").toUpperCase();
  if (upper === "MTD" || upper === "YTD" || upper === "T12" || upper === "ALL") return upper;
  return "YTD";
}

export function parseBasis(v: string | undefined): RevenueBasis {
  if (v === "booking" || v === "payout" || v === "stay") return v;
  return "stay";
}

export function periodLabel(p: Period): string {
  switch (p) {
    case "MTD":
      return "Month-to-date";
    case "YTD":
      return "Year-to-date";
    case "T12":
      return "Trailing 12 months";
    case "ALL":
      return "All time";
  }
}

function ymKey(y: number, m: number): number {
  return y * 100 + m;
}

export type PeriodWindow = {
  // inclusive bounds in YYYYMM form
  fromKey: number;
  toKey: number;
  // pretty label for subtitle
  label: string;
  // available nights inside the window (calendar days for full months, partial for current MTD)
  availableNights: number;
};

export function computeWindow(period: Period, today: Date): PeriodWindow {
  const y = today.getFullYear();
  const m = today.getMonth() + 1;
  if (period === "MTD") {
    // Historical source rows are monthly aggregates, not daily booking slices.
    // Use the full selected month denominator so occupancy cannot exceed 100%
    // when the current month has a full-month aggregate row.
    return {
      fromKey: ymKey(y, m),
      toKey: ymKey(y, m),
      label: `${monthName(m)} ${y}`,
      availableNights: daysInMonth(y, m),
    };
  }
  if (period === "YTD") {
    let nights = 0;
    for (let month = 1; month <= m; month++) nights += daysInMonth(y, month);
    return {
      fromKey: ymKey(y, 1),
      toKey: ymKey(y, m),
      label: `${y} YTD (Jan–${monthName(m)})`,
      availableNights: nights,
    };
  }
  if (period === "T12") {
    // Trailing 12 full months ending with current month
    const startMonth = m - 11;
    const startYear = y + Math.floor((startMonth - 1) / 12);
    const adjStart = ((startMonth - 1) % 12 + 12) % 12 + 1;
    let nights = 0;
    for (let i = 0; i < 12; i++) {
      const monthIdx = ((adjStart - 1 + i) % 12) + 1;
      const yr = startYear + Math.floor((adjStart - 1 + i) / 12);
      nights += daysInMonth(yr, monthIdx);
    }
    return {
      fromKey: ymKey(startYear, adjStart),
      toKey: ymKey(y, m),
      label: `Trailing 12 months (${monthName(adjStart)} ${startYear} – ${monthName(m)} ${y})`,
      availableNights: nights,
    };
  }
  // ALL
  return {
    fromKey: 0,
    toKey: 99999912,
    label: "All time",
    availableNights: 0, // computed from data
  };
}

export function priorWindow(period: Period, today: Date): PeriodWindow {
  if (period === "ALL") {
    // Prior year as comparison anchor
    const y = today.getFullYear() - 1;
    return {
      fromKey: ymKey(y, 1),
      toKey: ymKey(y, 12),
      label: `${y}`,
      availableNights: getAvailableNightsInYear(y),
    };
  }
  const prior = new Date(today);
  prior.setFullYear(prior.getFullYear() - 1);
  return computeWindow(period, prior);
}

export function filterMonthsByWindow(months: MonthlyAgg[], w: PeriodWindow): MonthlyAgg[] {
  return months.filter((m) => {
    const k = ymKey(m.year, m.month);
    return k >= w.fromKey && k <= w.toKey;
  });
}

export type ChannelKey =
  | "Direct"
  | "Airbnb"
  | "Luxe"
  | "VRBO"
  | "TripAdvisor"
  | "Booking.com"
  | "StayOne";

export type PeriodTotals = {
  bookedRevenue: number;
  totalNights: number;
  totalStays: number;
  channels: Record<ChannelKey, number>;
};

export function sumWindow(rows: MonthlyAgg[]): PeriodTotals {
  const totals: PeriodTotals = {
    bookedRevenue: 0,
    totalNights: 0,
    totalStays: 0,
    channels: {
      Direct: 0,
      Airbnb: 0,
      Luxe: 0,
      VRBO: 0,
      TripAdvisor: 0,
      "Booking.com": 0,
      StayOne: 0,
    },
  };
  for (const m of rows) {
    totals.bookedRevenue += m.bookedRevenue || 0;
    totals.totalNights += m.totalNights || 0;
    totals.totalStays += m.totalStays || 0;
    totals.channels.Direct += m.revenueDirect || 0;
    totals.channels.Airbnb += m.revenueAirbnb || 0;
    totals.channels.Luxe += m.revenueLuxe || 0;
    totals.channels.VRBO += m.revenueVrbo || 0;
    totals.channels.TripAdvisor += m.revenueTripadvisor || 0;
    totals.channels["Booking.com"] += m.revenueBookingcom || 0;
    totals.channels.StayOne += m.revenueStayone || 0;
  }
  return totals;
}

export function availableNightsForPeriod(
  period: Period,
  today: Date,
  months: MonthlyAgg[],
): number {
  if (period !== "ALL") return computeWindow(period, today).availableNights;
  // ALL: count calendar days for every distinct year that has any data
  const years = new Set<number>();
  for (const m of months) years.add(m.year);
  let total = 0;
  for (const y of years) total += getAvailableNightsInYear(y);
  return total;
}

function monthName(m: number): string {
  return ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][m - 1] || String(m);
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}
