import { NextResponse } from "next/server";
import { getSqlite } from "@/lib/db";

function csvEscape(v: any): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  if (/[,"\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function rowsToCsv(rows: any[]): string {
  if (rows.length === 0) return "";
  const cols = Object.keys(rows[0]);
  const lines = [cols.join(",")];
  for (const r of rows) {
    lines.push(cols.map((c) => csvEscape(r[c])).join(","));
  }
  return lines.join("\n");
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const type = url.searchParams.get("type") || "bookings";
  const db = getSqlite();
  let rows: any[] = [];
  if (type === "bookings") {
    rows = db.prepare(`SELECT * FROM bookings ORDER BY check_in DESC`).all() as any[];
  } else if (type === "monthly") {
    rows = db
      .prepare(`SELECT * FROM monthly_aggregates ORDER BY year, month`)
      .all() as any[];
  } else if (type === "guests") {
    rows = db.prepare(`SELECT * FROM guests`).all() as any[];
  }
  const csv = rowsToCsv(rows);
  return new NextResponse(csv, {
    headers: {
      "content-type": "text/csv",
      "content-disposition": `attachment; filename="${type}.csv"`,
    },
  });
}
