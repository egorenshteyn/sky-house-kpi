import { NextResponse } from "next/server";
import { getSqlite } from "@/lib/db";
import { findOrCreateGuest } from "@/lib/guests";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const db = getSqlite();
  const row = db.prepare(`SELECT * FROM bookings WHERE id = ?`).get(params.id);
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(row);
}

export async function PUT(
  req: Request,
  { params }: { params: { id: string } },
) {
  const body = await req.json();
  const db = getSqlite();
  const now = new Date().toISOString();

  const existing = db
    .prepare(`SELECT guest_id FROM bookings WHERE id = ?`)
    .get(params.id) as { guest_id: string | null } | undefined;
  let guestId = existing?.guest_id || null;
  if (!guestId) {
    guestId = findOrCreateGuest(db, {
      guestName: body.guestName,
      guestPhone: body.guestPhone,
      guestEmail: body.guestEmail,
      guestLocation: body.guestLocation,
      channel: body.channel,
    });
  }

  db.prepare(
    `UPDATE bookings SET
       channel = ?, status = ?, guest_id = ?, guest_name = ?, guest_phone = ?, guest_email = ?,
       guest_location = ?, num_adults = ?, num_children = ?, num_pets = ?,
       check_in = ?, check_out = ?, nights = ?, booking_created_date = ?,
       gross_revenue = ?, cleaning_fee = ?, pet_fee = ?, platform_fees = ?,
       taxes = ?, net_payout = ?, avg_nightly_rate = ?, internal_notes = ?,
       guest_notes = ?, tags = ?, updated_at = ?
     WHERE id = ?`,
  ).run(
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
    params.id,
  );
  return NextResponse.json({ id: params.id, guestId });
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const db = getSqlite();
  db.prepare(`DELETE FROM bookings WHERE id = ?`).run(params.id);
  return NextResponse.json({ ok: true });
}
