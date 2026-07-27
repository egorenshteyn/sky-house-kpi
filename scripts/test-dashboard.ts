/* eslint-disable no-console */
import {
  parsePeriod,
  parseBasis,
  computeWindow,
  priorWindow,
  filterMonthsByWindow,
  sumWindow,
  availableNightsForPeriod,
} from "../lib/dashboard";
import { getMonthlyForYear } from "../lib/queries";
import type { MonthlyAgg } from "../lib/queries";
import { getSqlite } from "../lib/db";

let passed = 0;
let failed = 0;

function check(label: string, cond: boolean, detail?: string) {
  if (cond) {
    passed++;
    console.log(`  ok  ${label}`);
  } else {
    failed++;
    console.error(`  FAIL ${label}${detail ? ` — ${detail}` : ""}`);
  }
}

function eq<T>(label: string, actual: T, expected: T) {
  check(label, actual === expected, `expected ${String(expected)} got ${String(actual)}`);
}

function approx(label: string, actual: number, expected: number) {
  check(label, Math.abs(actual - expected) < 0.005, `expected ${expected.toFixed(2)} got ${actual.toFixed(2)}`);
}

console.log("→ dashboard helpers");

eq("parsePeriod default", parsePeriod(undefined), "YTD");
eq("parsePeriod MTD", parsePeriod("mtd"), "MTD");
eq("parsePeriod T12", parsePeriod("T12"), "T12");
eq("parsePeriod ALL", parsePeriod("ALL"), "ALL");
eq("parsePeriod garbage", parsePeriod("xyz"), "YTD");

eq("parseBasis default", parseBasis(undefined), "stay");
eq("parseBasis booking", parseBasis("booking"), "booking");
eq("parseBasis payout", parseBasis("payout"), "payout");

const today = new Date(Date.UTC(2026, 4, 3)); // 2026-05-03 (May 3)

const ytd = computeWindow("YTD", today);
eq("YTD fromKey", ytd.fromKey, 202601);
eq("YTD toKey", ytd.toKey, 202605);

const mtd = computeWindow("MTD", today);
eq("MTD fromKey", mtd.fromKey, 202605);
eq("MTD toKey", mtd.toKey, 202605);
eq("MTD uses full month denominator for aggregate data", mtd.availableNights, 31);
eq("YTD uses full aggregate months", ytd.availableNights, 31 + 28 + 31 + 30 + 31);

const t12 = computeWindow("T12", today);
eq("T12 fromKey", t12.fromKey, 202506);
eq("T12 toKey", t12.toKey, 202605);
// 12 month nights span
check("T12 availableNights ~365", Math.abs(t12.availableNights - 365) <= 1, `got ${t12.availableNights}`);

const all = computeWindow("ALL", today);
eq("ALL fromKey", all.fromKey, 0);

const prior = priorWindow("YTD", today);
eq("priorYTD fromKey", prior.fromKey, 202501);
eq("priorYTD toKey", prior.toKey, 202505);

// filtering
const months: MonthlyAgg[] = [
  fakeMonth(2025, 1, { bookedRevenue: 1000, totalNights: 5, totalStays: 1, revenueAirbnb: 1000 }),
  fakeMonth(2025, 6, { bookedRevenue: 5000, totalNights: 12, totalStays: 2, revenueAirbnb: 4000, revenueDirect: 1000 }),
  fakeMonth(2026, 4, { bookedRevenue: 2000, totalNights: 6, totalStays: 1, revenueAirbnb: 2000 }),
  fakeMonth(2026, 5, { bookedRevenue: 3000, totalNights: 8, totalStays: 1, revenueDirect: 3000 }),
];

const ytdRows = filterMonthsByWindow(months, ytd);
eq("YTD rows count", ytdRows.length, 2);
const ytdSum = sumWindow(ytdRows);
eq("YTD revenue", ytdSum.bookedRevenue, 5000);
eq("YTD direct", ytdSum.channels.Direct, 3000);
eq("YTD airbnb", ytdSum.channels.Airbnb, 2000);

const t12Rows = filterMonthsByWindow(months, t12);
eq("T12 rows count", t12Rows.length, 3); // 2025-06, 2026-04, 2026-05
eq("T12 revenue", sumWindow(t12Rows).bookedRevenue, 10000);

