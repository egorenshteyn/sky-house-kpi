/** Synthetic data only. Refuses to operate outside an OS temporary directory. */
import { runMigrations } from "../lib/db/migrate";
import Database from "better-sqlite3";
import { tmpdir } from "node:os";
import { resolve, sep } from "node:path";
const file = process.env.DATABASE_PATH;
if (!file || !resolve(file).startsWith(resolve(tmpdir()) + sep)) throw new Error("Use a temporary DATABASE_PATH");
runMigrations(file);
const db = new Database(file);
function insert(table: string, row: Record<string, unknown>) {
  const columns = Object.keys(row);
  db.prepare(`INSERT INTO ${table} (${columns.join(",")}) VALUES (${columns.map(() => "?").join(",")})`).run(...Object.values(row));
}
insert("properties", { id: "skyhouse-dillon-beach", name: "Sky House", location: "Dillon Beach", max_guests: 10 });
const year = new Date().getFullYear();
const month = new Date().getMonth() + 1;
const date = (day: number) => `${year}-${String(month).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
for (let i = 1; i <= 5; i++) {
  insert("guests", { id: `guest-${i}`, first_name: ["Alex", "Jordan", "Taylor", "Morgan", "Casey"][i-1], last_name: "Sample", phone: "555-0100", email: `guest${i}@example.com`, preferred_channel: i%2 ? "Direct" : "Airbnb", city: "San Francisco", state: "CA", notes: "Synthetic guest record for interface verification." });
  insert("bookings", { id: `booking-${i}`, property_id: "skyhouse-dillon-beach", guest_id: `guest-${i}`, guest_name: ["Alex", "Jordan", "Taylor", "Morgan", "Casey"][i-1] + " Sample", channel: i%2 ? "Direct" : "Airbnb", status: "booked", check_in: date(i*5), check_out: date(i*5+3), nights: 3, gross_revenue: 2400+i*100, net_payout: (2400+i*100)*.85, avg_nightly_rate: (2400+i*100)/3, booking_created_date: `${year}-01-15`, guest_email: `guest${i}@example.com`, num_adults: 4 });
}
insert("bookings", { id: "block-1", property_id: "skyhouse-dillon-beach", guest_name: "Owner stay", status: "owner_block", check_in: date(1), check_out: date(3), nights: 2, gross_revenue: 0 });
for (const y of [year-2, year-1, year]) for (let m=1;m<=12;m++) {
  const revenue = 15000 + m*850 + (y-year+2)*1000;
  insert("monthly_aggregates", { id: `${y}-${m}`, property_id: "skyhouse-dillon-beach", year: y, month: m, total_stays: 5, total_nights: 18, occupancy_rate: 60, booked_revenue: revenue, revenue_direct: revenue*.55, revenue_airbnb: revenue*.45 });
}
for (const [i, name] of ["Direct", "Airbnb", "VRBO", "Luxe"].entries()) insert("channels", { id: `channel-${i}`, name, active: 1, commission_rate: .03, listing_url: "https://example.com/listing" });
for (let i=1;i<=3;i++) {
 insert("competitors", { id: `comp-${i}`, name: `Coastal Retreat ${i}`, platform: "Airbnb", listing_url: "https://example.com", location: "Dillon Beach, CA", bedrooms: 4, bathrooms: 3, max_guests: 8, avg_rating: 4.9, review_count: 24, active: 1 });
 insert("comp_pricing_snapshots", { id: `snapshot-${i}`, competitor_id: `comp-${i}`, date: date(12), nightly_rate: 750+i*50, minimum_nights: 2, available: 1 });
}
insert("expenses", { id: "expense-1", category: "Operations", subcategory: "Maintenance", monthly_opex: 1200, monthly_cash_outflow: 1200, notes: "Synthetic expense" });
insert("knowledge_base", { id: "note-1", type: "strategy", title: "Shoulder season planning", content: "Review weekday availability and direct booking opportunities. ".repeat(6), source: "manual", created_at: new Date().toISOString(), tags: '["planning","weekday"]' });
insert("import_batches", { id: "batch-1", source_type: "test", source_file: "synthetic-fixture.csv", imported_at: new Date().toISOString(), records_created: 5, reviewed: 1 });
db.close();
console.log("Synthetic UI fixture ready.");
