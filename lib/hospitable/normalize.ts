export type NormalizedHospitableBooking = {
  externalId: string;
  channelConfirmationCode: string;
  platformConfirmationCode: string | null;
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

function cents(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value / 100;
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) return Number(value) / 100;
  return 0;
}

function money(obj: unknown, paths: string[]): number {
  for (const path of paths) {
    const value = get(obj, path);
    const converted = cents(value);
    if (converted) return converted;
  }
  return 0;
}

function sumMoneyList(obj: unknown, path: string, labels: string[]): number {
  const value = get(obj, path);
  if (!Array.isArray(value)) return 0;
  const needles = labels.map((label) => label.toLowerCase());
  return value.reduce((total, item) => {
    if (!isDict(item)) return total;
    const label = String(item.label || item.category || "").toLowerCase();
    if (!needles.some((needle) => label.includes(needle))) return total;
    return total + cents(item.amount);
  }, 0);
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

function titleCase(value: string) {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function normalizeChannel(platform: string | null): string {
  const p = (platform || "").toLowerCase();
  if (p.includes("airbnb")) return "Airbnb";
  if (p.includes("vrbo") || p.includes("homeaway")) return "VRBO";
  if (p.includes("booking")) return "Booking.com";
  if (p.includes("tripadvisor")) return "TripAdvisor";
  if (p.includes("direct") || p.includes("manual") || p.includes("website")) return "Direct";
  return platform ? titleCase(platform) : process.env.HOSPITABLE_DEFAULT_CHANNEL || "Hospitable";
}

function normalizeStatus(rawStatus: string | null, obj: unknown, checkOut: string | null): string {
  const status = (rawStatus || "").toLowerCase();
  const reservationStatus = String(get(obj, "reservation_status") || "").toLowerCase();
  const stayType = String(get(obj, "stay_type") || "").toLowerCase();
  const ownerStay = get(obj, "owner_stay") === true;
  const combined = `${status} ${reservationStatus}`;

  if (ownerStay || stayType.includes("owner")) return "owner_block";
  if (combined.includes("cancel") || combined.includes("declin") || combined.includes("reject")) return "cancelled";
  if (combined.includes("inquir") || combined.includes("pending") || combined.includes("tentative")) return "inquiry";
  if (checkOut && Date.parse(`${checkOut}T00:00:00Z`) < Date.now()) return "completed";
  return "booked";
}

function guestName(obj: unknown) {
  const explicit = firstString(obj, ["guest.name", "guest.full_name", "guest_name"]);
  if (explicit) return explicit;
  const first = firstString(obj, ["guest.first_name"]);
  const last = firstString(obj, ["guest.last_name"]);
  return [first, last].filter(Boolean).join(" ") || null;
}

function guestPhone(obj: unknown) {
  const direct = firstString(obj, ["guest.phone", "guest.phone_number"]);
  if (direct) return direct;
  const phoneNumbers = get(obj, "guest.phone_numbers");
  if (Array.isArray(phoneNumbers) && phoneNumbers.length) return String(phoneNumbers[0]);
  return null;
}

export function normalizeHospitableBooking(obj: unknown): NormalizedHospitableBooking | null {
  const warnings: string[] = [];
  const externalId = firstString(obj, ["id", "reservation_id"]);
  const checkIn = toDateOnly(firstString(obj, ["arrival_date", "check_in", "start_date"]));
  const checkOut = toDateOnly(firstString(obj, ["departure_date", "check_out", "end_date"]));

  if (!externalId) warnings.push("Missing Hospitable reservation id");
  if (!checkIn) warnings.push("Missing arrival/check-in date");
  if (!checkOut) warnings.push("Missing departure/check-out date");
  if (!externalId || !checkIn || !checkOut) return null;

  const rawStatus = firstString(obj, ["status", "reservation_status"]);
  const channel = normalizeChannel(firstString(obj, ["platform"]));
  const status = normalizeStatus(rawStatus, obj, checkOut);
  const nights = firstNumber(obj, ["nights"]) || nightsBetween(checkIn, checkOut);
  const grossRevenue =
    money(obj, ["financials.guest.total_price.amount", "financials.host.accommodation.amount"]) ||
    firstNumber(obj, ["gross_revenue", "total_amount"]);
  const netPayout = money(obj, ["financials.host.revenue.amount"]) || grossRevenue;
  const cleaningFee = sumMoneyList(obj, "financials.guest.fees", ["cleaning"]);
  const petFee = sumMoneyList(obj, "financials.guest.fees", ["pet"]);
  const platformFees = Math.abs(sumMoneyList(obj, "financials.host.host_fees", ["service", "platform", "host"]));
  const taxes = sumMoneyList(obj, "financials.guest.taxes", ["tax"]);
  const avgNightlyRate = money(obj, ["financials.guest.average_nightly_rate.amount"]);
  const code = firstString(obj, ["code", "platform_id"]);

  const tags = Array.from(new Set(["hospitable", channel.toLowerCase().replace(/[^a-z0-9]+/g, "-")])).filter(Boolean);

  return {
    externalId,
    channelConfirmationCode: `hospitable:${externalId}`,
    platformConfirmationCode: code,
    propertyId: APP_PROPERTY_ID,
    channel,
    status,
    guestName: guestName(obj),
    guestPhone: guestPhone(obj),
    guestEmail: firstString(obj, ["guest.email"]),
    guestLocation: firstString(obj, ["guest.location"]),
    numAdults: firstNumber(obj, ["guests.adult_count"]),
    numChildren: firstNumber(obj, ["guests.child_count", "guests.infant_count"]),
    numPets: firstNumber(obj, ["guests.pet_count"]),
    checkIn,
    checkOut,
    nights,
    bookingCreatedDate: toDateOnly(firstString(obj, ["booking_date", "created_at"])),
    grossRevenue,
    cleaningFee,
    petFee,
    platformFees,
    taxes,
    netPayout,
    avgNightlyRate: avgNightlyRate || (nights > 0 ? grossRevenue / nights : 0),
    internalNotes: `Imported from Hospitable reservation ${code || externalId}.`,
    tags: JSON.stringify(tags),
    warnings,
    rawStatus,
  };
}

export function overlapsDateRange(booking: NormalizedHospitableBooking, from: string, to: string) {
  return booking.checkIn < to && from < booking.checkOut;
}
