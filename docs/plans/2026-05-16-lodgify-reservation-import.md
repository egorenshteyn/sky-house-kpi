# Lodgify Reservation Import Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Import Lodgify calendar and reservation data into the Sky House KPI Tracker so `/calendar`, `/bookings`, dashboards, and guest CRM stay synchronized from Lodgify rather than Airbnb iCal.

**Architecture:** Treat Lodgify as the canonical reservation source. Add a server-side Lodgify client that fetches both calendar availability and detailed bookings, normalizes Lodgify payloads into the existing `bookings` table, and stores enough import metadata to make sync idempotent and reversible. The UI should expose a manual sync button in Admin first; scheduled sync can be added after the endpoint is proven.

**Tech Stack:** Next.js 14 App Router, TypeScript, SQLite/better-sqlite3, existing `bookings`, `guests`, and `import_batches` tables, Lodgify API using `LODGIFY_API_KEY` from environment.

---

## Source APIs

Use the Lodgify endpoints Edward selected:

- Calendar: `https://docs.lodgify.com/reference/getcalendarbyuser`
- Detailed reservations/bookings: `https://docs.lodgify.com/reference/getallasync`

Expected roles:

1. **Calendar endpoint**: fast occupancy/availability sanity check by date range.
2. **Get all async endpoint**: detailed reservation records for importing guest, channel, dates, status, revenue, fees, and Lodgify IDs.

Implementation should keep endpoint paths/config isolated in `lib/lodgify/client.ts` because the docs are Cloudflare-protected in automated browser mode and exact request/query details may need validation against Lodgify's UI/docs with a real API key.

---

## Data Rules

### Canonical identity

Each imported Lodgify booking needs a stable external key:

```ts
source = "lodgify"
externalId = String(lodgifyBooking.id || lodgifyBooking.booking_id || lodgifyBooking.reservation_id)
channelConfirmationCode = `lodgify:${externalId}`
```

Do **not** create duplicate bookings if the same Lodgify ID is seen again. Update the existing row instead.

### Field mapping

Map into current `bookings` columns:

- `property_id`: `skyhouse-dillon-beach`
- `channel`: Lodgify source/channel if present; otherwise `Lodgify`
- `channel_confirmation_code`: `lodgify:${externalId}`
- `status`: normalize to existing statuses: `booked`, `completed`, `cancelled`, `owner_block`, `maintenance_block`, `inquiry`
- `guest_name`, `guest_phone`, `guest_email`, `guest_location`: from Lodgify guest/customer fields when present
- `check_in`, `check_out`: ISO `YYYY-MM-DD`
- `nights`: date difference between check-in and check-out
- `booking_created_date`: Lodgify created/booked date if present
- `gross_revenue`, `cleaning_fee`, `pet_fee`, `platform_fees`, `taxes`, `net_payout`, `avg_nightly_rate`: from Lodgify quote/price fields where available; default missing values to `0`
- `internal_notes`: append/import metadata summary, not raw JSON
- `tags`: include `lodgify` and source channel tags
- `import_confidence`: `1.0` for API import
- `import_batch_id`: current import batch ID

### Raw payload

Current schema lacks a dedicated raw JSON column. For v1, avoid stuffing large raw payloads into `internal_notes`. Instead write import errors/summaries to `import_batches.errors`. Add a raw payload table later only if needed.

---

## Task 1: Add Lodgify environment docs

**Objective:** Make required credentials obvious and prevent accidental client-side exposure.

**Files:**
- Modify: `.env.example` if it exists; otherwise create it.
- Modify: `README.md` if it exists; otherwise add a short note in this plan only.

**Steps:**
1. Add `LODGIFY_API_KEY=`.
2. Add optional sync config if needed: `LODGIFY_PROPERTY_ID=`, `LODGIFY_DEFAULT_CHANNEL=Lodgify`.
3. Verify no `NEXT_PUBLIC_` prefix is used for the API key.

**Verification:**
- Search for `LODGIFY_API_KEY` and confirm it appears only in server-side files and env docs.

---

## Task 2: Create Lodgify client

**Objective:** Centralize authentication, date-range query construction, and error handling.

**Files:**
- Create: `lib/lodgify/client.ts`

**Implementation outline:**

```ts
const BASE_URL = "https://api.lodgify.com";

export type LodgifyClientOptions = {
  apiKey?: string;
};

export class LodgifyError extends Error {
  constructor(message: string, public status?: number, public body?: string) {
    super(message);
  }
}

export function createLodgifyClient(options: LodgifyClientOptions = {}) {
  const apiKey = options.apiKey || process.env.LODGIFY_API_KEY;
  if (!apiKey) throw new LodgifyError("Missing LODGIFY_API_KEY");

  async function request<T>(path: string, query?: Record<string, string | number | undefined>) {
    const url = new URL(path, BASE_URL);
    for (const [key, value] of Object.entries(query || {})) {
      if (value !== undefined) url.searchParams.set(key, String(value));
    }

    const res = await fetch(url.toString(), {
      headers: {
        Accept: "application/json",
        "X-ApiKey": apiKey,
      },
      cache: "no-store",
    });

    const text = await res.text();
    if (!res.ok) throw new LodgifyError(`Lodgify request failed: ${res.status}`, res.status, text);
    return text ? (JSON.parse(text) as T) : ({} as T);
  }

  return {
    request,
    getBookings: (query: Record<string, string | number | undefined>) =>
      request<unknown>("/v2/reservations/bookings", query),
    getCalendar: (query: Record<string, string | number | undefined>) =>
      request<unknown>("/v1/reservation/calendar", query), // validate exact path against Lodgify docs/API key before finalizing
  };
}
```

