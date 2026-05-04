import type { Database } from "better-sqlite3";
import { randomUUID } from "crypto";

export type GuestInput = {
  guestName?: string | null;
  guestPhone?: string | null;
  guestEmail?: string | null;
  guestLocation?: string | null;
  channel?: string | null;
};

function splitName(full: string): { first: string; last: string } {
  const parts = (full || "").trim().split(/\s+/);
  if (parts.length === 0 || !parts[0]) return { first: "", last: "" };
  if (parts.length === 1) return { first: parts[0], last: "" };
  const last = parts[parts.length - 1];
  const first = parts.slice(0, -1).join(" ");
  return { first, last };
}

function splitLocation(loc: string): { city: string | null; state: string | null } {
  if (!loc) return { city: null, state: null };
  const m = loc.split(",").map((s) => s.trim()).filter(Boolean);
  if (m.length === 0) return { city: null, state: null };
  if (m.length === 1) return { city: m[0], state: null };
  return { city: m[0], state: m[1] };
}

function normalizePhone(p: string | null | undefined): string {
  return (p || "").replace(/[^\d]/g, "");
}

export function findOrCreateGuest(
  sqlite: Database,
  input: GuestInput,
): string | null {
  const name = (input.guestName || "").trim();
  const phone = (input.guestPhone || "").trim();
  const email = (input.guestEmail || "").trim();
  if (!name && !phone && !email) return null;

  // 1) Try to match by email
  if (email) {
    const row = sqlite
      .prepare(`SELECT id FROM guests WHERE LOWER(email) = LOWER(?) LIMIT 1`)
      .get(email) as { id: string } | undefined;
    if (row) return row.id;
  }

  // 2) Try to match by normalized phone (digits only)
  if (phone) {
    const normalized = normalizePhone(phone);
    if (normalized.length >= 7) {
      const allWithPhone = sqlite
        .prepare(`SELECT id, phone FROM guests WHERE phone IS NOT NULL AND phone != ''`)
        .all() as { id: string; phone: string }[];
      const match = allWithPhone.find((r) => normalizePhone(r.phone) === normalized);
      if (match) return match.id;
    }
  }

  // 3) Try to match by exact full name (only if name has at least two parts to reduce collisions)
  if (name && name.includes(" ")) {
    const { first, last } = splitName(name);
    if (first && last) {
      const row = sqlite
        .prepare(
          `SELECT id FROM guests
           WHERE LOWER(first_name) = LOWER(?) AND LOWER(last_name) = LOWER(?)
           LIMIT 1`,
        )
        .get(first, last) as { id: string } | undefined;
      if (row) return row.id;
    }
  }

  // Create new guest
  const id = randomUUID();
  const { first, last } = splitName(name);
  const { city, state } = splitLocation(input.guestLocation || "");
  sqlite
    .prepare(
      `INSERT INTO guests
       (id, first_name, last_name, phone, email, city, state, country,
        preferred_channel, source_channel, tags, notes, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
    )
    .run(
      id,
      first || null,
      last || null,
      phone || null,
      email || null,
      city,
      state,
      null,
      input.channel || null,
      input.channel || null,
      null,
      null,
    );
  return id;
}
