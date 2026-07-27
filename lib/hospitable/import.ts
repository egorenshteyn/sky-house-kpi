import type { Database } from "better-sqlite3";
import { createHash, randomUUID } from "crypto";
import { fetchAllHospitableCalendars, fetchAllHospitableReservations } from "./client";
import { normalizeHospitableBooking, overlapsDateRange, type NormalizedHospitableBooking } from "./normalize";
import { findOrCreateGuest } from "../guests";

export type HospitableSyncSummary = {
  batchId: string;
  fetched: number;
  created: number;
  updated: number;
  skipped: number;
  calendarDaysFetched: number;
  blocksFound: number;
  blocksCreated: number;
  blocksUpdated: number;
  blocksSkipped: number;
  blocksRemoved: number;
  errors: string[];
  from: string;
  to: string;
};

export type NormalizedHospitableCalendarBlock = {
  channelConfirmationCode: string;
  propertyId: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  sourceType: string | null;
  source: string | null;
  label: string;
  internalNotes: string;
  tags: string;
};

type CalendarDay = {
  date: string;
  sourceType: string | null;
  source: string | null;
};

const APP_PROPERTY_ID = "skyhouse-dillon-beach";
const HOSPITABLE_BLOCK_KEY_PREFIX = "hospitable:block:";

function dateOnly(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(value.trim());
  return match?.[1] || null;
}

function addUtcDays(date: string, days: number) {
  const result = new Date(`${date}T00:00:00Z`);
  result.setUTCDate(result.getUTCDate() + days);
  return result.toISOString().slice(0, 10);
}

function metadataString(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "string") return value.trim() || null;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b));
    return JSON.stringify(Object.fromEntries(entries));
  }
  return String(value);
}

function generatedBlockKey(propertyId: string, day: CalendarDay, checkIn: string, checkOut: string) {
  const identity = JSON.stringify([propertyId, day.sourceType, day.source, checkIn, checkOut]);
  return `${HOSPITABLE_BLOCK_KEY_PREFIX}${createHash("sha256").update(identity).digest("hex").slice(0, 24)}`;
}

function blockLabel(day: CalendarDay) {
  const detail = day.source || day.sourceType;
  return detail ? `Blocked — ${detail}` : "Blocked — Hospitable";
}

export function normalizeHospitableCalendarBlocks(
  hospitablePropertyId: string,
  rawDays: unknown[],
): NormalizedHospitableCalendarBlock[] {
  const days = rawDays
    .flatMap<CalendarDay>((raw) => {
      if (!raw || typeof raw !== "object" || Array.isArray(raw)) return [];
      const record = raw as Record<string, unknown>;
      const status = record.status;
      if (!status || typeof status !== "object" || Array.isArray(status)) return [];
      const statusRecord = status as Record<string, unknown>;
      const date = dateOnly(record.date);
      if (!date || statusRecord.available !== false || String(statusRecord.reason || "").toUpperCase() !== "BLOCKED") {
        return [];
      }
      return [{
        date,
        sourceType: metadataString(statusRecord.source_type),
        source: metadataString(statusRecord.source),
      }];
    })
    .sort((a, b) => a.date.localeCompare(b.date));

  const groups: CalendarDay[][] = [];
  for (const day of days) {
    const current = groups.at(-1);
    const previous = current?.at(-1);
    if (
      current && previous && addUtcDays(previous.date, 1) === day.date &&
      previous.sourceType === day.sourceType && previous.source === day.source
    ) {
      current.push(day);
    } else {
      groups.push([day]);
    }
  }

  return groups.map((group) => {
    const first = group[0];
    const checkIn = first.date;
    const checkOut = addUtcDays(group[group.length - 1].date, 1);
    const label = blockLabel(first);
    return {
      channelConfirmationCode: generatedBlockKey(hospitablePropertyId, first, checkIn, checkOut),
      propertyId: APP_PROPERTY_ID,
      checkIn,
      checkOut,
      nights: group.length,
      sourceType: first.sourceType,
      source: first.source,
      label,
      internalNotes: `Generated from Hospitable calendar block (${first.sourceType || "unknown source type"}${first.source ? `: ${first.source}` : ""}).`,
      tags: JSON.stringify(["hospitable", "calendar-block"]),
    };
  });
}

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

type ExistingHospitableBlock = {
  id: string;
  channelConfirmationCode: string;
  propertyId: string | null;
  channel: string | null;
  status: string | null;
  guestId: string | null;
  guestName: string | null;
  checkIn: string | null;
  checkOut: string | null;
  nights: number | null;
  grossRevenue: number | null;
  netPayout: number | null;
  internalNotes: string | null;
  tags: string | null;
};

function isHospitableBlockUnchanged(existing: ExistingHospitableBlock, block: NormalizedHospitableCalendarBlock) {
  return existing.propertyId === block.propertyId && existing.channel === "Hospitable" && existing.status === "owner_block" &&
    existing.guestId === null && existing.guestName === block.label && existing.checkIn === block.checkIn &&
    existing.checkOut === block.checkOut && existing.nights === block.nights && sameNumber(existing.grossRevenue, 0) &&
    sameNumber(existing.netPayout, 0) && existing.internalNotes === block.internalNotes && existing.tags === block.tags;
}

