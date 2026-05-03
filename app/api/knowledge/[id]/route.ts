import { NextResponse } from "next/server";
import { getSqlite } from "@/lib/db";

export async function PUT(
  req: Request,
  { params }: { params: { id: string } },
) {
  const body = await req.json();
  const db = getSqlite();
  const tags = Array.isArray(body.tags)
    ? JSON.stringify(body.tags)
    : body.tags || null;
  db.prepare(
    `UPDATE knowledge_base SET
       type = ?, title = ?, content = ?, tags = ?, source = ?,
       related_booking_id = ?, related_guest_id = ?, archived = ?, updated_at = ?
     WHERE id = ?`,
  ).run(
    body.type,
    body.title || null,
    body.content,
    tags,
    body.source || "manual",
    body.relatedBookingId || null,
    body.relatedGuestId || null,
    body.archived ?? 0,
    new Date().toISOString(),
    params.id,
  );
  return NextResponse.json({ id: params.id });
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const db = getSqlite();
  db.prepare(`DELETE FROM knowledge_base WHERE id = ?`).run(params.id);
  return NextResponse.json({ ok: true });
}
