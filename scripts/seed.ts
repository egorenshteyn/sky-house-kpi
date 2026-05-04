import { runMigrations } from "../lib/db/migrate";
import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { randomUUID } from "crypto";

const DATA_DIR = path.resolve(process.cwd(), "..", "data");
const DB_PATH = path.join(process.cwd(), "sky-house.db");

const PROPERTY_ID = "skyhouse-dillon-beach";

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}

function readCsv(file: string): string[][] {
  const content = fs.readFileSync(file, "utf8");
  const lines = content.split(/\r?\n/);
  return lines.filter((l) => l.length > 0).map(parseCsvLine);
}

function parseMoney(v: string | undefined): number {
  if (!v) return 0;
  const trimmed = v.trim();
  if (trimmed === "" || trimmed === "-" || trimmed === "$0" || trimmed === "0") return 0;
  const cleaned = trimmed.replace(/[$,\s"]/g, "");
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
}

function parsePct(v: string | undefined): number {
  if (!v) return 0;
  const cleaned = v.replace(/[%\s"]/g, "");
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
}

function parseInt0(v: string | undefined): number {
  if (!v) return 0;
  const trimmed = v.trim();
  if (trimmed === "" || trimmed === "-") return 0;
  const n = parseInt(trimmed.replace(/[,\s"]/g, ""), 10);
  return Number.isFinite(n) ? n : 0;
}

const MONTHS: Record<string, number> = {
  Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6,
  Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12,
};

function parseMonthYear(label: string): { month: number; year: number } | null {
  const m = label.match(/^([A-Za-z]+)\s+(\d{4})$/);
  if (!m) return null;
  const month = MONTHS[m[1]];
  const year = parseInt(m[2], 10);
  if (!month || !year) return null;
  return { month, year };
}

async function main() {
  console.log("→ Running migrations…");
  if (fs.existsSync(DB_PATH)) {
    fs.unlinkSync(DB_PATH);
  }
  runMigrations(DB_PATH);

  const sqlite = new Database(DB_PATH);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");

  // Property
  console.log("→ Inserting property…");
  sqlite
    .prepare(
      `INSERT INTO properties (id, name, location, max_guests, default_cleaning_fee, notes)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .run(
      PROPERTY_ID,
      "Sky House",
      "Dillon Beach, CA",
      12,
      650,
      "Luxury vacation rental on the California coast",
    );

  // Import batch
  const importBatchId = randomUUID();
  sqlite
    .prepare(
      `INSERT INTO import_batches (id, source_type, source_file, records_created, errors, reviewed)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .run(importBatchId, "csv", "bookings_summary.csv", 0, null, 1);

  // Monthly aggregates
  console.log("→ Importing monthly_aggregates…");
  const monthlyRows = readCsv(path.join(DATA_DIR, "bookings_summary.csv"));
  // First row is header
  const insertMonthly = sqlite.prepare(
    `INSERT INTO monthly_aggregates
     (id, property_id, month, year, total_stays, total_nights, occupancy_rate,
      booked_revenue, cumulative_annual_revenue, total_cumulative_revenue,
      revenue_direct, revenue_airbnb, revenue_luxe, revenue_vrbo,
      revenue_tripadvisor, revenue_bookingcom, revenue_stayone, notes, source)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );

  let monthlyCount = 0;
  for (let i = 1; i < monthlyRows.length; i++) {
    const row = monthlyRows[i];
    const label = (row[0] || "").trim();
    const my = parseMonthYear(label);
    if (!my) continue;

    const totalStays = parseInt0(row[1]);
    const totalNights = parseInt0(row[2]);
    const occupancy = parsePct(row[3]);
    const cumulativeAnnualRev = parseMoney(row[4]);
    const bookedRev = parseMoney(row[5]);
    const direct = parseMoney(row[6]);
    const airbnb = parseMoney(row[7]);
    const luxe = parseMoney(row[8]);
    const vrbo = parseMoney(row[9]);
    const tripadvisor = parseMoney(row[10]);
    const bookingcom = parseMoney(row[11]);
    const stayone = parseMoney(row[12]);
    const totalCumulative = parseMoney(row[13]);
    const notes = (row[14] || "").trim();

    insertMonthly.run(
      randomUUID(),
      PROPERTY_ID,
      my.month,
      my.year,
      totalStays,
      totalNights,
      occupancy,
      bookedRev,
      cumulativeAnnualRev,
      totalCumulative,
      direct,
      airbnb,
      luxe,
      vrbo,
      tripadvisor,
      bookingcom,
      stayone,
      notes || null,
      "imported_google_sheet",
    );
    monthlyCount++;
  }
  console.log(`  Imported ${monthlyCount} monthly rows`);

  // Channels
  console.log("→ Importing channels…");
  const platformsRows = readCsv(path.join(DATA_DIR, "platforms.csv"));
  const insertChannel = sqlite.prepare(
    `INSERT INTO channels (id, name, listing_url, admin_url, active, commission_rate, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  );

  // Define core channels based on the application schema
  const coreChannels = [
    { name: "Direct", commission: 0.0, listing: "www.skyhousedb.com" },
    { name: "Airbnb", commission: 0.15, listing: "https://www.airbnb.com/rooms/28252452" },
    { name: "Luxe", commission: 0.20, listing: "https://www.airbnb.com/luxury/listing/35372812" },
    { name: "VRBO", commission: 0.08, listing: "https://www.vrbo.com/1476393" },
    { name: "TripAdvisor", commission: 0.10, listing: "https://www.flipkey.com/properties/12789192/" },
    { name: "Booking.com", commission: 0.15, listing: null },
    { name: "StayOne", commission: 0.10, listing: "https://www.stayonedegree.com/en/home/4236/information/view" },
  ];
  for (const c of coreChannels) {
    insertChannel.run(
      randomUUID(),
      c.name,
      c.listing,
      null,
      c.name === "VRBO" ? 0 : 1,
      c.commission,
      null,
    );
  }

  // Additional platforms from CSV beyond core
  let extraChannels = 0;
  for (let i = 1; i < platformsRows.length; i++) {
    const row = platformsRows[i];
    const num = (row[0] || "").trim();
    const platform = (row[1] || "").trim();
    if (!num || !platform || platform === "Social") continue;
    if (platform === "Website" || platform === "Airbnb" || platform === "Airbnb Luxe" ||
        platform === "VRBO (HomeAway)" || platform === "Booking.com" ||
        platform === "Stay One Degree" || platform === "Trip Advisor / Flipkey") continue;
    const link = (row[2] || "").trim() || null;
    insertChannel.run(
      randomUUID(),
      platform,
      link,
      null,
      0,
      null,
      "Imported from platforms.csv (inactive auxiliary channel)",
    );
    extraChannels++;
  }
  console.log(`  Imported ${coreChannels.length} core channels + ${extraChannels} aux channels`);

  // Expenses
  console.log("→ Importing expenses…");
  const incomeRows = readCsv(path.join(DATA_DIR, "income.csv"));
  const insertExpense = sqlite.prepare(
    `INSERT INTO expenses (id, category, subcategory, monthly_opex, monthly_cash_outflow, notes, recurring, effective_date)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  );

  // Walk by category groupings
  let currentCategory: string | null = null;
  let expensesCount = 0;
  for (const row of incomeRows) {
    const first = (row[0] || "").trim();
    if (!first) continue;
    // Top-level category lines have non-zero opex but are not indented
    const isIndented = (row[0] || "").startsWith("   ");
    if (!isIndented) {
      // Match category names
      if (
        first === "PITI" ||
        first === "Utilities & Supplies" ||
        first === "Subscriptions" ||
        first === "Upkeep & Services"
      ) {
        currentCategory = first;
        // Insert the category total too
        const opex = parseMoney(row[1]);
        const outflow = parseMoney(row[2]);
        insertExpense.run(
          randomUUID(),
          currentCategory,
          "TOTAL",
          opex,
          outflow,
          "Category total",
          1,
          null,
        );
        expensesCount++;
        continue;
      }
      continue;
    }
    // Indented sub-line
    if (!currentCategory) continue;
    const subcategory = first.trim();
    const opex = parseMoney(row[1]);
    const outflow = parseMoney(row[2]);
    const notes = (row[3] || "").trim() || null;
    insertExpense.run(
      randomUUID(),
      currentCategory,
      subcategory,
      opex,
      outflow,
      notes,
      1,
      null,
    );
    expensesCount++;
  }
  console.log(`  Imported ${expensesCount} expense rows`);

  // Guests + sample bookings from CRM
  console.log("→ Importing CRM guests…");
  const crmRows = readCsv(path.join(DATA_DIR, "crm.csv"));
  const insertGuest = sqlite.prepare(
    `INSERT INTO guests (id, first_name, last_name, phone, email, city, state, country, preferred_channel, tags, notes, communication_notes, birthday, source_channel)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  const insertBooking = sqlite.prepare(
    `INSERT INTO bookings
     (id, property_id, channel, status, guest_id, guest_name, guest_phone,
      check_in, check_out, nights, booking_created_date, lead_time_days,
      gross_revenue, net_payout, avg_nightly_rate, num_adults, internal_notes, import_batch_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );

  // Define future bookings from the mockup (representative upcoming stays)
  const upcomingBookings = [
    {
      first: "Julie", last: "Gardner", phone: "406-239-1848",
      channel: "Airbnb", checkIn: "2026-11-15", checkOut: "2026-11-19",
      gross: 4808, source: "Airbnb",
    },
    {
      first: "Michael", last: "Quirk", phone: "415-531-3248",
      channel: "Luxe", checkIn: "2026-11-22", checkOut: "2026-11-26",
      gross: 6885, source: "Airbnb Luxe",
    },
    {
      first: "Nicole", last: "DeFranza", phone: "920-809-1001",
      channel: "Direct", checkIn: "2026-12-20", checkOut: "2026-12-26",
      gross: 12648, source: "Direct",
    },
  ];

  let guestCount = 0;
  let bookingCount = 0;
  for (let i = 1; i < crmRows.length; i++) {
    const row = crmRows[i];
    const first = (row[0] || "").trim();
    const last = (row[1] || "").trim();
    const phone = (row[2] || "").trim();
    if (!first) continue;

    const upcoming = upcomingBookings.find((b) => b.first === first && b.last === last);

    const guestId = randomUUID();
    insertGuest.run(
      guestId,
      first,
      last,
      phone || null,
      null,
      null,
      null,
      "USA",
      upcoming?.channel || null,
      JSON.stringify(["VIP", "repeat-guest"]),
      "Imported from CRM",
      null,
      null,
      upcoming?.source || null,
    );
    guestCount++;

    if (upcoming) {
      const checkIn = new Date(upcoming.checkIn);
      const checkOut = new Date(upcoming.checkOut);
      const nights = Math.round((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
      const adr = upcoming.gross / nights;
      const netPayout = upcoming.gross * (upcoming.channel === "Direct" ? 1.0 : upcoming.channel === "Luxe" ? 0.8 : 0.85);

      insertBooking.run(
        randomUUID(),
        PROPERTY_ID,
        upcoming.channel,
        "booked",
        guestId,
        `${first} ${last}`,
        phone || null,
        upcoming.checkIn,
        upcoming.checkOut,
        nights,
        new Date().toISOString().slice(0, 10),
        Math.round((checkIn.getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
        upcoming.gross,
        netPayout,
        adr,
        upcoming.first === "Nicole" ? 8 : upcoming.first === "Michael" ? 6 : 4,
        "Imported from CRM",
        importBatchId,
      );
      bookingCount++;
    }
  }
  console.log(`  Imported ${guestCount} guests + ${bookingCount} sample bookings`);

  // Update import batch records
  sqlite
    .prepare(`UPDATE import_batches SET records_created = ? WHERE id = ?`)
    .run(monthlyCount + guestCount + bookingCount + expensesCount + coreChannels.length, importBatchId);

  // Generate AI insights based on data
  console.log("→ Generating AI insights…");
  const insertInsight = sqlite.prepare(
    `INSERT INTO ai_insights (id, insight_type, title, summary, supporting_metrics, priority, action_recommendation)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  );
  const insights = [
    {
      type: "pacing",
      title: "Revenue gap closing",
      summary:
        "Jul 2025 ($38.3K) was 59% higher than Jul 2024 ($24.1K). Trailing 3-month pace is now ahead of prior year.",
      metrics: { jul2025: 38335, jul2024: 24136, gap: -18800 },
      priority: "medium",
      action: "Maintain current pricing strategy through Q4",
    },
    {
      type: "channel",
      title: "VRBO deactivated",
      summary:
        "$0 VRBO revenue in 2025 vs $14.9K in 2024. This channel historically produced $15-50K/yr. Reactivate or reallocate.",
      metrics: { vrbo2025: 0, vrbo2024: 14935, vrboHistAvg: 32500 },
      priority: "high",
      action: "Reactivate VRBO listing or reallocate marketing spend",
    },
    {
      type: "trend",
      title: "Average stay length increased",
      summary:
        "Avg stay length = 4.5 nights, up from 4.2 in 2024. Longer stays reduce turnover costs. Consider offering 7-night discounts to push this higher.",
      metrics: { avgStay2025: 4.5, avgStay2024: 4.2 },
      priority: "low",
      action: "Test 10% discount for 7+ night stays",
    },
    {
      type: "alert",
      title: "September 2025 was empty",
      summary:
        "Zero stays in Sep 2025 vs 1 stay ($10K) in Sep 2024. Off-season weakness — consider mid-week corporate retreat targeting.",
      metrics: { sep2025: 0, sep2024: 10025 },
      priority: "high",
      action: "Build Sep marketing campaign or accept off-season pricing",
    },
    {
      type: "opportunity",
      title: "ADR is up 18% YoY",
      summary:
        "2025 ADR of $1,663 is the second-highest on record, behind only 2022 ($2,208). Customers are paying premium rates.",
      metrics: { adr2025: 1663, adr2024: 1407 },
      priority: "medium",
      action: "Test higher peak-week rates in 2026",
    },
  ];
  for (const ins of insights) {
    insertInsight.run(
      randomUUID(),
      ins.type,
      ins.title,
      ins.summary,
      JSON.stringify(ins.metrics),
      ins.priority,
      ins.action,
    );
  }

  // Competitors + sample pricing
  console.log("→ Seeding comp set…");
  const insertCompetitor = sqlite.prepare(
    `INSERT INTO competitors (
       id, name, platform, listing_url, image_url, location, bedrooms, bathrooms,
       max_guests, property_type, amenities, avg_rating, review_count,
       active, notes, created_at, updated_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );

  const seedCompetitors = [
    {
      id: randomUUID(),
      name: "Ocean View Retreat",
      platform: "Airbnb",
      listingUrl: "https://www.airbnb.com/rooms/example-ocean-view",
      imageUrl: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200&auto=format&fit=crop",
      location: "Dillon Beach, CA",
      bedrooms: 4,
      bathrooms: 3,
      maxGuests: 10,
      propertyType: "house",
      amenities: ["hot tub", "ocean view", "fire pit", "pet friendly"],
      avgRating: 4.92,
      reviewCount: 187,
      baseRate: 950,
    },
    {
      id: randomUUID(),
      name: "Beach Bluff Cottage",
      platform: "VRBO",
      listingUrl: "https://www.vrbo.com/example-beach-bluff",
      imageUrl: "https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?w=1200&auto=format&fit=crop",
      location: "Dillon Beach, CA",
      bedrooms: 3,
      bathrooms: 2,
      maxGuests: 8,
      propertyType: "cottage",
      amenities: ["ocean view", "deck", "kayaks"],
      avgRating: 4.78,
      reviewCount: 92,
      baseRate: 720,
    },
    {
      id: randomUUID(),
      name: "Pelican Point House",
      platform: "Airbnb",
      listingUrl: "https://www.airbnb.com/rooms/example-pelican-point",
      imageUrl: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1200&auto=format&fit=crop",
      location: "Dillon Beach, CA",
      bedrooms: 5,
      bathrooms: 4,
      maxGuests: 14,
      propertyType: "house",
      amenities: ["hot tub", "pool", "ocean view", "game room"],
      avgRating: 4.85,
      reviewCount: 145,
      baseRate: 1320,
    },
    {
      id: randomUUID(),
      name: "Lagoon Loft",
      platform: "Airbnb",
      listingUrl: "https://www.airbnb.com/rooms/example-lagoon-loft",
      imageUrl: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&auto=format&fit=crop",
      location: "Dillon Beach, CA",
      bedrooms: 2,
      bathrooms: 2,
      maxGuests: 6,
      propertyType: "condo",
      amenities: ["lagoon view", "fireplace"],
      avgRating: 4.65,
      reviewCount: 68,
      baseRate: 540,
    },
  ];

  const compNow = new Date().toISOString();
  for (const c of seedCompetitors) {
    insertCompetitor.run(
      c.id,
      c.name,
      c.platform,
      c.listingUrl,
      (c as any).imageUrl || null,
      c.location,
      c.bedrooms,
      c.bathrooms,
      c.maxGuests,
      c.propertyType,
      JSON.stringify(c.amenities),
      c.avgRating,
      c.reviewCount,
      1,
      "Seeded sample competitor for Dillon Beach comp set",
      compNow,
      compNow,
    );
  }

  // Sample pricing snapshots: a few months around today
  const insertSnapshot = sqlite.prepare(
    `INSERT INTO comp_pricing_snapshots (
       id, competitor_id, date, nightly_rate, minimum_nights, available, source, scraped_at, notes
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(competitor_id, date) DO UPDATE SET
       nightly_rate = excluded.nightly_rate,
       minimum_nights = excluded.minimum_nights,
       available = excluded.available`,
  );

  // Seed pricing for the next 3 months starting today (covers the dashboard's reference period)
  const seedDate = new Date();
  const seedMonths: { year: number; month: number }[] = [];
  for (let i = 0; i < 3; i++) {
    const d = new Date(Date.UTC(seedDate.getUTCFullYear(), seedDate.getUTCMonth() + i, 1));
    seedMonths.push({ year: d.getUTCFullYear(), month: d.getUTCMonth() + 1 });
  }

  let snapshotCount = 0;
  for (const c of seedCompetitors) {
    for (const { year: monthYear, month: m } of seedMonths) {
      const days = new Date(Date.UTC(monthYear, m, 0)).getUTCDate();
      for (let d = 1; d <= days; d++) {
        const iso = `${monthYear}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
        const dayOfWeek = new Date(iso + "T00:00:00Z").getUTCDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 5 || dayOfWeek === 6;
        const seasonal = m === 7 ? 1.25 : m === 6 ? 1.1 : 1.0;
        const variance = 0.95 + Math.random() * 0.15;
        const rate = Math.round(c.baseRate * seasonal * (isWeekend ? 1.18 : 1.0) * variance);
        const available = Math.random() > 0.18 ? 1 : 0;
        insertSnapshot.run(
          randomUUID(),
          c.id,
          iso,
          rate,
          isWeekend ? 2 : 1,
          available,
          "manual",
          compNow,
          null,
        );
        snapshotCount++;
      }
    }
  }
  console.log(`  Seeded ${seedCompetitors.length} competitors + ${snapshotCount} pricing snapshots`);

  // Knowledge base seed entries
  console.log("→ Seeding knowledge base…");
  const insertKnowledge = sqlite.prepare(
    `INSERT INTO knowledge_base (
       id, type, title, content, tags, source, related_booking_id, related_guest_id,
       created_at, updated_at, archived
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  const knowledgeEntries = [
    {
      type: "strategy",
      title: "Direct booking incentives",
      content:
        "Repeat guests are offered a 5% direct-booking discount via email outreach 60 days after their stay. Track conversions in the CRM tags as 'direct-rebook'.",
      tags: ["direct", "repeat", "marketing"],
    },
    {
      type: "experiment",
      title: "Test 7-night discount in shoulder season",
      content:
        "April–May 2026: offer 10% off for 7+ night bookings to fill weekday gaps. Measure occupancy lift vs same period 2025.",
      tags: ["pricing", "occupancy", "shoulder-season"],
    },
    {
      type: "market",
      title: "Dillon Beach summer dynamics",
      content:
        "Peak demand runs Memorial Day through Labor Day, with July being the strongest month historically. Comp set rates spike ~25% on weekends.",
      tags: ["seasonal", "comp-set"],
    },
    {
      type: "pricing",
      title: "Cleaning fee benchmark",
      content:
        "Comp set in Dillon Beach charges $400–$800 cleaning fees. Sky House sits at $650 default — competitive for 12-guest properties.",
      tags: ["fees", "comp-set"],
    },
  ];
  for (const k of knowledgeEntries) {
    insertKnowledge.run(
      randomUUID(),
      k.type,
      k.title,
      k.content,
      JSON.stringify(k.tags),
      "manual",
      null,
      null,
      compNow,
      compNow,
      0,
    );
  }
  console.log(`  Seeded ${knowledgeEntries.length} knowledge entries`);

  sqlite.close();
  console.log("✓ Seed complete.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
