import { NextResponse } from "next/server";
import { getSqlite } from "@/lib/db";
import { randomUUID } from "crypto";

export async function GET() {
  const db = getSqlite();
  const rows = db
    .prepare(
      `SELECT id, name, listing_url as listingUrl, admin_url as adminUrl,
              active, commission_rate as commissionRate, notes
       FROM channels ORDER BY active DESC, name`,
    )
    .all();
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const body = await req.json();
  if (!body.name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }
  const id = randomUUID();
  const db = getSqlite();
  db.prepare(
    `INSERT INTO channels (id, name, listing_url, admin_url, active, commission_rate, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    body.name,
    body.listingUrl || null,
    body.adminUrl || null,
    body.active ?? 1,
    body.commissionRate ?? null,
    body.notes || null,
  );
  return NextResponse.json({ id });
}
