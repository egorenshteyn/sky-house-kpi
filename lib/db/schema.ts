import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

export const properties = sqliteTable("properties", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  location: text("location"),
  maxGuests: integer("max_guests"),
  defaultCleaningFee: real("default_cleaning_fee"),
  notes: text("notes"),
});

export const bookings = sqliteTable("bookings", {
  id: text("id").primaryKey(),
  propertyId: text("property_id").references(() => properties.id),
  channel: text("channel"),
  channelConfirmationCode: text("channel_confirmation_code"),
  status: text("status").default("booked"),
  guestId: text("guest_id"),
  guestName: text("guest_name"),
  guestPhone: text("guest_phone"),
  guestEmail: text("guest_email"),
  guestLocation: text("guest_location"),
  numAdults: integer("num_adults"),
  numChildren: integer("num_children"),
  numPets: integer("num_pets"),
  checkIn: text("check_in"),
  checkOut: text("check_out"),
  nights: integer("nights"),
  bookingCreatedDate: text("booking_created_date"),
  leadTimeDays: integer("lead_time_days"),
  grossRevenue: real("gross_revenue"),
  nightlyRateSubtotal: real("nightly_rate_subtotal"),
  cleaningFee: real("cleaning_fee"),
  petFee: real("pet_fee"),
  platformFees: real("platform_fees"),
  taxes: real("taxes"),
  refundsDiscounts: real("refunds_discounts"),
  netPayout: real("net_payout"),
  payoutReceived: integer("payout_received").default(0),
  payoutReceivedDate: text("payout_received_date"),
  securityDeposit: real("security_deposit"),
  avgNightlyRate: real("avg_nightly_rate"),
  internalNotes: text("internal_notes"),
  guestNotes: text("guest_notes"),
  tags: text("tags"),
  screenshotUrl: text("screenshot_url"),
  importConfidence: real("import_confidence"),
  importBatchId: text("import_batch_id"),
  createdAt: text("created_at").default("CURRENT_TIMESTAMP"),
  updatedAt: text("updated_at").default("CURRENT_TIMESTAMP"),
});

export const guests = sqliteTable("guests", {
  id: text("id").primaryKey(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  phone: text("phone"),
  email: text("email"),
  city: text("city"),
  state: text("state"),
  country: text("country"),
  preferredChannel: text("preferred_channel"),
  tags: text("tags"),
  notes: text("notes"),
  communicationNotes: text("communication_notes"),
  birthday: text("birthday"),
  sourceChannel: text("source_channel"),
  createdAt: text("created_at").default("CURRENT_TIMESTAMP"),
});

export const channels = sqliteTable("channels", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  listingUrl: text("listing_url"),
  adminUrl: text("admin_url"),
  active: integer("active").default(1),
  commissionRate: real("commission_rate"),
  notes: text("notes"),
});

export const monthlyAggregates = sqliteTable("monthly_aggregates", {
  id: text("id").primaryKey(),
  propertyId: text("property_id").references(() => properties.id),
  month: integer("month"),
  year: integer("year"),
  totalStays: integer("total_stays"),
  totalNights: integer("total_nights"),
  occupancyRate: real("occupancy_rate"),
  bookedRevenue: real("booked_revenue"),
  cumulativeAnnualRevenue: real("cumulative_annual_revenue"),
  totalCumulativeRevenue: real("total_cumulative_revenue"),
  revenueDirect: real("revenue_direct").default(0),
  revenueAirbnb: real("revenue_airbnb").default(0),
  revenueLuxe: real("revenue_luxe").default(0),
  revenueVrbo: real("revenue_vrbo").default(0),
  revenueTripadvisor: real("revenue_tripadvisor").default(0),
  revenueBookingcom: real("revenue_bookingcom").default(0),
  revenueStayone: real("revenue_stayone").default(0),
  notes: text("notes"),
  source: text("source").default("imported_google_sheet"),
  createdAt: text("created_at").default("CURRENT_TIMESTAMP"),
});

