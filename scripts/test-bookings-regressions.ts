import assert from "node:assert/strict";
import Database from "better-sqlite3";
import { formatBookingDate } from "../lib/format";
import { findLegacyLodgifyDuplicateId } from "../lib/hospitable/import";
import { hasCanonicalHospitableBooking } from "../lib/lodgify/import";
import { normalizeHospitableBooking, type NormalizedHospitableBooking } from "../lib/hospitable/normalize";
import { normalizeLodgifyBooking, type NormalizedLodgifyBooking } from "../lib/lodgify/normalize";

const sqlite = new Database(":memory:");
sqlite.exec(`
  CREATE TABLE bookings (
    id TEXT PRIMARY KEY,
    property_id TEXT,
    channel_confirmation_code TEXT,
    status TEXT,
    guest_name TEXT,
    check_in TEXT,
    check_out TEXT,
    internal_notes TEXT,
    tags TEXT
  );
`);

assert.equal(
  normalizeLodgifyBooking({
    id: "20536386",
    arrival: "2026-05-22",
    departure: "2026-05-25",
    source_text: '{"confirmationCode":"HMXYWKMT2D","isMarkedAsManual":true}',
  })?.platformConfirmationCode,
  "HMXYWKMT2D",
);
assert.equal(
  normalizeHospitableBooking({
    id: "reservation-1",
    arrival_date: "2026-05-22",
    departure_date: "2026-05-25",
    code: "HMXYWKMT2D",
  })?.platformConfirmationCode,
  "HMXYWKMT2D",
);

sqlite.prepare(`INSERT INTO bookings VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
  "legacy-duplicate",
  "skyhouse-dillon-beach",
  "lodgify:20536386",
  "cancelled",
  "Thomas Lee",
  "2026-05-22",
  "2026-05-25",
  'Imported from Lodgify booking 20536386 ({"confirmationCode":"HMXYWKMT2D"}).',
  '["lodgify","airbnb"]',
);
sqlite.prepare(`INSERT INTO bookings VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
  "standalone-cancellation",
  "skyhouse-dillon-beach",
  "lodgify:99999999",
  "cancelled",
  "Different Guest",
  "2026-05-22",
  "2026-05-25",
  'Imported from Lodgify booking 99999999 ({"confirmationCode":"OTHER123"}).',
  '["lodgify","airbnb"]',
);

const canonical = {
  propertyId: "skyhouse-dillon-beach",
  guestName: "Thomas Lee",
  checkIn: "2026-05-22",
  checkOut: "2026-05-25",
  platformConfirmationCode: "HMXYWKMT2D",
} as NormalizedHospitableBooking;

assert.equal(
  findLegacyLodgifyDuplicateId(sqlite, canonical),
  "legacy-duplicate",
  "Hospitable import should reconcile the exact legacy Lodgify cancellation",
);

sqlite.prepare(`INSERT INTO bookings VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
  "canonical",
  "skyhouse-dillon-beach",
  "hospitable:reservation-1",
  "booked",
  "Thomas Lee",
  "2026-05-22",
  "2026-05-25",
  "Imported from Hospitable reservation HMXYWKMT2D.",
  '["hospitable","airbnb"]',
);

const legacy = {
  propertyId: "skyhouse-dillon-beach",
  guestName: "Thomas Lee",
  checkIn: "2026-05-22",
  checkOut: "2026-05-25",
  platformConfirmationCode: "HMXYWKMT2D",
} as NormalizedLodgifyBooking;

assert.equal(
  hasCanonicalHospitableBooking(sqlite, legacy),
  true,
  "Lodgify import should not recreate a legacy row when its Hospitable canonical exists",
);
assert.equal(
  hasCanonicalHospitableBooking(sqlite, { ...legacy, platformConfirmationCode: "OTHER123" }),
  false,
  "unrelated standalone cancellations must not be suppressed",
);

assert.equal(formatBookingDate("2026-05-22"), "May 22, 2026");
assert.equal(formatBookingDate(""), "—");
assert.equal(formatBookingDate("not-a-date"), "not-a-date");

sqlite.close();
console.log("Bookings regression tests passed");
