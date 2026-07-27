import assert from "node:assert/strict";
import type { BookingRow } from "../lib/queries";
import {
  filterAndSortBookings,
  parseBookingSort,
  type BookingSortKey,
} from "../lib/booking-list";

function booking(id: string, overrides: Partial<BookingRow> = {}): BookingRow {
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

const populated = [
  booking("charlie", {
    guestName: "Charlie",
    channel: "VRBO",
    status: "completed",
    bookingCreatedDate: "2026-03-01",
    checkIn: "2026-06-10",
    checkOut: "2026-06-14",
    nights: 4,
    grossRevenue: 4000,
    avgNightlyRate: 1000,
  }),
  booking("alpha", {
    guestName: "Alpha",
    channel: "Airbnb",
    status: "booked",
    bookingCreatedDate: "2026-01-01",
    checkIn: "2026-04-10",
    checkOut: "2026-04-12",
    nights: 2,
    grossRevenue: 3000,
    avgNightlyRate: 1500,
  }),
];

const expectedAscending: Record<BookingSortKey, string[]> = {
  guest: ["alpha", "charlie"],
  channel: ["alpha", "charlie"],
  status: ["alpha", "charlie"],
  bookingDate: ["alpha", "charlie"],
  checkIn: ["alpha", "charlie"],
  checkOut: ["alpha", "charlie"],
  nights: ["alpha", "charlie"],
  revenue: ["alpha", "charlie"],
  adr: ["charlie", "alpha"],
};

for (const key of Object.keys(expectedAscending) as BookingSortKey[]) {
  const ascending = filterAndSortBookings(populated, {}, key, "asc").map((row) => row.id);
  assert.deepEqual(ascending, expectedAscending[key], `${key} should sort ascending`);
  const descending = filterAndSortBookings(populated, {}, key, "desc").map((row) => row.id);
  assert.deepEqual(descending, [...expectedAscending[key]].reverse(), `${key} should sort descending`);
}

const filtered = filterAndSortBookings(
  [
    booking("excluded-channel", { guestName: "Amy", channel: "VRBO", status: "booked", nights: 1 }),
    booking("excluded-status", { guestName: "Ben", channel: "Airbnb", status: "cancelled", nights: 2 }),
    booking("second", { guestName: "Zoë Search", channel: "Airbnb", status: "booked", nights: 3 }),
    booking("first", { guestEmail: "search@example.com", channel: "Airbnb", status: "booked", nights: 1 }),
  ],
  { q: "search", channel: "Airbnb", status: "booked" },
  "nights",
  "asc",
);
assert.deepEqual(
  filtered.map((row) => row.id),
  ["first", "second"],
  "sorting should apply to the filtered rows",
);

for (const direction of ["asc", "desc"] as const) {
  const withNulls = filterAndSortBookings(
    [booking("null-b"), booking("value", { guestName: "Guest" }), booking("null-a")],
    {},
    "guest",
    direction,
  );
  assert.deepEqual(
    withNulls.map((row) => row.id),
    ["value", "null-a", "null-b"],
    `nulls should remain last with an id tie-breaker when sorting ${direction}`,
  );
}

assert.deepEqual(parseBookingSort({ sort: "revenue", direction: "asc" }), {
  sortKey: "revenue",
  direction: "asc",
});
assert.deepEqual(
  parseBookingSort({ sort: "unsupported", direction: "sideways" }),
  { sortKey: "checkIn", direction: "desc" },
  "invalid query values should use the stable default sort",
);

console.log("Bookings list sorting tests passed");
