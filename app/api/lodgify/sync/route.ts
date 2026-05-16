import { NextResponse } from "next/server";
import { getSqlite } from "@/lib/db";
import { LodgifyError } from "@/lib/lodgify/client";
import { defaultLodgifySyncRange, syncLodgifyBookings } from "@/lib/lodgify/import";

export const dynamic = "force-dynamic";

type SyncBody = {
  from?: string;
  to?: string;
};

function isDateOnly(value: string | undefined): value is string {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as SyncBody;
    const defaults = defaultLodgifySyncRange();
    const from = isDateOnly(body.from) ? body.from : defaults.from;
    const to = isDateOnly(body.to) ? body.to : defaults.to;

    if (from >= to) {
      return NextResponse.json({ error: "from must be before to" }, { status: 400 });
    }

    const summary = await syncLodgifyBookings(getSqlite(), { from, to });
    return NextResponse.json(summary);
  } catch (error) {
    if (error instanceof LodgifyError) {
      return NextResponse.json(
        {
          error: error.message,
          status: error.status,
          body: error.body?.slice(0, 500),
        },
        { status: error.status && error.status >= 400 && error.status < 600 ? error.status : 500 },
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown Lodgify sync error" },
      { status: 500 },
    );
  }
}