function hasSameHospitableBlockMetadata(existing: ExistingHospitableBlock, block: NormalizedHospitableCalendarBlock) {
  return existing.propertyId === block.propertyId && existing.guestName === block.label &&
    existing.internalNotes === block.internalNotes && existing.tags === block.tags;
}

function residualBlockKey(existing: ExistingHospitableBlock, checkIn: string, checkOut: string) {
  const identity = JSON.stringify([
    existing.channelConfirmationCode,
    existing.propertyId,
    existing.guestName,
    existing.internalNotes,
    existing.tags,
    checkIn,
    checkOut,
  ]);
  return `${HOSPITABLE_BLOCK_KEY_PREFIX}${createHash("sha256").update(identity).digest("hex").slice(0, 24)}`;
}

function cloneHospitableBlockTail(
  sqlite: Database,
  existing: ExistingHospitableBlock,
  checkIn: string,
  checkOut: string,
) {
  sqlite.prepare(
    `INSERT INTO bookings (
      id, property_id, channel, channel_confirmation_code, status, guest_id,
      guest_name, guest_phone, guest_email, guest_location,
      num_adults, num_children, num_pets, check_in, check_out, nights,
      booking_created_date, lead_time_days, gross_revenue, nightly_rate_subtotal,
      cleaning_fee, pet_fee, platform_fees, taxes, refunds_discounts, net_payout,
      payout_received, payout_received_date, security_deposit, avg_nightly_rate,
      internal_notes, guest_notes, tags, screenshot_url, import_confidence,
      import_batch_id, created_at, updated_at
    )
    SELECT
      ?, property_id, channel, ?, status, guest_id,
      guest_name, guest_phone, guest_email, guest_location,
      num_adults, num_children, num_pets, ?, ?, ?,
      booking_created_date, lead_time_days, gross_revenue, nightly_rate_subtotal,
      cleaning_fee, pet_fee, platform_fees, taxes, refunds_discounts, net_payout,
      payout_received, payout_received_date, security_deposit, avg_nightly_rate,
      internal_notes, guest_notes, tags, screenshot_url, import_confidence,
      import_batch_id, created_at, updated_at
    FROM bookings WHERE id = ?`,
  ).run(
    randomUUID(),
    residualBlockKey(existing, checkIn, checkOut),
    checkIn,
    checkOut,
    Math.round((new Date(`${checkOut}T00:00:00Z`).getTime() - new Date(`${checkIn}T00:00:00Z`).getTime()) / 86_400_000),
    existing.id,
  );
}

