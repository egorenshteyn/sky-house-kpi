import { NextResponse } from "next/server";
import { getSqlite } from "@/lib/db";
import { randomUUID } from "crypto";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const type = url.searchParams.get("type");
  const search = url.searchParams.get("q");
  const includeArchived = url.searchParams.get("includeArchived") === "1";

  const where: string[] = [];
  const params: any[] = [];
  if (!includeArchived) where.push("archived = 0");
  if (type) {
    where.push("type = ?");
    params.push(type);
  }
  if (search) {
    where.push("(LOWER(title) LIKE ? OR LOWER(content) LIKE ? OR LOWER(tags) LIKE ?)");
    const s = `%${search.toLowerCase()}%`;
    params.push(s, s, s);
  }
  const whereClause = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";

  const db = getSqlite();
  const rows = db
    .prepare(
      `SELECT id, type, title, content, tags, source,
              related_booking_id as relatedBookingId,
              related_guest_id as relatedGuestId,
              created_at as createdAt, updated_at as updatedAt, archived
       FROM knowledge_base
       ${whereClause}
       ORDER BY datetime(updated_at) DESC, datetime(created_at) DESC`,
    )
    .all(...params);
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const body = await req.json();
  if (!body.type || !body.content) {
    return NextResponse.json(
      { error: "type and content are required" },
      { status: 400 },
    );
  }
  const id = randomUUID();
  const db = getSqlite();
  const now = new Date().toISOString();
  const tags = Array.isArray(body.tags)
    ? JSON.stringify(body.tags)
    : body.tags || null;
  db.prepare(
    `INSERT INTO knowledge_base (
       id, type, title, content, tags, source, related_booking_id, related_guest_id,
       created_at, updated_at, archived
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    body.type,
    body.title || null,
    body.content,
    tags,
    body.source || "manual",
    body.relatedBookingId || null,
    body.relatedGuestId || null,
    now,
    now,
    body.archived ?? 0,
  );
  return NextResponse.json({ id });
}