export const expenses = sqliteTable("expenses", {
  id: text("id").primaryKey(),
  category: text("category"),
  subcategory: text("subcategory"),
  monthlyOpex: real("monthly_opex"),
  monthlyCashOutflow: real("monthly_cash_outflow"),
  notes: text("notes"),
  recurring: integer("recurring").default(1),
  effectiveDate: text("effective_date"),
});

export const aiInsights = sqliteTable("ai_insights", {
  id: text("id").primaryKey(),
  generatedAt: text("generated_at").default("CURRENT_TIMESTAMP"),
  insightType: text("insight_type"),
  title: text("title"),
  summary: text("summary"),
  supportingMetrics: text("supporting_metrics"),
  priority: text("priority"),
  actionRecommendation: text("action_recommendation"),
  dismissed: integer("dismissed").default(0),
});

export const importBatches = sqliteTable("import_batches", {
  id: text("id").primaryKey(),
  sourceType: text("source_type"),
  sourceFile: text("source_file"),
  importedAt: text("imported_at").default("CURRENT_TIMESTAMP"),
  recordsCreated: integer("records_created"),
  errors: text("errors"),
  reviewed: integer("reviewed").default(0),
});

export const competitors = sqliteTable("competitors", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  platform: text("platform"),
  listingUrl: text("listing_url").notNull(),
  location: text("location"),
  bedrooms: integer("bedrooms"),
  bathrooms: real("bathrooms"),
  maxGuests: integer("max_guests"),
  propertyType: text("property_type"),
  amenities: text("amenities"),
  avgRating: real("avg_rating"),
  reviewCount: integer("review_count"),
  active: integer("active").default(1),
  notes: text("notes"),
  createdAt: text("created_at").default("CURRENT_TIMESTAMP"),
  updatedAt: text("updated_at").default("CURRENT_TIMESTAMP"),
});

export const compPricingSnapshots = sqliteTable("comp_pricing_snapshots", {
  id: text("id").primaryKey(),
  competitorId: text("competitor_id").references(() => competitors.id),
  date: text("date").notNull(),
  nightlyRate: real("nightly_rate"),
  minimumNights: integer("minimum_nights"),
  available: integer("available").default(1),
  source: text("source").default("manual"),
  scrapedAt: text("scraped_at").default("CURRENT_TIMESTAMP"),
  notes: text("notes"),
});

export const knowledgeBase = sqliteTable("knowledge_base", {
  id: text("id").primaryKey(),
  type: text("type").notNull(),
  title: text("title"),
  content: text("content").notNull(),
  tags: text("tags"),
  source: text("source"),
  relatedBookingId: text("related_booking_id"),
  relatedGuestId: text("related_guest_id"),
  createdAt: text("created_at").default("CURRENT_TIMESTAMP"),
  updatedAt: text("updated_at").default("CURRENT_TIMESTAMP"),
  archived: integer("archived").default(0),
});

export type Property = typeof properties.$inferSelect;
export type Booking = typeof bookings.$inferSelect;
export type NewBooking = typeof bookings.$inferInsert;
export type Guest = typeof guests.$inferSelect;
export type NewGuest = typeof guests.$inferInsert;
export type Channel = typeof channels.$inferSelect;
export type MonthlyAggregate = typeof monthlyAggregates.$inferSelect;
export type Expense = typeof expenses.$inferSelect;
export type AiInsight = typeof aiInsights.$inferSelect;
export type Competitor = typeof competitors.$inferSelect;
export type NewCompetitor = typeof competitors.$inferInsert;
export type CompPricingSnapshot = typeof compPricingSnapshots.$inferSelect;
export type NewCompPricingSnapshot = typeof compPricingSnapshots.$inferInsert;
export type KnowledgeBase = typeof knowledgeBase.$inferSelect;
export type NewKnowledgeBase = typeof knowledgeBase.$inferInsert;
