import assert from "node:assert/strict";
import {
  fetchAllHospitableCalendars,
  HospitableError,
} from "../lib/hospitable/client";

const originalFetch = globalThis.fetch;
const originalToken = process.env.HOSPITABLE_API_TOKEN;

process.env.HOSPITABLE_API_TOKEN = "test-token";

async function fetchCalendarsWithResponse(body: unknown) {
  globalThis.fetch = async () =>
    new Response(JSON.stringify(body), {
      status: 200,
      headers: { "content-type": "application/json" },
    });

  return fetchAllHospitableCalendars({
    "properties[]": ["property-123"],
    start_date: "2026-08-01",
    end_date: "2026-08-31",
  });
}

async function main() {
  try {
    for (const malformedBody of [{}, { data: { days: "bad" } }]) {
      await assert.rejects(
        fetchCalendarsWithResponse(malformedBody),
        (error: unknown) => error instanceof HospitableError,
        "a successful calendar response without a data.days array must be rejected",
      );
    }

    for (const malformedDay of [
      {},
      { date: "not-a-date", status: { available: false, reason: "BLOCKED" } },
      { date: "2026-02-30", status: { available: false, reason: "BLOCKED" } },
      { date: "2026-08-01", status: null },
      { date: "2026-08-01", status: { available: "false", reason: "BLOCKED" } },
      { date: "2026-08-01", status: { available: false, reason: null } },
    ]) {
      await assert.rejects(
        fetchCalendarsWithResponse({ data: { days: [malformedDay] } }),
        (error: unknown) => error instanceof HospitableError,
        "every malformed calendar day must reject the complete response",
      );
    }

    assert.deepEqual(
      await fetchCalendarsWithResponse({ data: { days: [] } }),
      [{ propertyId: "property-123", days: [] }],
      "an empty data.days array is valid authoritative calendar data",
    );
  } finally {
    globalThis.fetch = originalFetch;
    if (originalToken === undefined) {
      delete process.env.HOSPITABLE_API_TOKEN;
    } else {
      process.env.HOSPITABLE_API_TOKEN = originalToken;
    }
  }

  console.log("Hospitable calendar client tests passed");
}

void main();
