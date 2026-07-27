import assert from "node:assert/strict";
import Database from "better-sqlite3";
import {
  normalizeHospitableCalendarBlocks,
  reconcileHospitableCalendarBlocks,
} from "../lib/hospitable/import";

function createDatabase() {
  const sqlite = new Database(":memory:");
  sqlite.exec(`
    CREATE TABLE bookings (
      id TEXT PRIMARY KEY,
      property_id TEXT,
      channel TEXT,
      channel_confirmation_code TEXT,
      status TEXT,
      guest_id TEXT,
      guest_name TEXT,
      guest_phone TEXT,
      guest_email TEXT,
      guest_location TEXT,
      num_adults INTEGER,
      num_children INTEGER,
      num_pets INTEGER,
      check_in TEXT,
      check_out TEXT,
      nights INTEGER,
      booking_created_date TEXT,
      lead_time_days INTEGER,
      gross_revenue REAL,
      nightly_rate_subtotal REAL,
      cleaning_fee REAL,
      pet_fee REAL,
      platform_fees REAL,
      taxes REAL,
      refunds_discounts REAL,
      net_payout REAL,
      payout_received INTEGER,
      payout_received_date TEXT,
      security_deposit REAL,
      avg_nightly_rate REAL,
      internal_notes TEXT,
      guest_notes TEXT,
      tags TEXT,
      screenshot_url TEXT,
      import_confidence REAL,
      import_batch_id TEXT,
      created_at TEXT,
      updated_at TEXT
    );
  `);
  return sqlite;
}

const rawDays = [
  { date: "2026-08-04", status: { available: false, reason: "BLOCKED", source_type: "MANUAL", source: "Owner" } },
  { date: "2026-08-02", status: { available: false, reason: "BLOCKED", source_type: "MANUAL", source: "Owner" } },
  { date: "2026-08-01", status: { available: false, reason: "BLOCKED", source_type: "MANUAL", source: "Owner" } },
  { date: "2026-08-03", status: { available: false, reason: "RESERVED", source_type: "AIRBNB", source: "Reservation" } },
  { date: "2026-08-05", status: { available: false, reason: "BLOCKED", source_type: "RULE", source: "Advance notice" } },
  { date: "2026-08-06", status: { available: true, reason: "BLOCKED", source_type: "RULE", source: "Advance notice" } },
];

const blocks = normalizeHospitableCalendarBlocks("property-123", rawDays);
assert.equal(blocks.length, 3, "only consecutive unavailable BLOCKED dates with matching source metadata are grouped");
assert.deepEqual(
  blocks.map(({ checkIn, checkOut, nights, sourceType, source }) => ({ checkIn, checkOut, nights, sourceType, source })),
  [
    { checkIn: "2026-08-01", checkOut: "2026-08-03", nights: 2, sourceType: "MANUAL", source: "Owner" },
    { checkIn: "2026-08-04", checkOut: "2026-08-05", nights: 1, sourceType: "MANUAL", source: "Owner" },
    { checkIn: "2026-08-05", checkOut: "2026-08-06", nights: 1, sourceType: "RULE", source: "Advance notice" },
  ],
  "checkout must be the exclusive day after the final blocked date",
);
assert.ok(blocks.every((block) => block.channelConfirmationCode.startsWith("hospitable:block:")));
assert.deepEqual(
  normalizeHospitableCalendarBlocks("property-123", [...rawDays].reverse()).map((block) => block.channelConfirmationCode),
  blocks.map((block) => block.channelConfirmationCode),
  "generated confirmation keys must be stable regardless of API day order",
);

