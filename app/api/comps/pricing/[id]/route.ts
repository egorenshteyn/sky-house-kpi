import { NextResponse } from "next/server";
import { getSqlite } from "@/lib/db";

export async function PUT(
  req: Request,
  { params }: { params: { id: string } },
) {
  const body = await req.json();
  const db = getSqlite();
  db.prepare(
    `UPDATE comp_pricing_snapshots SET
       nightly_rate = ?, minimum_nights = ?, available = ?, source = ?,
       scraped_at = ?, notes = ?
     WHERE id = ?`,
  ).run(
    body.nightlyRate ?? null,
    body.minimumNights ?? null,
    body.available ?? 1,
    body.source || "manual",
    new Date().toISOString(),
    body.notes || null,
    params.id,
  );
  return NextResponse.json({ id: params.id });
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const db = getSqlite();
  db.prepare(`DELETE FROM comp_pricing_snapshots WHERE id = ?`).run(params.id);
  return NextResponse.json({ ok: true });
}