const allRows = filterMonthsByWindow(months, all);
eq("ALL rows count", allRows.length, 4);

const allNights = availableNightsForPeriod("ALL", today, months);
eq("ALL available nights", allNights, 365 + 365); // 2025+2026

console.log("\n→ dashboard monthly revenue source");

const dashboard2026 = getMonthlyForYear(2026);
const dashboard2026JanJul = dashboard2026.filter((m) => m.month <= 7);
const dashboard2026Totals = sumWindow(dashboard2026);
const dashboard2026JanJulTotals = sumWindow(dashboard2026JanJul);

approx("2026 Jan-Jul revenue uses real bookings by check-in month", dashboard2026JanJulTotals.bookedRevenue, 127333.44);
approx("2026 full-year revenue uses real bookings by check-in month", dashboard2026Totals.bookedRevenue, 190816.62);
approx("2026 Airbnb channel revenue matches booking-derived total", dashboard2026Totals.channels.Airbnb, 190816.62);
approx("2026 channel breakdown agrees with total revenue", channelSum(dashboard2026Totals.channels), dashboard2026Totals.bookedRevenue);

const imported2026 = getSqlite()
  .prepare(
    `SELECT
       ROUND(SUM(CASE WHEN month <= 7 THEN COALESCE(booked_revenue, 0) ELSE 0 END), 2) AS janJul,
       ROUND(SUM(COALESCE(booked_revenue, 0)), 2) AS fullYear
     FROM monthly_aggregates
     WHERE year = 2026`,
  )
  .get() as { janJul: number; fullYear: number };
approx("fixture still contains stale imported 2026 Jan-Jul revenue", imported2026.janJul, 74945);
check(
  "dashboard no longer exposes stale imported 2026 revenue",
  Math.abs(dashboard2026JanJulTotals.bookedRevenue - imported2026.janJul) > 0.005,
  `got ${dashboard2026JanJulTotals.bookedRevenue.toFixed(2)}`,
);

const dashboard2025 = getMonthlyForYear(2025);
const raw2025 = getSqlite()
  .prepare(
    `SELECT id, year, month, total_stays as totalStays, total_nights as totalNights,
            occupancy_rate as occupancyRate, booked_revenue as bookedRevenue,
            cumulative_annual_revenue as cumulativeAnnualRevenue,
            total_cumulative_revenue as totalCumulativeRevenue,
            revenue_direct as revenueDirect, revenue_airbnb as revenueAirbnb,
            revenue_luxe as revenueLuxe, revenue_vrbo as revenueVrbo,
            revenue_tripadvisor as revenueTripadvisor,
            revenue_bookingcom as revenueBookingcom,
            revenue_stayone as revenueStayone, notes
     FROM monthly_aggregates
     WHERE year = 2025
     ORDER BY year, month`,
  )
  .all() as MonthlyAgg[];
eq("pre-2026 monthly row count remains imported aggregate count", dashboard2025.length, raw2025.length);
approx("pre-2026 revenue remains imported monthly aggregate revenue", sumWindow(dashboard2025).bookedRevenue, sumWindow(raw2025).bookedRevenue);

console.log(`\n${passed} passed, ${failed} failed.`);
if (failed > 0) process.exit(1);

function fakeMonth(year: number, month: number, partial: Partial<MonthlyAgg>): MonthlyAgg {
  return {
    id: `${year}-${month}`,
    year,
    month,
    totalStays: 0,
    totalNights: 0,
    occupancyRate: 0,
    bookedRevenue: 0,
    cumulativeAnnualRevenue: 0,
    totalCumulativeRevenue: 0,
    revenueDirect: 0,
    revenueAirbnb: 0,
    revenueLuxe: 0,
    revenueVrbo: 0,
    revenueTripadvisor: 0,
    revenueBookingcom: 0,
    revenueStayone: 0,
    notes: null,
    ...partial,
  };
}

function channelSum(channels: ReturnType<typeof sumWindow>["channels"]): number {
  return Object.values(channels).reduce((acc, value) => acc + value, 0);
}
