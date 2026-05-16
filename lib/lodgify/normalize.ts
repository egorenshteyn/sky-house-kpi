export type NormalizedLodgifyBooking = {
  externalId: string;
  channelConfirmationCode: string;
  propertyId: string;
  channel: string;
  status: string;
  guestName: string | null;
  guestPhone: string | null;
  guestEmail: string | null;
  guestLocation: string | null;
  numAdults: number;
  numChildren: number;
  numPets: number;
  checkIn: string;
  checkOut: string;
  nights: number;
  bookingCreatedDate: string | null;
  grossRevenue: number;
  cleaningFee: number;
  petFee: number;
  platformFees: number;
  taxes: number;
  netPayout: number;
  avgNightlyRate: number;
  internalNotes: string;
  tags: string;
  warnings: string[];
  rawStatus: string | null;
  isDeleted: boolean;
};

type Dict = Record<string, unknown>;

const APP_PROPERTY_ID = "skyhouse-dillon-beach";

function isDict(value: unknown): value is Dict {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function get(obj: unknown, path: string): unknown {
  if (!isDict(obj)) return undefined;
  return path.split(".").reduce<unknown>((acc, key) => (isDict(acc) ? acc[key] : undefined), obj);
}

function firstString(obj: unknown, paths: string[]): string | null {
  for (const path of paths) {
    const value = get(obj, path);
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return null;
}

function firstNumber(obj: unknown, paths: string[]): number {
  for (const path of paths) {
    const value = get(obj, path);
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) return Number(value);
  }
  return 0;
}

function toDateOnly(value: string | null): string | null {
  if (!value) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

function nightsBetween(checkIn: string, checkOut: string): number {
  const start = Date.parse(`${checkIn}T00:00:00Z`);
  const end = Date.parse(`${checkOut}T00:00:00Z`);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 0;
  return Math.round((end - start) / 86_400_000);
}

function sumSubtotals(obj: unknown, names: string[]): number {
  const subtotals = get(obj, "subtotals");
  if (!Array.isArray(subtotals)) return 0;
  const needles = names.map((n) => n.toLowerCase());
  return subtotals.reduce((total, item) => {
    if (!isDict(item)) return total;
    const label = String(item.name || item.description || item.type || "").toLowerCase();
    if (!needles.some((needle) => label.includes(needle))) return total;
    const amount = firstNumber(item, ["amount", "value", "total", "price"]);
    return total + amount;
  }, 0);
}

function normalizeChannel(source: string | null, sourceText: string | null): string {
  const combined = `${source || ""} ${sourceText || ""}`.toLowerCase();
  if (combined.includes("airbnb")) return "Airbnb";
  if (combined.includes("vrbo") || combined.includes("homeaway")) return "VRBO";
  if (combined.includes("booking")) return "Booking.com";
  if (combined.includes("tripadvisor")) return "TripAdvisor";
  if (combined.includes("direct") || combined.includes("manual") || combined.includes("website")) return "Direct";
  return sourceText || source || process.env.LODGIFY_DEFAULT_CHANNEL || "Lodgify";
}

function normalizeStatus(rawStatus: string | null, obj: unknown): string {
  const status = (rawStatus || "").toLowerCase();
  const isUnavailable = get(obj, "is_unavailable") === true;
  const isDeleted = get(obj, "is_deleted") === true;
  const canceledAt = firstString(obj, ["canceled_at", "cancelled_at"]);

  if (isDeleted || canceledAt || status.includes("cancel")) return "cancelled";
  if (status.includes("declin") || status.includes("reject")) return "cancelled";
  if (status.includes("tentative") || status.includes("inquir") || status.includes("quote")) return "inquiry";
  if (isUnavailable) return "owner_block";
  return "booked";
}

function guestLocation(obj: unknown): string | null {
  const city = firstString(obj, ["guest.city", "guest.address.city", "customer.city"]);
  const state = firstString(obj, ["guest.state", "guest.address.state", "customer.state"]);
  const country = firstString(obj, ["guest.country", "guest.address.country", "customer.country"]);
  return [city, state, country].filter(Boolean).join(", ") || null;
}

export function normalizeLodgifyBooking(obj: unknown): NormalizedLodgifyBooking | null {
  const warnings: string[] = [];
  const externalId = firstString(obj, ["id", "booking_id", "reservation_id"]);
  const checkIn = toDateOnly(firstString(obj, ["arrival", "check_in", "start", "start_date"]));
  const checkOut = toDateOnly(firstString(obj, ["departure", "check_out", "end", "end_date"]));

  if (!externalId) warnings.push("Missing Lodgify booking id");
  if (!checkIn) warnings.push("Missing arrival/check-in date");
  if (!checkOut) warnings.push("Missing departure/check-out date");
  if (!externalId || !checkIn || !checkOut) return null;

  const rooms = get(obj, "rooms");
  const firstRoom = Array.isArray(rooms) ? rooms[0] : undefined;
  const rawStatus = firstString(obj, ["status"]);
  const source = firstString(obj, ["source"]);
  const sourceText = firstString(obj, ["source_text", "external_booking.channel"]);
  const channel = normalizeChannel(source, sourceText);
  const status = normalizeStatus(rawStatus, obj);
  const nights = nightsBetween(checkIn, checkOut);
  const grossRevenue = firstNumber(obj, ["total_amount", "quote.total", "quote.total_amount", "amount"]);
  const netPayout = firstNumber(obj, ["amount_paid", "quote.net_amount", "net_payout"]) || grossRevenue;
  const adults = firstNumber(firstRoom, ["guest_breakdown.adults", "adults", "people"]);
  const children = firstNumber(firstRoom, ["guest_breakdown.children", "children"]);
  const pets = firstNumber(firstRoom, ["guest_breakdown.pets", "pets"]);

  const tags = Array.from(new Set(["lodgify", channel.toLowerCase().replace(/[^a-z0-9]+/g, "-")])).filter(Boolean);

  return {
    externalId,
    channelConfirmationCode: `lodgify:${externalId}`,
    propertyId: APP_PROPERTY_ID,
    channel,
    status,
    guestName: firstString(obj, ["guest.name", "guest.full_name", "guest_name", "customer.name"]),
    guestPhone: firstString(obj, ["guest.phone", "guest.phone_number", "guest.mobile", "customer.phone"]),
    guestEmail: firstString(obj, ["guest.email", "customer.email"]),
    guestLocation: guestLocation(obj),
    numAdults: adults,
    numChildren: children,
    numPets: pets,
    checkIn,
    checkOut,
    nights,
    bookingCreatedDate: toDateOnly(firstString(obj, ["created_at", "booking_created_date"])),
    grossRevenue,
    cleaningFee: firstNumber(obj, ["quote.cleaning_fee", "cleaning_fee"]) || sumSubtotals(obj, ["cleaning"]),
    petFee: firstNumber(obj, ["quote.pet_fee", "pet_fee"]) || sumSubtotals(obj, ["pet"]),
    platformFees: firstNumber(obj, ["quote.platform_fees", "platform_fees"]) || sumSubtotals(obj, ["service", "platform"]),
    taxes: firstNumber(obj, ["quote.taxes", "taxes"]) || sumSubtotals(obj, ["tax"]),
    netPayout,
    avgNightlyRate: nights > 0 ? grossRevenue / nights : 0,
    internalNotes: `Imported from Lodgify booking ${externalId}${sourceText ? ` (${sourceText})` : ""}.`,
    tags: JSON.stringify(tags),
    warnings,
    rawStatus,
    isDeleted: get(obj, "is_deleted") === true,
  };
}

export function overlapsDateRange(booking: NormalizedLodgifyBooking, from: string, to: string) {
  return booking.checkIn < to && from < booking.checkOut;
}
