import { NextResponse } from "next/server";
import { getSqlite } from "@/lib/db";

export async function PUT(
  req: Request,
  { params }: { params: { id: string } },
) {
  const body = await req.json();
  const db = getSqlite();
  const now = new Date().toISOString();
  const amenities = Array.isArray(body.amenities)
    ? JSON.stringify(body.amenities)
    : body.amenities || null;
  db.prepare(
    `UPDATE competitors SET
       name = ?, platform = ?, listing_url = ?, location = ?,
       bedrooms = ?, bathrooms = ?, max_guests = ?, property_type = ?,
       amenities = ?, avg_rating = ?, review_count = ?, active = ?,
       notes = ?, updated_at = ?
     WHERE id = ?`,
  ).run(
    body.name,
    body.platform || null,
    body.listingUrl,
    body.location || null,
    body.bedrooms ?? null,
    body.bathrooms ?? null,
    body.maxGuests ?? null,
    body.propertyType || null,
    amenities,
    body.avgRating ?? null,
    body.reviewCount ?? null,
    body.active ?? 1,
    body.notes || null,
    now,
    params.id,
  );
  return NextResponse.json({ id: params.id });
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const db = getSqlite();
  db.prepare(`DELETE FROM comp_pricing_snapshots WHERE competitor_id = ?`).run(
    params.id,
  );
  db.prepare(`DELETE FROM competitors WHERE id = ?`).run(params.id);
  return NextResponse.json({ ok: true });
}
