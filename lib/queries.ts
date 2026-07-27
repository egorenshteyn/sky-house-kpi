import { getSqlite } from "./db";
import type { MonthlyAgg } from "./dashboard";
export type { MonthlyAgg } from "./dashboard";
export { getAvailableNightsInYear } from "./dashboard";

export type BookingRow = {
  id: string;
  guestName: string | null;
  guestPhone: string | null;
  guestEmail: string | null;
  channel: string | null;
  status: string | null;
  checkIn: string | null;
  checkOut: string | null;
  nights: number | null;
  grossRevenue: number | null;
  netPayout: number | null;
  avgNightlyRate: number | null;
  numAdults: number | null;
  internalNotes: string | null;
  bookingCreatedDate: string | null;
};

export type BookingDetail = BookingRow & {
  guestId: string | null;
  guestLocation: string | null;
  numChildren: number | null;
  numPets: number | null;
  cleaningFee: number | null;
  petFee: number | null;
  platformFees: number | null;
  taxes: number | null;
  refundsDiscounts: number | null;
  guestNotes: string | null;
  tags: string | null;
  payoutReceived: number | null;
  payoutReceivedDate: string | null;
  securityDeposit: number | null;
  channelConfirmationCode: string | null;
};

export function getAllMonthly(): MonthlyAgg[] {
  const db = getSqlite();
  const months = db
    .prepare(
      `SELECT id, year, month, total_stays as totalStays, total_nights as totalNights,
              occupancy_rate as occupancyRate, booked_revenue as bookedRevenue,
              cumulative_annual_revenue as cumulativeAnnualRevenue,
              total_cumulative_revenue as totalCumulativeRevenue,
              revenue_direct as revenueDirect, revenue_airbnb as revenueAirbnb,
              revenue_luxe as revenueLuxe, revenue_vrbo as revenueVrbo,
              revenue_tripadvisor as revenueTripadvisor,
              revenue_bookingcom as revenueBookingcom,
              revenue_stayone as revenueStayone, notes
       FROM monthly_aggregates
       ORDER BY year, month`,
    )
    .all() as MonthlyAgg[];

  return applyBookingDerivedRevenueFor2026(months);
}

export function getMonthlyForYear(year: number): MonthlyAgg[] {
  return getAllMonthly().filter((m) => m.year === year);
}

type BookingRevenueByMonth = {
  month: number;
  channel: string | null;
  revenue: number;
};

type MonthlyRevenueFields = Pick<
  MonthlyAgg,
  | "bookedRevenue"
  | "revenueDirect"
  | "revenueAirbnb"
  | "revenueLuxe"
  | "revenueVrbo"
  | "revenueTripadvisor"
  | "revenueBookingcom"
  | "revenueStayone"
>;

function applyBookingDerivedRevenueFor2026(months: MonthlyAgg[]): MonthlyAgg[] {
  const db = getSqlite();
  const rows = db
    .prepare(
      `SELECT
         CAST(strftime('%m', check_in) AS INTEGER) AS month,
         channel,
         COALESCE(SUM(COALESCE(gross_revenue, 0)), 0) AS revenue
       FROM bookings
       WHERE check_in >= '2026-01-01'
         AND check_in < '2027-01-01'
         AND status IN ('booked', 'completed')
       GROUP BY month, channel`,
    )
    .all() as BookingRevenueByMonth[];

  const revenueByMonth = new Map<number, MonthlyRevenueFields>();

  for (const row of rows) {
    if (!revenueByMonth.has(row.month)) {
      revenueByMonth.set(row.month, {
        bookedRevenue: 0,
        revenueDirect: 0,
        revenueAirbnb: 0,
        revenueLuxe: 0,
        revenueVrbo: 0,
        revenueTripadvisor: 0,
        revenueBookingcom: 0,
        revenueStayone: 0,
      });
    }

    const monthRevenue = revenueByMonth.get(row.month)!;
    const revenue = row.revenue || 0;
    monthRevenue.bookedRevenue += revenue;

    switch (normalizeRevenueChannel(row.channel)) {
      case "airbnb":
        monthRevenue.revenueAirbnb += revenue;
        break;
      case "vrbo":
        monthRevenue.revenueVrbo += revenue;
        break;
      case "luxe":
        monthRevenue.revenueLuxe += revenue;
        break;
      case "tripadvisor":
        monthRevenue.revenueTripadvisor += revenue;
        break;
      case "bookingcom":
        monthRevenue.revenueBookingcom += revenue;
        break;
      case "stayone":
        monthRevenue.revenueStayone += revenue;
        break;
      case "direct":
      default:
        monthRevenue.revenueDirect += revenue;
        break;
    }
  }

  return months.map((month) => {
    if (month.year !== 2026) return month;

    return {
      ...month,
      ...(
        revenueByMonth.get(month.month) || {
          bookedRevenue: 0,
          revenueDirect: 0,
          revenueAirbnb: 0,
          revenueLuxe: 0,
          revenueVrbo: 0,
          revenueTripadvisor: 0,
          revenueBookingcom: 0,
          revenueStayone: 0,
        }
      ),
    };
  });
}

