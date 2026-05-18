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

function updateBooking(sqlite: Database, booking: NormalizedHospitableBooking, batchId: string) {
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
        property_id = ?, channel = ?, status = ?, guest_id = ?,
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
       WHERE channel_confirmation_code = ?`,
    )
    .run(
      booking.propertyId,
      booking.channel,
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
      booking.channelConfirmationCode,
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

  sqlite
    .prepare(
      `INSERT INTO import_batches (id, source_type, source_file, imported_at, records_created, errors, reviewed)
       VALUES (?, ?, ?, CURRENT_TIMESTAMP, ?, ?, ?)`,
    )
    .run(batchId, "hospitable_api", `/v2/reservations ${from}..${to}`, 0, null, 0);

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
        .prepare(`SELECT id FROM bookings WHERE channel_confirmation_code = ? LIMIT 1`)
        .get(booking.channelConfirmationCode) as { id: string } | undefined;

      if (existing) {
        updateBooking(sqlite, booking, batchId);
        updated += 1;
      } else {
        insertBooking(sqlite, booking, batchId);
        created += 1;
      }
    }
  });

  tx(rawBookings);

  sqlite
    .prepare(`UPDATE import_batches SET records_created = ?, errors = ? WHERE id = ?`)
    .run(created + updated, errors.length ? JSON.stringify(errors.slice(0, 50)) : null, batchId);

  return { batchId, fetched: rawBookings.length, created, updated, skipped, errors, from, to };
}
