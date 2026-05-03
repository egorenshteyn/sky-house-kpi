# Sky House KPI Tracker — Build Instructions

## What This Is
A private KPI tracker, dashboard, and lightweight CRM for Sky House, a luxury vacation rental in Dillon Beach, California. It replaces and dramatically improves an existing Google Sheet tracker.

## Design Direction: "Carbon"
The UI follows the Carbon/IBM design aesthetic:
- Light mode with light gray (#f4f4f4) background
- Black (#161616) header bar with "SKY HOUSE" branding
- IBM Plex Sans body font, IBM Plex Mono for numbers/data
- White data cards with 1px #e0e0e0 borders
- Primary accent: #0f62fe (IBM blue)
- Clean horizontal progress bars for channel breakdown
- Monospace numbers throughout for data alignment
- Channel color coding: Airbnb=#FF5A5F (coral), Luxe=#6929c4 (purple), Direct=#198038 (green), VRBO=#0043ce (blue)
- Revenue basis dropdown (stay-date / booking-date / payout-date)
- YoY pacing narrative banner
- Channel health warnings
- AI chat input field
- 6 KPI cards in top row: Revenue, Net Payout, Occupancy, ADR, Nights, RevPAN

Reference mockup is at: ~/sky-house-tracker/mockups/direction-3-carbon.html

## Stack
- Next.js 14+ (App Router)
- TypeScript
- Tailwind CSS
- SQLite via better-sqlite3 (local dev) — simple, no external DB needed for v1
- Drizzle ORM
- NextAuth.js with credentials provider (simple username/password login)
- Chart.js for charts
- Deployable to Vercel (will switch to Postgres/Turso for production later)

## Data Files
All historical data is in ~/sky-house-tracker/data/:
- bookings_summary.csv — Monthly KPI data from Oct 2018 through Dec 2026
- income.csv — Operating expense assumptions (PITI, utilities, subscriptions, upkeep)
- platforms.csv — Channel/platform listing links
- crm.csv — 3 guest contacts (Nicole DeFranza, Julie Gardner, Michael Quirk)

## Database Schema

### properties
- id TEXT PRIMARY KEY
- name TEXT NOT NULL
- location TEXT
- max_guests INTEGER
- default_cleaning_fee REAL
- notes TEXT

### bookings
- id TEXT PRIMARY KEY
- property_id TEXT REFERENCES properties(id)
- channel TEXT (Direct, Airbnb, Luxe, VRBO, TripAdvisor, Booking.com, StayOne)
- channel_confirmation_code TEXT
- status TEXT (inquiry, booked, completed, cancelled, refunded, owner_block, maintenance_block)
- guest_id TEXT REFERENCES guests(id)
- guest_name TEXT
- guest_phone TEXT
- guest_email TEXT
- guest_location TEXT
- num_adults INTEGER
- num_children INTEGER
- num_pets INTEGER
- check_in DATE
- check_out DATE
- nights INTEGER
- booking_created_date DATE
- lead_time_days INTEGER
- gross_revenue REAL
- nightly_rate_subtotal REAL
- cleaning_fee REAL
- pet_fee REAL
- platform_fees REAL
- taxes REAL
- refunds_discounts REAL
- net_payout REAL
- payout_received INTEGER DEFAULT 0
- payout_received_date DATE
- security_deposit REAL
- avg_nightly_rate REAL
- internal_notes TEXT
- guest_notes TEXT
- tags TEXT (JSON array)
- screenshot_url TEXT
- import_confidence REAL
- import_batch_id TEXT
- created_at DATETIME DEFAULT CURRENT_TIMESTAMP
- updated_at DATETIME DEFAULT CURRENT_TIMESTAMP

### guests
- id TEXT PRIMARY KEY
- first_name TEXT
- last_name TEXT
- phone TEXT
- email TEXT
- city TEXT
- state TEXT
- country TEXT
- preferred_channel TEXT
- tags TEXT (JSON array)
- notes TEXT
- communication_notes TEXT
- birthday TEXT
- source_channel TEXT
- created_at DATETIME DEFAULT CURRENT_TIMESTAMP

### channels
- id TEXT PRIMARY KEY
- name TEXT NOT NULL
- listing_url TEXT
- admin_url TEXT
- active INTEGER DEFAULT 1
- commission_rate REAL
- notes TEXT

### monthly_aggregates
- id TEXT PRIMARY KEY
- property_id TEXT REFERENCES properties(id)
- month INTEGER (1-12)
- year INTEGER
- total_stays INTEGER
- total_nights INTEGER
- occupancy_rate REAL
- booked_revenue REAL
- cumulative_annual_revenue REAL
- total_cumulative_revenue REAL
- revenue_direct REAL DEFAULT 0
- revenue_airbnb REAL DEFAULT 0
- revenue_luxe REAL DEFAULT 0
- revenue_vrbo REAL DEFAULT 0
- revenue_tripadvisor REAL DEFAULT 0
- revenue_bookingcom REAL DEFAULT 0
- revenue_stayone REAL DEFAULT 0
- notes TEXT
- source TEXT DEFAULT 'imported_google_sheet'
- created_at DATETIME DEFAULT CURRENT_TIMESTAMP

### expenses
- id TEXT PRIMARY KEY
- category TEXT (PITI, Utilities, Subscriptions, Upkeep)
- subcategory TEXT
- monthly_opex REAL
- monthly_cash_outflow REAL
- notes TEXT
- recurring INTEGER DEFAULT 1
- effective_date DATE

### ai_insights
- id TEXT PRIMARY KEY
- generated_at DATETIME DEFAULT CURRENT_TIMESTAMP
- insight_type TEXT (pacing, opportunity, channel, trend, alert)
- title TEXT
- summary TEXT
- supporting_metrics TEXT (JSON)
- priority TEXT (high, medium, low)
- action_recommendation TEXT
- dismissed INTEGER DEFAULT 0

### import_batches
- id TEXT PRIMARY KEY
- source_type TEXT (google_sheet, csv, screenshot, manual)
- source_file TEXT
- imported_at DATETIME DEFAULT CURRENT_TIMESTAMP
- records_created INTEGER
- errors TEXT
- reviewed INTEGER DEFAULT 0

## Pages to Build

### 1. Login Page
Simple credentials login. Default: admin / skyhouse2025 (configurable via env vars)

### 2. Executive Dashboard (/)
Match the Carbon mockup closely:
- Black header bar with SKY HOUSE, nav links, "+ New Booking" and "Upload" buttons
- Sub-header with title, time period toggles (MTD/YTD/T12/ALL), revenue basis dropdown
- 6 KPI cards: Revenue, Net Payout, Occupancy, ADR, Nights, RevPAN — each with YoY delta
- YoY pacing narrative banner (amber background, contextual text)
- Monthly Revenue bar chart (3 years overlaid)
- Channel Breakdown with horizontal progress bars and health warnings
- Upcoming Stays table with Guest, Check-in, Check-out, Nights, Channel, Revenue, ADR
- AI Analysis panel with insights and "Ask about performance..." input
- Occupancy Comparison line chart (current vs prior year)

### 3. Monthly Performance (/performance)
Table + charts by month. Filter by year, channel, revenue basis.
Columns: Month, Revenue, Nights, Stays, Occupancy, ADR, RevPAN, Channel breakdown, YoY delta, Notes.

### 4. Annual Comparison (/annual)
Side-by-side year comparison. Revenue, nights, occupancy, ADR, channel mix.
Charts: Revenue by month across years, occupancy by month, channel mix by year.

### 5. Booking Entry (/bookings/new)
Fast form: Channel, Guest name, Phone, Email, Location, Guests count, Check-in/out dates, Booking date, Revenue fields, Notes, Tags.
Smart defaults, keyboard-friendly.

### 6. Bookings List (/bookings)
Table of all bookings with search, filter by channel/status/date range. Click to edit.

### 7. Booking Calendar (/calendar)
Monthly calendar showing booked nights, owner blocks, channel colors, guest names, gaps.

### 8. Guest CRM (/guests)
Contact list with search. Guest profile with stay history, revenue, tags.
"Direct Booking Opportunities" view ranking past guests.

### 9. Channel Management (/channels)
Channel cards with listing links, revenue, nights, ADR, health indicators.

### 10. Financials (/financials)
Gross income, expenses (from imported data), NOI, cap rate, gross yield.
Scenario modeling inputs for property value and target metrics.

### 11. AI Insights (/insights)
List of generated insights. AI Q&A interface.
For v1, generate insights server-side using simple heuristic rules (no external AI API needed):
- YoY pacing comparisons
- Empty month detection
- Channel dependency warnings
- ADR trends
- Orphan gap detection

### 12. Screenshot Upload (/upload)
File upload form. For v1, just store the file and show a manual entry form.
AI extraction can be added later.

### 13. Data Admin (/admin)
Data quality checks: overlapping bookings, missing fields, duplicate detection.
CSV export. Import from CSV.

## Import Script
Create a seed script (scripts/seed.ts or similar) that:
1. Creates the Sky House property
2. Imports all monthly aggregate rows from bookings_summary.csv
3. Imports annual KPI summary rows
4. Imports channel/platform data from platforms.csv
5. Imports expense data from income.csv
6. Imports CRM contacts from crm.csv
7. Records import batch metadata

## Critical Revenue Logic
For bookings that cross month boundaries, allocate nights and revenue proportionally.
Example: Jan 30 - Feb 3 = 2 nights Jan + 2 nights Feb, revenue split accordingly.

Dashboard KPIs should combine:
- Historical monthly aggregates (for pre-booking-level data)
- Calculated from individual bookings (for new data)
Clearly distinguish imported aggregate data from booking-level calculated data.

## Revenue Basis
Support three views:
1. Stay-date revenue (default) — allocated to nights of stay
2. Booking-date revenue — attributed to booking creation date
3. Payout-date revenue — attributed to payout receipt date

## Auth
Simple NextAuth credentials provider. Single admin user for v1.
Environment variables: ADMIN_USERNAME, ADMIN_PASSWORD, NEXTAUTH_SECRET

## Key Implementation Notes
- Use App Router (app/ directory)
- Server components where possible, client components for interactive parts
- API routes under app/api/
- All monetary values in USD, stored as REAL (float)
- Dates stored as ISO strings
- IDs as UUIDs (use crypto.randomUUID())
- Tags stored as JSON arrays in TEXT columns
- Available nights per month: use calendar days (28-31) as default

## DO NOT
- Do not fabricate booking-level guest records for historical data
- Do not use an external database service — use SQLite with better-sqlite3
- Do not over-engineer auth — simple credentials provider is fine
- Do not add enterprise features like team management in v1
- Do not use App Router route groups excessively — keep it flat and simple