function normalizeRevenueChannel(channel: string | null): string {
  const normalized = (channel || "direct").toLowerCase().replace(/[^a-z0-9]/g, "");
  if (normalized === "airbnb") return "airbnb";
  if (normalized === "vrbo" || normalized === "homeaway") return "vrbo";
  if (normalized === "luxe") return "luxe";
  if (normalized === "tripadvisor") return "tripadvisor";
  if (normalized === "bookingcom") return "bookingcom";
  if (normalized === "stayone") return "stayone";
  return "direct";
}

export function getYearTotals(year: number) {
  const months = getMonthlyForYear(year);
  return months.reduce(
    (acc, m) => ({
      totalStays: acc.totalStays + (m.totalStays || 0),
      totalNights: acc.totalNights + (m.totalNights || 0),
      bookedRevenue: acc.bookedRevenue + (m.bookedRevenue || 0),
      revenueDirect: acc.revenueDirect + (m.revenueDirect || 0),
      revenueAirbnb: acc.revenueAirbnb + (m.revenueAirbnb || 0),
      revenueLuxe: acc.revenueLuxe + (m.revenueLuxe || 0),
      revenueVrbo: acc.revenueVrbo + (m.revenueVrbo || 0),
      revenueTripadvisor: acc.revenueTripadvisor + (m.revenueTripadvisor || 0),
      revenueBookingcom: acc.revenueBookingcom + (m.revenueBookingcom || 0),
      revenueStayone: acc.revenueStayone + (m.revenueStayone || 0),
    }),
    {
      totalStays: 0,
      totalNights: 0,
      bookedRevenue: 0,
      revenueDirect: 0,
      revenueAirbnb: 0,
      revenueLuxe: 0,
      revenueVrbo: 0,
      revenueTripadvisor: 0,
      revenueBookingcom: 0,
      revenueStayone: 0,
    },
  );
}

export function getAvailableYears(): number[] {
  const db = getSqlite();
  const rows = db
    .prepare(`SELECT DISTINCT year FROM monthly_aggregates ORDER BY year`)
    .all() as { year: number }[];
  return rows.map((r) => r.year);
}

export function getUpcomingBookings(limit = 10): BookingRow[] {
  const db = getSqlite();
  const today = new Date().toISOString().slice(0, 10);
  return db
    .prepare(
      `SELECT id, guest_name as guestName, guest_phone as guestPhone, guest_email as guestEmail,
              channel, status, check_in as checkIn, check_out as checkOut, nights,
              gross_revenue as grossRevenue, net_payout as netPayout,
              avg_nightly_rate as avgNightlyRate, num_adults as numAdults,
              internal_notes as internalNotes, booking_created_date as bookingCreatedDate
       FROM bookings
       WHERE check_in >= ? AND status IN ('booked','inquiry')
       ORDER BY check_in ASC
       LIMIT ?`,
    )
    .all(today, limit) as BookingRow[];
}

export function getAllBookings(): BookingRow[] {
  const db = getSqlite();
  return db
    .prepare(
      `SELECT id, guest_name as guestName, guest_phone as guestPhone, guest_email as guestEmail,
              channel, status, check_in as checkIn, check_out as checkOut, nights,
              gross_revenue as grossRevenue, net_payout as netPayout,
              avg_nightly_rate as avgNightlyRate, num_adults as numAdults,
              internal_notes as internalNotes, booking_created_date as bookingCreatedDate
       FROM bookings
       ORDER BY check_in DESC`,
    )
    .all() as BookingRow[];
}

export function getBooking(id: string): BookingDetail | undefined {
  const db = getSqlite();
  return db
    .prepare(
      `SELECT id, guest_id as guestId, guest_name as guestName, guest_phone as guestPhone,
              guest_email as guestEmail, guest_location as guestLocation,
              channel, channel_confirmation_code as channelConfirmationCode, status,
              check_in as checkIn, check_out as checkOut, nights,
              gross_revenue as grossRevenue, net_payout as netPayout,
              avg_nightly_rate as avgNightlyRate,
              num_adults as numAdults, num_children as numChildren, num_pets as numPets,
              cleaning_fee as cleaningFee, pet_fee as petFee, platform_fees as platformFees,
              taxes, refunds_discounts as refundsDiscounts,
              payout_received as payoutReceived, payout_received_date as payoutReceivedDate,
              security_deposit as securityDeposit,
              internal_notes as internalNotes, guest_notes as guestNotes, tags,
              booking_created_date as bookingCreatedDate
       FROM bookings WHERE id = ?`,
    )
    .get(id) as BookingDetail | undefined;
}

