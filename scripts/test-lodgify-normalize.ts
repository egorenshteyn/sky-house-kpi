import assert from "node:assert/strict";
import { normalizeLodgifyBooking } from "../lib/lodgify/normalize";

function fixture(overrides: Record<string, unknown> = {}) {
  return {
    id: 18020995,
    arrival: "2026-09-24",
    departure: "2026-09-28",
    status: "Open",
    source: "Manual",
    source_text: "VRBO",
    amount_paid: 0,
    total_amount: 9488,
    external_booking: null,
    rooms: [{ guest_breakdown: { adults: 5, children: 0, pets: 0 } }],
    guest: { name: "Test Guest" },
    ...overrides,
  };
}

const expired = normalizeLodgifyBooking(
  fixture({ quote: { status: "ExpiredByGuest" } }),
);
assert.equal(expired?.status, "cancelled", "expired Lodgify quotes must be cancelled");
assert.equal(expired?.grossRevenue, 0, "expired unpaid quotes must not count as revenue");
assert.equal(expired?.netPayout, 0, "expired unpaid quotes must not count as payout");

const openUnpaid = normalizeLodgifyBooking(
  fixture({ id: 18020996, quote: { status: "Open" } }),
);
assert.equal(openUnpaid?.status, "inquiry", "open unpaid manual quotes must remain inquiries");

const confirmed = normalizeLodgifyBooking(
  fixture({
    id: 18020997,
    status: "Booked",
    amount_paid: 4744,
    external_booking: { id: "vrbo-confirmed" },
    quote: { status: "Accepted" },
  }),
);
assert.equal(confirmed?.status, "booked", "confirmed Lodgify bookings must remain booked");

console.log("Lodgify normalization regression tests passed");
