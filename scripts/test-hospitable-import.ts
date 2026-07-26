import assert from "node:assert/strict";
import { isHospitableBookingUnchanged } from "../lib/hospitable/import";
import type { NormalizedHospitableBooking } from "../lib/hospitable/normalize";

const booking: NormalizedHospitableBooking = {
  externalId: "res-1",
  channelConfirmationCode: "hospitable:res-1",
  platformConfirmationCode: "ABC",
  propertyId: "skyhouse-dillon-beach",
  channel: "Airbnb",
  status: "booked",
  guestName: "Jane Guest",
  guestPhone: "15555550123",
  guestEmail: null,
  guestLocation: "San Francisco, CA",
  numAdults: 2,
  numChildren: 1,
  numPets: 0,
  checkIn: "2026-07-01",
  checkOut: "2026-07-04",
  nights: 3,
  bookingCreatedDate: "2026-05-20",
  grossRevenue: 4500,
  cleaningFee: 595,
  petFee: 0,
  platformFees: 675,
  taxes: 600,
  netPayout: 3825,
  avgNightlyRate: 1500,
  internalNotes: "Imported from Hospitable reservation ABC.",
  tags: JSON.stringify(["hospitable", "airbnb"]),
  warnings: [],
  rawStatus: "accepted",
};

const existing = {
  propertyId: booking.propertyId,
  channel: booking.channel,
  status: booking.status,
  guestName: booking.guestName,
  guestPhone: booking.guestPhone,
  guestEmail: booking.guestEmail,
  guestLocation: booking.guestLocation,
  numAdults: booking.numAdults,
  numChildren: booking.numChildren,
  numPets: booking.numPets,
  checkIn: booking.checkIn,
  checkOut: booking.checkOut,
  nights: booking.nights,
  bookingCreatedDate: booking.bookingCreatedDate,
  grossRevenue: booking.grossRevenue,
  cleaningFee: booking.cleaningFee,
  petFee: booking.petFee,
  platformFees: booking.platformFees,
  taxes: booking.taxes,
  netPayout: booking.netPayout,
  avgNightlyRate: booking.avgNightlyRate,
  tags: booking.tags,
};

assert.equal(isHospitableBookingUnchanged(existing, booking), true, "identical imported booking should be skipped");
assert.equal(
  isHospitableBookingUnchanged({ ...existing, checkOut: "2026-07-05" }, booking),
  false,
  "date changes must still update the booking",
);
assert.equal(
  isHospitableBookingUnchanged({ ...existing, netPayout: 3000 }, booking),
  false,
  "financial changes must still update the booking",
);

console.log("Hospitable import tests passed");
