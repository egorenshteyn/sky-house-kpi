/* eslint-disable no-console */
import Database from "better-sqlite3";
import path from "path";
import { findOrCreateGuest } from "../lib/guests";

const DB_PATH = process.env.DATABASE_PATH || path.join(process.cwd(), "sky-house.db");

function main() {
  const sqlite = new Database(DB_PATH);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");

  const bookings = sqlite
    .prepare(
      `SELECT id, channel, guest_id, guest_name, guest_phone, guest_email, guest_location
       FROM bookings
       WHERE (guest_id IS NULL OR guest_id = '')
         AND (guest_name IS NOT NULL AND guest_name != '')`,
    )
    .all() as {
    id: string;
    channel: string | null;
    guest_id: string | null;
    guest_name: string;
    guest_phone: string | null;
    guest_email: string | null;
    guest_location: string | null;
  }[];

  console.log(`→ ${bookings.length} bookings missing guest_id`);

  let linked = 0;
  let created = 0;
  for (const b of bookings) {
    const beforeCount = (sqlite.prepare(`SELECT COUNT(*) as c FROM guests`).get() as { c: number }).c;
    const guestId = findOrCreateGuest(sqlite, {
      guestName: b.guest_name,
      guestPhone: b.guest_phone,
      guestEmail: b.guest_email,
      guestLocation: b.guest_location,
      channel: b.channel,
    });
    if (!guestId) continue;
    const afterCount = (sqlite.prepare(`SELECT COUNT(*) as c FROM guests`).get() as { c: number }).c;
    if (afterCount > beforeCount) created++;
    else linked++;
    sqlite.prepare(`UPDATE bookings SET guest_id = ? WHERE id = ?`).run(guestId, b.id);
  }

  console.log(`✓ Backfilled ${linked} linked + ${created} created.`);
  sqlite.close();
}

main();
