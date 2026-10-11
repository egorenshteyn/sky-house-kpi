import assert from "node:assert/strict";
import test from "node:test";
import { normalizeHospitableBooking } from "../lib/hospitable/normalize";

const dates = { arrival_date: "2026-10-22", departure_date: "2026-10-25" };

test("expired direct requests are cancelled for future and past stays", () => {
  for (const stay of [dates, { arrival_date: "2024-10-22", departure_date: "2024-10-25" }]) {
    const booking = normalizeHospitableBooking({
      id: "expired-request",
      code: "HOST-EXPIRED",
      platform: "direct",
      status: "expired",
      reservation_status: {
        current: { category: "not accepted", sub_category: "expired" },
        history: [{ category: "request" }, { category: "not accepted" }],
      },
      ...stay,
    });
    assert.equal(booking?.status, "cancelled");
  }
});

test("nested current status works without legacy status", () => {
  const booking = normalizeHospitableBooking({
    id: "nested-expired", ...dates,
    reservation_status: { current: { category: "not accepted", sub_category: "expired" } },
  });
  assert.equal(booking?.status, "cancelled");
});

test("accepted current status stays booked despite request history", () => {
  const booking = normalizeHospitableBooking({
    id: "accepted-replacement", ...dates, status: "accepted",
    reservation_status: {
      current: { category: "accepted" },
      history: [{ category: "request" }, { category: "not accepted" }],
    },
  });
  assert.equal(booking?.status, "booked");
});

test("legacy cancellation and pending statuses retain their mappings", () => {
  for (const [status, expected] of [
    ["cancelled", "cancelled"], ["declined", "cancelled"],
    ["rejected", "cancelled"], ["inquiry", "inquiry"],
    ["pending", "inquiry"], ["tentative", "inquiry"],
  ]) {
    assert.equal(normalizeHospitableBooking({ id: status, ...dates, status })?.status, expected);
  }
});

test("current cancellation and pending categories retain their mappings", () => {
  for (const [category, expected] of [
    ["cancelled", "cancelled"], ["declined", "cancelled"],
    ["rejected", "cancelled"], ["inquiry", "inquiry"],
    ["pending", "inquiry"],
  ]) {
    assert.equal(normalizeHospitableBooking({
      id: category, ...dates,
      reservation_status: { current: { category }, history: [{ category: "request" }] },
    })?.status, expected);
  }
});

test("owner stays and completed accepted stays retain their mappings", () => {
  assert.equal(normalizeHospitableBooking({ id: "owner", ...dates, owner_stay: true })?.status, "owner_block");
  assert.equal(normalizeHospitableBooking({
    id: "past-accepted", arrival_date: "2024-10-22", departure_date: "2024-10-25",
    reservation_status: { current: { category: "accepted" }, history: [{ category: "request" }] },
  })?.status, "completed");
});
