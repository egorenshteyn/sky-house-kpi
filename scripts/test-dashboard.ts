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
import type { MonthlyAgg } from "../lib/queries";

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