**Verification:**
- `npm run build` should compile.
- With no key, server code should return a clear missing-key error.

---

## Task 3: Add Lodgify normalizer

**Objective:** Convert variable Lodgify API payloads into the app's booking shape.

**Files:**
- Create: `lib/lodgify/normalize.ts`

**Implementation requirements:**
- Accept unknown Lodgify booking objects defensively.
- Extract ID/date/guest/revenue fields using helper accessors.
- Convert dates to `YYYY-MM-DD`.
- Calculate `nights` from check-in/check-out.
- Normalize statuses to existing app statuses.
- Return both normalized booking data and validation warnings.

**Verification:**
- Add simple unit-like script or inline tests with representative mock payloads.
- Confirm cancelled reservations map to `cancelled` and do not count as active stays unless existing app logic explicitly includes them.

---

## Task 4: Create idempotent import service

**Objective:** Upsert Lodgify bookings into SQLite without duplicates.

**Files:**
- Create: `lib/lodgify/import.ts`
- Modify: `lib/guests.ts` only if `findOrCreateGuest` needs a reusable type/export adjustment.

**Implementation requirements:**
- Start an `import_batches` row with `source_type = 'lodgify_api'`.
- For each normalized booking:
  - Find existing booking by `channel_confirmation_code = 'lodgify:<id>'`.
  - If found, update mutable imported fields.
  - If not found, insert new row.
  - Use `findOrCreateGuest` for guest matching.
- Return summary: created, updated, skipped, errors.
- Do not delete local/manual bookings.
- Do not overwrite manually entered notes unless the note is clearly Lodgify import metadata.

**Verification:**
- Run import twice with the same mock data: first run creates, second run updates zero/duplicates zero.

---

## Task 5: Add server route for manual sync

**Objective:** Expose a protected admin-only endpoint for triggering sync.

**Files:**
- Create: `app/api/lodgify/sync/route.ts`

**Behavior:**
- `POST /api/lodgify/sync`
- Optional body: `{ "from": "2026-01-01", "to": "2026-12-31" }`
- Defaults: from 1 year back to 18 months forward.
- Calls Lodgify bookings endpoint first; optionally calls calendar endpoint for availability cross-check.
- Returns JSON summary and errors.

**Verification:**
- Missing API key returns 500 with readable JSON.
- Bad Lodgify response returns status/error body without crashing Next.js.

---

## Task 6: Add Admin UI sync control

**Objective:** Let Edward trigger Lodgify import without touching the terminal.

**Files:**
- Modify: `app/admin/page.tsx`
- Possibly create: `app/admin/LodgifySyncButton.tsx`

**UI:**
- Card title: `Lodgify Sync`
- Show: API status unknown/configured, default date range, last import batch if easy.
- Button: `Sync reservations from Lodgify`
- Result summary: created, updated, skipped, errors.

**Verification:**
- Button calls `/api/lodgify/sync`.
- Result appears inline.
- Calendar/bookings pages reflect imported rows after refresh.

---

## Task 7: Calendar/bookings polish

**Objective:** Make Lodgify-imported reservations readable in the existing UI.

**Files:**
- Modify: `lib/format.ts` if channel color mapping needs `Lodgify` or Lodgify subchannels.
- Modify: `app/calendar/page.tsx` only if status filtering is needed.
- Modify: `app/bookings/page.tsx` only if source/filter display is needed.

**Rules:**
- Cancelled bookings should not block the calendar.
- Owner/maintenance blocks should display differently if Lodgify provides them.
- Use original source channel when available: Airbnb, VRBO, Direct, Booking.com, etc.

**Verification:**
- Imported Airbnb reservation shows Airbnb color.
- Imported Direct reservation shows Direct color.
- Cancelled reservation does not appear as an active stay.

---

## Task 8: Production/deployment

**Objective:** Deploy safely and keep rollback simple.

**Steps:**
1. Run `npm run build`.
2. Commit with message like `v3 — add Lodgify reservation import`.
3. Add `LODGIFY_API_KEY` in Vercel environment variables.
4. Push to deploy.
5. Trigger manual sync from Admin.
6. Verify `/calendar`, `/bookings`, dashboard KPI counts.

**Rollback:**
- App code: `git revert HEAD && git push`.
- Data: imported rows are identifiable by `channel_confirmation_code LIKE 'lodgify:%'` and/or the import batch ID.

---

## Open Questions Before Final Implementation

1. Confirm Lodgify API key and whether it can access Sky House reservations.
2. Confirm exact query params for the selected endpoints from the Lodgify docs while logged in or via API key testing.
3. Decide whether Lodgify should overwrite existing manually entered future bookings, or only create/update rows with `lodgify:` external IDs.

Recommended default: only create/update rows with `lodgify:` external IDs; do not overwrite unrelated manual rows.