export type GuestRow = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  email: string | null;
  city: string | null;
  state: string | null;
  preferredChannel: string | null;
  tags: string | null;
  notes: string | null;
  sourceChannel: string | null;
  totalStays?: number;
  totalRevenue?: number;
  lastStay?: string | null;
};

export function getAllGuests(): GuestRow[] {
  const db = getSqlite();
  const guests = db
    .prepare(
      `SELECT g.id, g.first_name as firstName, g.last_name as lastName,
              g.phone, g.email, g.city, g.state,
              g.preferred_channel as preferredChannel, g.tags, g.notes,
              g.source_channel as sourceChannel,
              COUNT(b.id) as totalStays,
              COALESCE(SUM(b.gross_revenue), 0) as totalRevenue,
              MAX(b.check_in) as lastStay
       FROM guests g
       LEFT JOIN bookings b ON b.guest_id = g.id
       GROUP BY g.id
       ORDER BY g.last_name, g.first_name`,
    )
    .all() as GuestRow[];
  return guests;
}

export type GuestDetail = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  email: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  preferredChannel: string | null;
  tags: string | null;
  notes: string | null;
  communicationNotes: string | null;
  birthday: string | null;
  sourceChannel: string | null;
  createdAt: string | null;
};

export function getGuest(id: string): GuestDetail | undefined {
  const db = getSqlite();
  return db
    .prepare(
      `SELECT id, first_name as firstName, last_name as lastName, phone, email,
              city, state, country, preferred_channel as preferredChannel,
              tags, notes, communication_notes as communicationNotes,
              birthday, source_channel as sourceChannel, created_at as createdAt
       FROM guests WHERE id = ?`,
    )
    .get(id) as GuestDetail | undefined;
}

export function getBookingsForGuest(guestId: string): BookingRow[] {
  const db = getSqlite();
  return db
    .prepare(
      `SELECT id, guest_name as guestName, guest_phone as guestPhone, guest_email as guestEmail,
              channel, status, check_in as checkIn, check_out as checkOut, nights,
              gross_revenue as grossRevenue, net_payout as netPayout,
              avg_nightly_rate as avgNightlyRate, num_adults as numAdults,
              internal_notes as internalNotes, booking_created_date as bookingCreatedDate
       FROM bookings
       WHERE guest_id = ?
       ORDER BY check_in DESC`,
    )
    .all(guestId) as BookingRow[];
}

export type ChannelRow = {
  id: string;
  name: string;
  listingUrl: string | null;
  adminUrl: string | null;
  active: number;
  commissionRate: number | null;
  notes: string | null;
};

export function getAllChannels(): ChannelRow[] {
  const db = getSqlite();
  return db
    .prepare(
      `SELECT id, name, listing_url as listingUrl, admin_url as adminUrl,
              active, commission_rate as commissionRate, notes
       FROM channels ORDER BY active DESC, name`,
    )
    .all() as ChannelRow[];
}

export type ExpenseRow = {
  id: string;
  category: string;
  subcategory: string | null;
  monthlyOpex: number | null;
  monthlyCashOutflow: number | null;
  notes: string | null;
};

export function getAllExpenses(): ExpenseRow[] {
  const db = getSqlite();
  return db
    .prepare(
      `SELECT id, category, subcategory, monthly_opex as monthlyOpex,
              monthly_cash_outflow as monthlyCashOutflow, notes
       FROM expenses
       ORDER BY category, (subcategory = 'TOTAL') DESC, subcategory`,
    )
    .all() as ExpenseRow[];
}

export type InsightRow = {
  id: string;
  insightType: string;
  title: string;
  summary: string;
  supportingMetrics: string | null;
  priority: string;
  actionRecommendation: string | null;
  dismissed: number;
  generatedAt: string;
};

export function getActiveInsights(): InsightRow[] {
  const db = getSqlite();
  return db
    .prepare(
      `SELECT id, insight_type as insightType, title, summary,
              supporting_metrics as supportingMetrics, priority,
              action_recommendation as actionRecommendation, dismissed,
              generated_at as generatedAt
       FROM ai_insights WHERE dismissed = 0
       ORDER BY CASE priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
                generated_at DESC`,
    )
    .all() as InsightRow[];
}

