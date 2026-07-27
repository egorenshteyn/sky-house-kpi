import assert from "node:assert/strict";
import type { BookingRow } from "../lib/queries";
import { getCalendarMonthSummary } from "../lib/calendar-summary";

function booking(id: string, overrides: Partial<BookingRow>): BookingRow {
  return {
    id,
    guestName: null,
    guestPhone: null,
    guestEmail: null,
    channel: null,
    status: null,
    checkIn: null,
    checkOut: null,
    nights: null,
    grossRevenue: null,
    netPayout: null,
    avgNightlyRate: null,
    numAdults: null,
    internalNotes: null,
    bookingCreatedDate: null,
    ...overrides,
  };
}

const summary = getCalendarMonthSummary(
  [
    booking("carry-in-block", {
      status: "owner_block",
      checkIn: "2025-12-30",
      checkOut: "2026-01-03",
    }),
    booking("in-month-block", {
      status: "maintenance_block",
      checkIn: "2026-01-20",
      checkOut: "2026-01-22",
    }),
    booking("ends-at-month-start", {
      status: "owner_block",
      checkIn: "2025-12-30",
      checkOut: "2026-01-01",
    }),
    booking("starts-at-next-month", {
      status: "owner_block",
      checkIn: "2026-02-01",
      checkOut: "2026-02-02",
    }),
    booking("january-stay", {
      status: "booked",
      checkIn: "2026-01-10",
      checkOut: "2026-01-12",
      grossRevenue: 2400,
    }),
    booking("carry-in-stay", {
      status: "completed",
      checkIn: "2025-12-29",
      checkOut: "2026-01-04",
      grossRevenue: 6000,
    }),
  ],
  2026,
  1,
);

assert.equal(summary.stays.length, 1, "stays remain based on check-ins during the month");
assert.equal(summary.stays[0]?.id, "january-stay");
assert.equal(summary.blocks.length, 2, "blocks count when any blocked night overlaps the month");
assert.deepEqual(
  summary.blocks.map((row) => row.id),
  ["carry-in-block", "in-month-block"],
);
assert.equal(summary.revenue, 2400, "revenue remains based on in-month stay check-ins");

console.log("Calendar month summary tests passed");
