import assert from "node:assert/strict";
import {
  findOpenPricingGaps,
  getPricingRecommendationForDate,
  summarizePricingStrategy,
  type PricingBooking,
} from "../lib/pricingStrategy";

const julyWeekend = getPricingRecommendationForDate("2026-07-10", 75);
assert.equal(julyWeekend.period, "July");
assert.equal(julyWeekend.nightType, "Weekend");
assert.equal(julyWeekend.recommendedMinStay, "3 nights");
assert.equal(julyWeekend.airbnbTarget, "$2,400–$3,100");
assert.equal(julyWeekend.directTarget, "$2,160–$2,945");

const septemberShoulder = getPricingRecommendationForDate("2026-09-15", 25);
assert.equal(septemberShoulder.period, "September");
assert.equal(septemberShoulder.nightType, "Weekday");
assert.equal(septemberShoulder.recommendedMinStay, "2 nights");
assert.match(septemberShoulder.action, /10–15%|2-night/i);

const thanksgiving = getPricingRecommendationForDate("2026-11-26", 120);
assert.equal(thanksgiving.period, "Thanksgiving");
assert.equal(thanksgiving.airbnbTarget, "$2,400–$2,900");
assert.equal(thanksgiving.recommendedMinStay, "4–5 nights");
assert.match(thanksgiving.action, /No discount/i);

const bookings: PricingBooking[] = [
  { id: "a", guestName: "Booked A", status: "booked", channel: "Airbnb", checkIn: "2026-07-01", checkOut: "2026-07-05" },
  { id: "b", guestName: "Booked B", status: "booked", channel: "Airbnb", checkIn: "2026-07-08", checkOut: "2026-07-15" },
  { id: "c", guestName: "Cancelled", status: "cancelled", channel: "Airbnb", checkIn: "2026-07-20", checkOut: "2026-07-24" },
];
const gaps = findOpenPricingGaps(bookings, "2026-07-01", "2026-07-16", new Date("2026-06-20T00:00:00Z"));
assert.deepEqual(
  gaps.map((g) => [g.start, g.end, g.nights, g.priority]),
  [["2026-07-05", "2026-07-08", 3, "high"]],
);
assert.match(gaps[0].recommendation.action, /10–15%|2-night/i);

const summary = summarizePricingStrategy(bookings, new Date("2026-06-20T00:00:00Z"));
assert.ok(summary.nextGaps.length > 0, "strategy summary should surface upcoming gaps");
assert.ok(summary.rateCards.some((r) => r.period === "Christmas / NYE"));

console.log("Pricing strategy tests passed");