const sqlite = createDatabase();
sqlite.prepare(
  `INSERT INTO bookings (
    id, property_id, channel, channel_confirmation_code, status, guest_name,
    check_in, check_out, nights, gross_revenue, net_payout, created_at, updated_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
).run(
  "manual-block",
  "skyhouse-dillon-beach",
  "Direct",
  "manual:block:1",
  "owner_block",
  "Personal hold",
  "2026-08-07",
  "2026-08-09",
  2,
  0,
  0,
  "manual-created",
  "manual-updated",
);
sqlite.prepare(
  `INSERT INTO bookings (
    id, property_id, channel, channel_confirmation_code, status, guest_name,
    check_in, check_out, nights, gross_revenue, net_payout, created_at, updated_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
).run(
  "reservation",
  "skyhouse-dillon-beach",
  "Airbnb",
  "hospitable:reservation-1",
  "booked",
  "Real Guest",
  "2026-08-10",
  "2026-08-12",
  2,
  2000,
  1700,
  "reservation-created",
  "reservation-updated",
);

const first = reconcileHospitableCalendarBlocks(sqlite, blocks, {
  from: "2026-08-01",
  to: "2026-08-31",
  batchId: "batch-1",
});
assert.deepEqual(first, { created: 3, updated: 0, skipped: 0, removed: 0 });

const generatedRows = sqlite.prepare(
  `SELECT channel, status, guest_id AS guestId, guest_name AS guestName,
          gross_revenue AS grossRevenue, net_payout AS netPayout,
          channel_confirmation_code AS confirmationCode, created_at AS createdAt, updated_at AS updatedAt,
          import_batch_id AS importBatchId
   FROM bookings WHERE channel_confirmation_code LIKE 'hospitable:block:%' ORDER BY channel_confirmation_code`,
).all() as Array<Record<string, unknown>>;
assert.equal(generatedRows.length, 3);
assert.ok(generatedRows.every((row) => row.channel === "Hospitable" && row.status === "owner_block"));
assert.ok(generatedRows.every((row) => row.guestId === null && typeof row.guestName === "string" && row.guestName));
assert.ok(generatedRows.every((row) => row.grossRevenue === 0 && row.netPayout === 0));

const second = reconcileHospitableCalendarBlocks(sqlite, blocks, {
  from: "2026-08-01",
  to: "2026-08-31",
  batchId: "batch-2",
});
assert.deepEqual(second, { created: 0, updated: 0, skipped: 3, removed: 0 });
assert.deepEqual(
  sqlite.prepare(
    `SELECT channel_confirmation_code AS confirmationCode, created_at AS createdAt,
            updated_at AS updatedAt, import_batch_id AS importBatchId
     FROM bookings WHERE channel_confirmation_code LIKE 'hospitable:block:%' ORDER BY channel_confirmation_code`,
  ).all(),
  generatedRows.map(({ confirmationCode, createdAt, updatedAt, importBatchId }) => ({
    confirmationCode,
    createdAt,
    updatedAt,
    importBatchId,
  })),
  "an idempotent sync must not rewrite timestamps or batch ids",
);

const stale = reconcileHospitableCalendarBlocks(sqlite, blocks.slice(0, 2), {
  from: "2026-08-01",
  to: "2026-08-31",
  batchId: "batch-3",
});
assert.deepEqual(stale, { created: 0, updated: 0, skipped: 2, removed: 1 });
assert.equal((sqlite.prepare(`SELECT count(*) AS count FROM bookings WHERE id = 'manual-block'`).get() as { count: number }).count, 1);
assert.equal((sqlite.prepare(`SELECT count(*) AS count FROM bookings WHERE id = 'reservation'`).get() as { count: number }).count, 1);

const partialSqlite = createDatabase();
const broadDays = Array.from({ length: 26 }, (_, index) => ({
  date: new Date(Date.UTC(2026, 7, 9 + index)).toISOString().slice(0, 10),
  status: { available: false, reason: "BLOCKED", source_type: "MANUAL", source: "Owner" },
}));
const broadBlock = normalizeHospitableCalendarBlocks("property-123", broadDays);
assert.deepEqual(
  broadBlock.map(({ checkIn, checkOut }) => ({ checkIn, checkOut })),
  [{ checkIn: "2026-08-09", checkOut: "2026-09-04" }],
);
reconcileHospitableCalendarBlocks(partialSqlite, broadBlock, {
  from: "2026-08-09",
  to: "2026-09-04",
  batchId: "broad-sync",
});

const narrowBlock = normalizeHospitableCalendarBlocks(
  "property-123",
  broadDays.filter(({ date }) => date >= "2026-08-15" && date <= "2026-08-20"),
);
const narrow = reconcileHospitableCalendarBlocks(partialSqlite, narrowBlock, {
  from: "2026-08-15",
  to: "2026-08-20",
  batchId: "narrow-sync",
});
assert.deepEqual(narrow, { created: 0, updated: 0, skipped: 1, removed: 0 });
assert.deepEqual(
  partialSqlite.prepare(
    `SELECT check_in AS checkIn, check_out AS checkOut, nights, import_batch_id AS importBatchId
     FROM bookings WHERE channel_confirmation_code LIKE 'hospitable:block:%'`,
  ).all(),
  [{ checkIn: "2026-08-09", checkOut: "2026-09-04", nights: 26, importBatchId: "broad-sync" }],
  "a blocked subrange sync must preserve the complete generated block and avoid rewriting it",
);

const narrowAgain = reconcileHospitableCalendarBlocks(partialSqlite, narrowBlock, {
  from: "2026-08-15",
  to: "2026-08-20",
  batchId: "narrow-sync-2",
});
assert.deepEqual(narrowAgain, { created: 0, updated: 0, skipped: 1, removed: 0 });

const changedPartialSqlite = createDatabase();
reconcileHospitableCalendarBlocks(changedPartialSqlite, broadBlock, {
  from: "2026-08-09",
  to: "2026-09-04",
  batchId: "changed-broad-sync",
});
const changedNarrowBlock = normalizeHospitableCalendarBlocks(
  "property-123",
  broadDays.filter(({ date }) => date >= "2026-08-15" && date <= "2026-08-20" && date !== "2026-08-17"),
);
reconcileHospitableCalendarBlocks(changedPartialSqlite, changedNarrowBlock, {
  from: "2026-08-15",
  to: "2026-08-20",
  batchId: "changed-narrow-sync",
});

const changedRows = changedPartialSqlite.prepare(
  `SELECT id, channel_confirmation_code AS confirmationCode, check_in AS checkIn, check_out AS checkOut,
          nights, guest_name AS guestName, internal_notes AS internalNotes, tags,
          import_batch_id AS importBatchId, created_at AS createdAt, updated_at AS updatedAt
   FROM bookings WHERE channel_confirmation_code LIKE 'hospitable:block:%' ORDER BY check_in, check_out`,
).all() as Array<Record<string, unknown>>;
assert.deepEqual(
  changedRows.map(({ checkIn, checkOut, nights }) => ({ checkIn, checkOut, nights })),
  [
    { checkIn: "2026-08-09", checkOut: "2026-08-15", nights: 6 },
    { checkIn: "2026-08-15", checkOut: "2026-08-17", nights: 2 },
    { checkIn: "2026-08-18", checkOut: "2026-08-21", nights: 3 },
    { checkIn: "2026-08-21", checkOut: "2026-09-04", nights: 14 },
  ],
  "a changed partial sync must preserve outside tails while replacing only in-range coverage",
);
assert.equal(
  changedRows.some((row) => String(row.checkIn) <= "2026-08-17" && String(row.checkOut) > "2026-08-17"),
  false,
  "a day removed inside the authoritative range must no longer be blocked",
);
for (let index = 1; index < changedRows.length; index += 1) {
  assert.ok(
    String(changedRows[index - 1].checkOut) <= String(changedRows[index].checkIn),
    "reconciled generated blocks must not overlap",
  );
}

const changedSnapshot = changedPartialSqlite.prepare(
  `SELECT * FROM bookings WHERE channel_confirmation_code LIKE 'hospitable:block:%' ORDER BY check_in, check_out`,
).all();
const changedAgain = reconcileHospitableCalendarBlocks(changedPartialSqlite, changedNarrowBlock, {
  from: "2026-08-15",
  to: "2026-08-20",
  batchId: "changed-narrow-sync-2",
});
assert.deepEqual(changedAgain, { created: 0, updated: 0, skipped: 2, removed: 0 });
assert.deepEqual(
  changedPartialSqlite.prepare(
    `SELECT * FROM bookings WHERE channel_confirmation_code LIKE 'hospitable:block:%' ORDER BY check_in, check_out`,
  ).all(),
  changedSnapshot,
  "an identical changed partial sync must make no database changes",
);

sqlite.close();
partialSqlite.close();
changedPartialSqlite.close();
console.log("Hospitable calendar block tests passed");
