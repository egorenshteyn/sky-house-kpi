import type { Database } from "better-sqlite3";
import { randomUUID } from "crypto";
import { fetchAllHospitableReservations } from "./client";
import { normalizeHospitableBooking, overlapsDateRange, type NormalizedHospitableBooking } from "./normalize";
import { findOrCreateGuest } from "../guests";

export type HospitableSyncSummary = {
  batchId: string;
  fetched: number;
  created: number;
  updated: number;
  skipped: number;
  errors: string[];
  from: string;
  to: string;
};

type ExistingHospitableBooking = {
  propertyId: string | null;
  channel: string | null;
  status: string | null;
  guestName: string | null;
  guestPhone: string | null;
  guestEmail: string | null;
  guestLocation: string | null;
  numAdults: number | null;
  numChildren: number | null;
  numPets: number | null;
  checkIn: string | null;
  checkOut: string | null;
  nights: number | null;
  bookingCreatedDate: string | null;
  grossRevenue: number | null;
  cleaningFee: number | null;
  petFee: number | null;
  platformFees: number | null;
  taxes: number | null;
  netPayout: number | null;
  avgNightlyRate: number | null;
  tags: string | null;
};

type CrossSourceBooking = {
  id: string;
  internalNotes: string | null;
};

function lodgifyPlatformConfirmationCode(internalNotes: string | null) {
  return internalNotes?.match(/["']confirmationCode["']\s*:\s*["']([^"']+)["']/i)?.[1]?.trim() || null;
}

export function findLegacyLodgifyDuplicateId(sqlite: Database, booking: NormalizedHospitableBooking) {
  if (!booking.platformConfirmationCode || !booking.guestName) return null;

  const candidates = sqlite
    .prepare(
      `SELECT id, internal_notes AS internalNotes
       FROM bookings
       WHERE property_id = ?
         AND status = 'cancelled'
         AND channel_confirmation_code LIKE 'lodgify:%'
         AND lower(trim(guest_name)) = lower(trim(?))
         AND check_in = ?
         AND check_out = ?`,
    )
    .all(booking.propertyId, booking.guestName, booking.checkIn, booking.checkOut) as CrossSourceBooking[];

  const exactMatches = candidates.filter(
    (candidate) => lodgifyPlatformConfirmationCode(candidate.internalNotes) === booking.platformConfirmationCode,
  );
  return exactMatches.length === 1 ? exactMatches[0].id : null;
}

function sameNumber(a: number | null | undefined, b: number | null | undefined) {
  return Math.abs(Number(a || 0) - Number(b || 0)) < 0.005;
}

function sameString(a: string | null | undefined, b: string | null | undefined) {
  return (a || "") === (b || "");
}

export function isHospitableBookingUnchanged(existing: ExistingHospitableBooking, booking: NormalizedHospitableBooking) {
  return (
    sameString(existing.propertyId, booking.propertyId) &&
    sameString(existing.channel, booking.channel) &&
    sameString(existing.status, booking.status) &&
    sameString(existing.guestName, booking.guestName) &&
    sameString(existing.guestPhone, booking.guestPhone) &&
    sameString(existing.guestEmail, booking.guestEmail) &&
    sameString(existing.guestLocation, booking.guestLocation) &&
    sameNumber(existing.numAdults, booking.numAdults) &&
    sameNumber(existing.numChildren, booking.numChildren) &&
    sameNumber(existing.numPets, booking.numPets) &&
    sameString(existing.checkIn, booking.checkIn) &&
    sameString(existing.checkOut, booking.checkOut) &&
    sameNumber(existing.nights, booking.nights) &&
    sameString(existing.bookingCreatedDate, booking.bookingCreatedDate) &&
    sameNumber(existing.grossRevenue, booking.grossRevenue) &&
    sameNumber(existing.cleaningFee, booking.cleaningFee) &&
    sameNumber(existing.petFee, booking.petFee) &&
    sameNumber(existing.platformFees, booking.platformFees) &&
    sameNumber(existing.taxes, booking.taxes) &&
    sameNumber(existing.netPayout, booking.netPayout) &&
    sameNumber(existing.avgNightlyRate, booking.avgNightlyRate) &&
    sameString(existing.tags, booking.tags)
  );
}

function defaultFrom() {
  const d = new Date();
  d.setUTCFullYear(d.getUTCFullYear() - 1);
  return d.toISOString().slice(0, 10);
}

function defaultTo() {
  const d = new Date();
  d.setUTCMonth(d.getUTCMonth() + 18);
  return d.toISOString().slice(0, 10);
}

export function defaultHospitableSyncRange() {
  return { from: defaultFrom(), to: defaultTo() };
}

function insertBooking(sqlite: Database, booking: NormalizedHospitableBooking, batchId: string) {
  const now = new Date().toISOString();
  const guestId = findOrCreateGuest(sqlite, {
    guestName: booking.guestName,
    guestPhone: booking.guestPhone,
    guestEmail: booking.guestEmail,
    guestLocation: booking.guestLocation,
    channel: booking.channel,
  });

  sqlite
    .prepare(
      `INSERT INTO bookings (
        id, property_id, channel, channel_confirmation_code, status, guest_id,
        guest_name, guest_phone, guest_email, guest_location,
        num_adults, num_children, num_pets, check_in, check_out, nights,
        booking_created_date, gross_revenue, cleaning_fee, pet_fee, platform_fees,
        taxes, net_payout, avg_nightly_rate, internal_notes, tags,
        import_confidence, import_batch_id, created_at, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?
      )`,
    )
    .run(
      randomUUID(),
      booking.propertyId,
      booking.channel,
      booking.channelConfirmationCode,
      booking.status,
      guestId,
      booking.guestName,
      booking.guestPhone,
      booking.guestEmail,
      booking.guestLocation,
      booking.numAdults,
      booking.numChildren,
      booking.numPets,
      booking.checkIn,
      booking.checkOut,
      booking.nights,
      booking.bookingCreatedDate,
      booking.grossRevenue,
      booking.cleaningFee,
      booking.petFee,
      booking.platformFees,
      booking.taxes,
      booking.netPayout,
      booking.avgNightlyRate,
      booking.internalNotes,
      booking.tags,
      1,
      batchId,
      now,
      now,
    );
}

function updateBooking(sqlite: Database, booking: NormalizedHospitableBooking, batchId: string, existingId: string) {
  const now = new Date().toISOString();
  const guestId = findOrCreateGuest(sqlite, {
    guestName: booking.guestName,
    guestPhone: booking.guestPhone,
    guestEmail: booking.guestEmail,
    guestLocation: booking.guestLocation,
    channel: booking.channel,
  });

  sqlite
    .prepare(
      `UPDATE bookings SET
        property_id = ?, channel = ?, channel_confirmation_code = ?, status = ?, guest_id = ?,
        guest_name = ?, guest_phone = ?, guest_email = ?, guest_location = ?,
        num_adults = ?, num_children = ?, num_pets = ?, check_in = ?, check_out = ?, nights = ?,
        booking_created_date = ?, gross_revenue = ?, cleaning_fee = ?, pet_fee = ?, platform_fees = ?,
        taxes = ?, net_payout = ?, avg_nightly_rate = ?,
        internal_notes = CASE
          WHEN internal_notes IS NULL OR internal_notes = '' OR internal_notes LIKE 'Imported from Lodgify booking %' OR internal_notes LIKE 'Imported from Hospitable reservation %'
          THEN ?
          ELSE internal_notes
        END,
        tags = ?, import_confidence = ?, import_batch_id = ?, updated_at = ?
       WHERE id = ?`,
    )
    .run(
      booking.propertyId,
      booking.channel,
      booking.channelConfirmationCode,
      booking.status,
      guestId,
      booking.guestName,
      booking.guestPhone,
      booking.guestEmail,
      booking.guestLocation,
      booking.numAdults,
      booking.numChildren,
      booking.numPets,
      booking.checkIn,
      booking.checkOut,
      booking.nights,
      booking.bookingCreatedDate,
      booking.grossRevenue,
      booking.cleaningFee,
      booking.petFee,
      booking.platformFees,
      booking.taxes,
      booking.netPayout,
      booking.avgNightlyRate,
      booking.internalNotes,
      booking.tags,
      1,
      batchId,
      now,
      existingId,
    );
}

export async function syncHospitableReservations(
  sqlite: Database,
  range: { from?: string; to?: string } = {},
): Promise<HospitableSyncSummary> {
  const { from: defaultRangeFrom, to: defaultRangeTo } = defaultHospitableSyncRange();
  const from = range.from || defaultRangeFrom;
  const to = range.to || defaultRangeTo;
  const batchId = randomUUID();
  const errors: string[] = [];
  let created = 0;
  let updated = 0;
  let skipped = 0;

  const rawBookings = await fetchAllHospitableReservations({ start_date: from, end_date: to, include: "guest,financials" });

  const tx = sqlite.transaction((items: unknown[]) => {
    for (const item of items) {
      const booking = normalizeHospitableBooking(item);
      if (!booking) {
        skipped += 1;
        errors.push("Skipped Hospitable record with missing id or dates");
        continue;
      }
      if (!overlapsDateRange(booking, from, to)) {
        skipped += 1;
        continue;
      }
      if (booking.warnings.length) errors.push(`${booking.channelConfirmationCode}: ${booking.warnings.join(", ")}`);

      const existing = sqlite
        .prepare(
          `SELECT id,
                  property_id as propertyId, channel, status,
                  guest_name as guestName, guest_phone as guestPhone,
                  guest_email as guestEmail, guest_location as guestLocation,
                  num_adults as numAdults, num_children as numChildren, num_pets as numPets,
                  check_in as checkIn, check_out as checkOut, nights,
                  booking_created_date as bookingCreatedDate,
                  gross_revenue as grossRevenue, cleaning_fee as cleaningFee, pet_fee as petFee,
                  platform_fees as platformFees, taxes, net_payout as netPayout,
                  avg_nightly_rate as avgNightlyRate, tags
           FROM bookings WHERE channel_confirmation_code = ? LIMIT 1`,
        )
        .get(booking.channelConfirmationCode) as (ExistingHospitableBooking & { id: string }) | undefined;

      if (existing) {
        if (isHospitableBookingUnchanged(existing, booking)) {
          skipped += 1;
          continue;
        }
        updateBooking(sqlite, booking, batchId, existing.id);
        updated += 1;
      } else {
        const legacyDuplicateId = findLegacyLodgifyDuplicateId(sqlite, booking);
        if (legacyDuplicateId) {
          updateBooking(sqlite, booking, batchId, legacyDuplicateId);
          updated += 1;
        } else {
          insertBooking(sqlite, booking, batchId);
          created += 1;
        }
      }
    }
  });

  tx(rawBookings);

  if (created + updated > 0 || errors.length > 0) {
    sqlite
      .prepare(
        `INSERT INTO import_batches (id, source_type, source_file, imported_at, records_created, errors, reviewed)
         VALUES (?, ?, ?, CURRENT_TIMESTAMP, ?, ?, ?)`,
      )
      .run(
        batchId,
        "hospitable_api",
        `/v2/reservations ${from}..${to}`,
        created + updated,
        errors.length ? JSON.stringify(errors.slice(0, 50)) : null,
        0,
      );
  }

  return { batchId, fetched: rawBookings.length, created, updated, skipped, errors, from, to };
}
