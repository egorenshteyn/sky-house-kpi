import { NextResponse } from "next/server";
import { getSqlite } from "@/lib/db";
import { randomUUID } from "crypto";

export async function GET() {
  const db = getSqlite();
  const rows = db
    .prepare(
      `SELECT id, name, platform, listing_url as listingUrl, image_url as imageUrl, location,
              bedrooms, bathrooms, max_guests as maxGuests, property_type as propertyType,
              amenities, avg_rating as avgRating, review_count as reviewCount,
              active, notes, created_at as createdAt, updated_at as updatedAt
       FROM competitors
       ORDER BY active DESC, name`,
    )
    .all();
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const body = await req.json();
  if (!body.name || !body.listingUrl) {
    return NextResponse.json(
      { error: "name and listingUrl are required" },
      { status: 400 },
    );
  }
  const id = randomUUID();
  const db = getSqlite();
  const now = new Date().toISOString();
  const amenities = Array.isArray(body.amenities)
    ? JSON.stringify(body.amenities)
    : body.amenities || null;
  db.prepare(
    `INSERT INTO competitors (
       id, name, platform, listing_url, image_url, location, bedrooms, bathrooms,
       max_guests, property_type, amenities, avg_rating, review_count,
       active, notes, created_at, updated_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    body.name,
    body.platform || null,
    body.listingUrl,
    body.imageUrl || null,
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
    now,
  );
  return NextResponse.json({ id });
}
