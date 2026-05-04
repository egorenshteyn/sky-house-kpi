import { NextResponse } from "next/server";
import { getSqlite } from "@/lib/db";
import { findOrCreateGuest } from "@/lib/guests";
import { randomUUID } from "crypto";

export async function GET() {
  const db = getSqlite();
  const rows = db
    .prepare(`SELECT * FROM bookings ORDER BY check_in DESC`)
    .all();
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const body = await req.json();
  const id = randomUUID();
  const db = getSqlite();
  const now = new Date().toISOString();
  const propertyId = "skyhouse-dillon-beach";

  const guestId = findOrCreateGuest(db, {
    guestName: body.guestName,
    guestPhone: body.guestPhone,
    guestEmail: body.guestEmail,
    guestLocation: body.guestLocation,
    channel: body.channel,
  });

  db.prepare(
    `INSERT INTO bookings (
       id, property_id, channel, status, guest_id, guest_name, guest_phone, guest_email, guest_location,
       num_adults, num_children, num_pets, check_in, check_out, nights,
       booking_created_date, gross_revenue, cleaning_fee, pet_fee, platform_fees,
       taxes, net_payout, avg_nightly_rate, internal_notes, guest_notes, tags,
       created_at, updated_at
     ) VALUES (
       ?, ?, ?, ?, ?, ?, ?, ?, ?,
       ?, ?, ?, ?, ?, ?,
       ?, ?, ?, ?, ?,
       ?, ?, ?, ?, ?, ?,
       ?, ?
     )`,
  ).run(
    id,
    propertyId,
    body.channel,
    body.status,
    guestId,
    body.guestName || null,
    body.guestPhone || null,
    body.guestEmail || null,
    body.guestLocation || null,
    body.numAdults || 0,
    body.numChildren || 0,
    body.numPets || 0,
    body.checkIn,
    body.checkOut,
    body.nights || 0,
    body.bookingCreatedDate || null,
    body.grossRevenue || 0,
    body.cleaningFee || 0,
    body.petFee || 0,
    body.platformFees || 0,
    body.taxes || 0,
    body.netPayout || 0,
    body.avgNightlyRate || 0,
    body.internalNotes || null,
    body.guestNotes || null,
    body.tags || null,
    now,
    now,
  );

  return NextResponse.json({ id, guestId });
}
