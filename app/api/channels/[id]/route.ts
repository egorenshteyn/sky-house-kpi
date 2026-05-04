import { NextResponse } from "next/server";
import { getSqlite } from "@/lib/db";

export async function PUT(
  req: Request,
  { params }: { params: { id: string } },
) {
  const body = await req.json();
  const db = getSqlite();
  db.prepare(
    `UPDATE channels SET
       name = ?, listing_url = ?, admin_url = ?, active = ?,
       commission_rate = ?, notes = ?
     WHERE id = ?`,
  ).run(
    body.name,
    body.listingUrl || null,
    body.adminUrl || null,
    body.active ?? 1,
    body.commissionRate ?? null,
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
  db.prepare(`DELETE FROM channels WHERE id = ?`).run(params.id);
  return NextResponse.json({ ok: true });
}
