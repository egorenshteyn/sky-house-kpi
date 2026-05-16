import { getSqlite } from "../lib/db";
import { syncLodgifyBookings } from "../lib/lodgify/import";

async function main() {
  const summary = await syncLodgifyBookings(getSqlite());
  console.log(JSON.stringify({
    fetched: summary.fetched,
    created: summary.created,
    updated: summary.updated,
    skipped: summary.skipped,
    errors: summary.errors.length,
    from: summary.from,
    to: summary.to,
    batchId: summary.batchId,
  }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
