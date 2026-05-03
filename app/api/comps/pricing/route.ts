import { NextResponse } from "next/server";
import { getSqlite } from "@/lib/db";
import { randomUUID } from "crypto";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const competitorId = url.searchParams.get("competitorId");
  const fromDate = url.searchParams.get("fromDate");
  const toDate = url.searchParams.get("toDate");
  const limit = url.searchParams.get("limit");

  const where: string[] = [];
  const params: any[] = [];
  if (competitorId) {
    where.push("s.competitor_id = ?");
    params.push(competitorId);
  }
  if (fromDate) {
    where.push("s.date >= ?");
    params.push(fromDate);
  }
  if (toDate) {
    where.push("s.date <= ?");
    params.push(toDate);
  }
  const whereClause = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";
  const limitClause = limit ? `LIMIT ${parseInt(limit, 10)}` : "";

  const db = getSqlite();
  const rows = db
    .prepare(
      `SELECT s.id, s.competitor_id as competitorId, c.name as competitorName,
              s.date, s.nightly_rate as nightlyRate, s.minimum_nights as minimumNights,
              s.available, s.source, s.notes
       FROM comp_pricing_snapshots s
       LEFT JOIN competitors c ON c.id = s.competitor_id
       ${whereClause}
       ORDER BY s.date DESC, c.name
       ${limitClause}`,
    )
    .all(...params);
  return NextResponse.json(rows);
}

function dateRange(start: string, end: string): string[] {
  const out: string[] = [];
  const s = new Date(start + "T00:00:00Z");
  const e = new Date(end + "T00:00:00Z");
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime()) || s > e) return out;
  for (let d = new Date(s); d <= e; d.setUTCDate(d.getUTCDate() + 1)) {
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

export async function POST(req: Request) {
  const body = await req.json();
  const competitorId = body.competitorId;
  if (!competitorId) {
    return NextResponse.json({ error: "competitorId required" }, { status: 400 });
  }

  const db = getSqlite();
  const stmt = db.prepare(
    `INSERT INTO comp_pricing_snapshots (
       id, competitor_id, date, nightly_rate, minimum_nights, available, source, scraped_at, notes
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(competitor_id, date) DO UPDATE SET
       nightly_rate = excluded.nightly_rate,
       minimum_nights = excluded.minimum_nights,
       available = excluded.available,
       source = excluded.source,
       scraped_at = excluded.scraped_at,
       notes = excluded.notes`,
  );

  let dates: string[] = [];
  if (Array.isArray(body.dates)) {
    dates = body.dates;
  } else if (body.startDate && body.endDate) {
    dates = dateRange(body.startDate, body.endDate);
  } else if (body.date) {
    dates = [body.date];
  } else {
    return NextResponse.json(
      { error: "date, dates[], or startDate+endDate required" },
      { status: 400 },
    );
  }

  const now = new Date().toISOString();
  let count = 0;
  const insertMany = db.transaction((dateList: string[]) => {
    for (const d of dateList) {
      stmt.run(
        randomUUID(),
        competitorId,
        d,
        body.nightlyRate ?? null,
        body.minimumNights ?? null,
        body.available ?? 1,
        body.source || "manual",
        now,
        body.notes || null,
      );
      count++;
    }
  });
  insertMany(dates);

  return NextResponse.json({ count });
}
