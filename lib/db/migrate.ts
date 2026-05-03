import Database from "better-sqlite3";
import path from "path";

export function runMigrations(dbPath?: string) {
  const dbFile = dbPath || path.join(process.cwd(), "sky-house.db");
  const sqlite = new Database(dbFile);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");

  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS properties (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      location TEXT,
      max_guests INTEGER,
      default_cleaning_fee REAL,
      notes TEXT
    );

    CREATE TABLE IF NOT EXISTS guests (
      id TEXT PRIMARY KEY,
      first_name TEXT,
      last_name TEXT,
      phone TEXT,
      email TEXT,
      city TEXT,
      state TEXT,
      country TEXT,
      preferred_channel TEXT,
      tags TEXT,
      notes TEXT,
      communication_notes TEXT,
      birthday TEXT,
      source_channel TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS bookings (
      id TEXT PRIMARY KEY,
      property_id TEXT REFERENCES properties(id),
      channel TEXT,
      channel_confirmation_code TEXT,
      status TEXT DEFAULT 'booked',
      guest_id TEXT,
      guest_name TEXT,
      guest_phone TEXT,
      guest_email TEXT,
      guest_location TEXT,
      num_adults INTEGER,
      num_children INTEGER,
      num_pets INTEGER,
      check_in DATE,
      check_out DATE,
      nights INTEGER,
      booking_created_date DATE,
      lead_time_days INTEGER,
      gross_revenue REAL,
      nightly_rate_subtotal REAL,
      cleaning_fee REAL,
      pet_fee REAL,
      platform_fees REAL,
      taxes REAL,
      refunds_discounts REAL,
      net_payout REAL,
      payout_received INTEGER DEFAULT 0,
      payout_received_date DATE,
      security_deposit REAL,
      avg_nightly_rate REAL,
      internal_notes TEXT,
      guest_notes TEXT,
      tags TEXT,
      screenshot_url TEXT,
      import_confidence REAL,
      import_batch_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS channels (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      listing_url TEXT,
      admin_url TEXT,
      active INTEGER DEFAULT 1,
      commission_rate REAL,
      notes TEXT
    );

    CREATE TABLE IF NOT EXISTS monthly_aggregates (
      id TEXT PRIMARY KEY,
      property_id TEXT REFERENCES properties(id),
      month INTEGER,
      year INTEGER,
      total_stays INTEGER,
      total_nights INTEGER,
      occupancy_rate REAL,
      booked_revenue REAL,
      cumulative_annual_revenue REAL,
      total_cumulative_revenue REAL,
      revenue_direct REAL DEFAULT 0,
      revenue_airbnb REAL DEFAULT 0,
      revenue_luxe REAL DEFAULT 0,
      revenue_vrbo REAL DEFAULT 0,
      revenue_tripadvisor REAL DEFAULT 0,
      revenue_bookingcom REAL DEFAULT 0,
      revenue_stayone REAL DEFAULT 0,
      notes TEXT,
      source TEXT DEFAULT 'imported_google_sheet',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS expenses (
      id TEXT PRIMARY KEY,
      category TEXT,
      subcategory TEXT,
      monthly_opex REAL,
      monthly_cash_outflow REAL,
      notes TEXT,
      recurring INTEGER DEFAULT 1,
      effective_date DATE
    );

    CREATE TABLE IF NOT EXISTS ai_insights (
      id TEXT PRIMARY KEY,
      generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      insight_type TEXT,
      title TEXT,
      summary TEXT,
      supporting_metrics TEXT,
      priority TEXT,
      action_recommendation TEXT,
      dismissed INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS import_batches (
      id TEXT PRIMARY KEY,
      source_type TEXT,
      source_file TEXT,
      imported_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      records_created INTEGER,
      errors TEXT,
      reviewed INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS competitors (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      platform TEXT,
      listing_url TEXT NOT NULL,
      location TEXT,
      bedrooms INTEGER,
      bathrooms REAL,
      max_guests INTEGER,
      property_type TEXT,
      amenities TEXT,
      avg_rating REAL,
      review_count INTEGER,
      active INTEGER DEFAULT 1,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS comp_pricing_snapshots (
      id TEXT PRIMARY KEY,
      competitor_id TEXT REFERENCES competitors(id) ON DELETE CASCADE,
      date TEXT NOT NULL,
      nightly_rate REAL,
      minimum_nights INTEGER,
      available INTEGER DEFAULT 1,
      source TEXT DEFAULT 'manual',
      scraped_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      notes TEXT,
      UNIQUE(competitor_id, date)
    );

    CREATE TABLE IF NOT EXISTS knowledge_base (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      title TEXT,
      content TEXT NOT NULL,
      tags TEXT,
      source TEXT,
      related_booking_id TEXT,
      related_guest_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      archived INTEGER DEFAULT 0
    );

    CREATE INDEX IF NOT EXISTS idx_bookings_check_in ON bookings(check_in);
    CREATE INDEX IF NOT EXISTS idx_bookings_check_out ON bookings(check_out);
    CREATE INDEX IF NOT EXISTS idx_bookings_channel ON bookings(channel);
    CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
    CREATE INDEX IF NOT EXISTS idx_monthly_year_month ON monthly_aggregates(year, month);
    CREATE INDEX IF NOT EXISTS idx_comp_pricing_date ON comp_pricing_snapshots(date);
    CREATE INDEX IF NOT EXISTS idx_comp_pricing_comp ON comp_pricing_snapshots(competitor_id);
    CREATE INDEX IF NOT EXISTS idx_knowledge_type ON knowledge_base(type);
    CREATE INDEX IF NOT EXISTS idx_knowledge_archived ON knowledge_base(archived);
  `);

  sqlite.close();
}

if (require.main === module) {
  runMigrations();
  console.log("Migrations applied.");
}