export function getYtdAnchor(year: number, today: Date): { month: number } {
  // For current year, YTD is up to current month. For past years, full year.
  const currentYear = today.getFullYear();
  if (year < currentYear) return { month: 12 };
  return { month: today.getMonth() + 1 };
}

export type CompetitorRow = {
  id: string;
  name: string;
  platform: string | null;
  listingUrl: string;
  imageUrl: string | null;
  location: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  maxGuests: number | null;
  propertyType: string | null;
  amenities: string | null;
  avgRating: number | null;
  reviewCount: number | null;
  active: number;
  notes: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export function getAllCompetitors(): CompetitorRow[] {
  const db = getSqlite();
  return db
    .prepare(
      `SELECT id, name, platform, listing_url as listingUrl, image_url as imageUrl, location,
              bedrooms, bathrooms, max_guests as maxGuests, property_type as propertyType,
              amenities, avg_rating as avgRating, review_count as reviewCount,
              active, notes, created_at as createdAt, updated_at as updatedAt
       FROM competitors
       ORDER BY active DESC, name`,
    )
    .all() as CompetitorRow[];
}

export function getCompetitor(id: string): CompetitorRow | undefined {
  const db = getSqlite();
  return db
    .prepare(
      `SELECT id, name, platform, listing_url as listingUrl, image_url as imageUrl, location,
              bedrooms, bathrooms, max_guests as maxGuests, property_type as propertyType,
              amenities, avg_rating as avgRating, review_count as reviewCount,
              active, notes, created_at as createdAt, updated_at as updatedAt
       FROM competitors WHERE id = ?`,
    )
    .get(id) as CompetitorRow | undefined;
}

export type CompPricingRow = {
  id: string;
  competitorId: string;
  competitorName?: string;
  date: string;
  nightlyRate: number | null;
  minimumNights: number | null;
  available: number;
  source: string | null;
  notes: string | null;
};

export function getCompPricing(opts?: {
  competitorId?: string;
  fromDate?: string;
  toDate?: string;
  limit?: number;
}): CompPricingRow[] {
  const db = getSqlite();
  const where: string[] = [];
  const params: any[] = [];
  if (opts?.competitorId) {
    where.push("competitor_id = ?");
    params.push(opts.competitorId);
  }
  if (opts?.fromDate) {
    where.push("date >= ?");
    params.push(opts.fromDate);
  }
  if (opts?.toDate) {
    where.push("date <= ?");
    params.push(opts.toDate);
  }
  const whereClause = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";
  const limit = opts?.limit ? `LIMIT ${opts.limit}` : "";
  return db
    .prepare(
      `SELECT s.id, s.competitor_id as competitorId, c.name as competitorName,
              s.date, s.nightly_rate as nightlyRate, s.minimum_nights as minimumNights,
              s.available, s.source, s.notes
       FROM comp_pricing_snapshots s
       LEFT JOIN competitors c ON c.id = s.competitor_id
       ${whereClause}
       ORDER BY s.date DESC, c.name
       ${limit}`,
    )
    .all(...params) as CompPricingRow[];
}

export type KnowledgeRow = {
  id: string;
  type: string;
  title: string | null;
  content: string;
  tags: string | null;
  source: string | null;
  relatedBookingId: string | null;
  relatedGuestId: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  archived: number;
};

export function getAllKnowledge(opts?: {
  type?: string;
  search?: string;
  includeArchived?: boolean;
}): KnowledgeRow[] {
  const db = getSqlite();
  const where: string[] = [];
  const params: any[] = [];
  if (!opts?.includeArchived) where.push("archived = 0");
  if (opts?.type) {
    where.push("type = ?");
    params.push(opts.type);
  }
  if (opts?.search) {
    where.push("(LOWER(title) LIKE ? OR LOWER(content) LIKE ? OR LOWER(tags) LIKE ?)");
    const s = `%${opts.search.toLowerCase()}%`;
    params.push(s, s, s);
  }
  const whereClause = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";
  return db
    .prepare(
      `SELECT id, type, title, content, tags, source,
              related_booking_id as relatedBookingId,
              related_guest_id as relatedGuestId,
              created_at as createdAt, updated_at as updatedAt, archived
       FROM knowledge_base
       ${whereClause}
       ORDER BY datetime(updated_at) DESC, datetime(created_at) DESC`,
    )
    .all(...params) as KnowledgeRow[];
}

export function getKnowledge(id: string): KnowledgeRow | undefined {
  const db = getSqlite();
  return db
    .prepare(
      `SELECT id, type, title, content, tags, source,
              related_booking_id as relatedBookingId,
              related_guest_id as relatedGuestId,
              created_at as createdAt, updated_at as updatedAt, archived
       FROM knowledge_base WHERE id = ?`,
    )
    .get(id) as KnowledgeRow | undefined;
}