export function reconcileHospitableCalendarBlocks(
  sqlite: Database,
  blocks: NormalizedHospitableCalendarBlock[],
  options: { from: string; to: string; batchId: string },
) {
  let created = 0;
  let updated = 0;
  let skipped = 0;
  let removed = 0;
  const now = new Date().toISOString();
  const existing = sqlite.prepare(
    `SELECT id, property_id AS propertyId, channel, channel_confirmation_code AS channelConfirmationCode,
            status, guest_id AS guestId, guest_name AS guestName, check_in AS checkIn, check_out AS checkOut,
            nights, gross_revenue AS grossRevenue, net_payout AS netPayout, internal_notes AS internalNotes, tags
     FROM bookings
     WHERE channel = 'Hospitable' AND status = 'owner_block'
       AND channel_confirmation_code LIKE 'hospitable:block:%'
       AND check_in <= ? AND check_out > ?`,
  ).all(options.to, options.from) as ExistingHospitableBlock[];
  const existingByKey = new Map(existing.map((row) => [row.channelConfirmationCode, row]));
  const desiredKeys = new Set(blocks.map((block) => block.channelConfirmationCode));
  const preservedExistingKeys = new Set<string>();
  const rangeCheckOut = addUtcDays(options.to, 1);

  for (const block of blocks) {
    const row = existingByKey.get(block.channelConfirmationCode);
    if (row && isHospitableBlockUnchanged(row, block)) {
      skipped += 1;
      preservedExistingKeys.add(row.channelConfirmationCode);
      continue;
    }

    const coveringRow = existing.find((candidate) => {
      if (!candidate.checkIn || !candidate.checkOut || !hasSameHospitableBlockMetadata(candidate, block)) return false;
      const authoritativeCheckIn = candidate.checkIn < options.from ? options.from : candidate.checkIn;
      const authoritativeCheckOut = candidate.checkOut > rangeCheckOut ? rangeCheckOut : candidate.checkOut;
      return authoritativeCheckIn === block.checkIn && authoritativeCheckOut === block.checkOut;
    });
    if (coveringRow) {
      skipped += 1;
      preservedExistingKeys.add(coveringRow.channelConfirmationCode);
      continue;
    }

    if (row) {
      sqlite.prepare(
        `UPDATE bookings SET property_id = ?, channel = 'Hospitable', status = 'owner_block', guest_id = NULL,
          guest_name = ?, guest_phone = NULL, guest_email = NULL, guest_location = NULL,
          num_adults = 0, num_children = 0, num_pets = 0, check_in = ?, check_out = ?, nights = ?,
          gross_revenue = 0, nightly_rate_subtotal = 0, cleaning_fee = 0, pet_fee = 0,
          platform_fees = 0, taxes = 0, refunds_discounts = 0, net_payout = 0, avg_nightly_rate = 0,
          internal_notes = ?, tags = ?, import_confidence = 1, import_batch_id = ?, updated_at = ? WHERE id = ?`,
      ).run(block.propertyId, block.label, block.checkIn, block.checkOut, block.nights, block.internalNotes, block.tags,
        options.batchId, now, row.id);
      updated += 1;
    } else {
      sqlite.prepare(
        `INSERT INTO bookings (
          id, property_id, channel, channel_confirmation_code, status, guest_id, guest_name,
          num_adults, num_children, num_pets, check_in, check_out, nights,
          gross_revenue, nightly_rate_subtotal, cleaning_fee, pet_fee, platform_fees, taxes,
          refunds_discounts, net_payout, avg_nightly_rate, internal_notes, tags,
          import_confidence, import_batch_id, created_at, updated_at
        ) VALUES (?, ?, 'Hospitable', ?, 'owner_block', NULL, ?, 0, 0, 0, ?, ?, ?, 0, 0, 0, 0, 0, 0, 0, 0, 0, ?, ?, 1, ?, ?, ?)`,
      ).run(randomUUID(), block.propertyId, block.channelConfirmationCode, block.label, block.checkIn, block.checkOut,
        block.nights, block.internalNotes, block.tags, options.batchId, now, now);
      created += 1;
    }
  }

  for (const row of existing) {
    if (!row.checkIn || !row.checkOut) continue;
    const isDesiredOrPreserved = desiredKeys.has(row.channelConfirmationCode) ||
      preservedExistingKeys.has(row.channelConfirmationCode);
    const crossesAuthorityBoundary = row.checkIn < options.from || row.checkOut > rangeCheckOut;
    if (
      !isDesiredOrPreserved && crossesAuthorityBoundary &&
      sameNumber(row.grossRevenue, 0) && sameNumber(row.netPayout, 0)
    ) {
      if (row.checkIn < options.from) {
        cloneHospitableBlockTail(sqlite, row, row.checkIn, options.from);
        created += 1;
      }
      if (row.checkOut > rangeCheckOut) {
        cloneHospitableBlockTail(sqlite, row, rangeCheckOut, row.checkOut);
        created += 1;
      }
      sqlite.prepare(`DELETE FROM bookings WHERE id = ?`).run(row.id);
      removed += 1;
      continue;
    }

    const isFullyAuthoritative = row.checkIn >= options.from && row.checkOut <= rangeCheckOut;
    if (!isDesiredOrPreserved && isFullyAuthoritative) {
      sqlite.prepare(`DELETE FROM bookings WHERE id = ?`).run(row.id);
      removed += 1;
    }
  }

  return { created, updated, skipped, removed };
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

  const [rawBookings, propertyCalendars] = await Promise.all([
    fetchAllHospitableReservations({ start_date: from, end_date: to, include: "guest,financials" }),
    fetchAllHospitableCalendars({ start_date: from, end_date: to }),
  ]);
  const calendarDaysFetched = propertyCalendars.reduce((total, calendar) => total + calendar.days.length, 0);
  const calendarBlocks = propertyCalendars.flatMap((calendar) =>
    normalizeHospitableCalendarBlocks(calendar.propertyId, calendar.days),
  );
  let blockResult = { created: 0, updated: 0, skipped: 0, removed: 0 };

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
    blockResult = reconcileHospitableCalendarBlocks(sqlite, calendarBlocks, { from, to, batchId });
  });

  tx(rawBookings);

  if (created + updated + blockResult.created + blockResult.updated + blockResult.removed > 0 || errors.length > 0) {
    sqlite
      .prepare(
        `INSERT INTO import_batches (id, source_type, source_file, imported_at, records_created, errors, reviewed)
         VALUES (?, ?, ?, CURRENT_TIMESTAMP, ?, ?, ?)`,
      )
      .run(
        batchId,
        "hospitable_api",
        `/v2/reservations + /v2/properties/{id}/calendar ${from}..${to}`,
        created + updated + blockResult.created + blockResult.updated,
        errors.length ? JSON.stringify(errors.slice(0, 50)) : null,
        0,
      );
  }

  return {
    batchId,
    fetched: rawBookings.length,
    created,
    updated,
    skipped,
    calendarDaysFetched,
    blocksFound: calendarBlocks.length,
    blocksCreated: blockResult.created,
    blocksUpdated: blockResult.updated,
    blocksSkipped: blockResult.skipped,
    blocksRemoved: blockResult.removed,
    errors,
    from,
    to,
  };
}
