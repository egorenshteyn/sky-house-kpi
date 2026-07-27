import type { BookingRow } from "./queries";

export const BOOKING_SORT_KEYS = [
  "guest",
  "channel",
  "status",
  "bookingDate",
  "checkIn",
  "checkOut",
  "nights",
  "revenue",
  "adr",
] as const;

export type BookingSortKey = (typeof BOOKING_SORT_KEYS)[number];
export type SortDirection = "asc" | "desc";

export type BookingFilters = {
  q?: string;
  channel?: string;
  status?: string;
};

export function parseBookingSort(searchParams: {
  sort?: string;
  direction?: string;
}): { sortKey: BookingSortKey; direction: SortDirection } {
  const sortKey = BOOKING_SORT_KEYS.includes(searchParams.sort as BookingSortKey)
    ? (searchParams.sort as BookingSortKey)
    : "checkIn";
  const direction = searchParams.direction === "asc" || searchParams.direction === "desc"
    ? searchParams.direction
    : "desc";
  return { sortKey, direction };
}

const valueForSort: Record<BookingSortKey, (booking: BookingRow) => string | number | null> = {
  guest: (booking) => booking.guestName,
  channel: (booking) => booking.channel,
  status: (booking) => booking.status,
  bookingDate: (booking) => booking.bookingCreatedDate,
  checkIn: (booking) => booking.checkIn,
  checkOut: (booking) => booking.checkOut,
  nights: (booking) => booking.nights,
  revenue: (booking) => booking.grossRevenue,
  adr: (booking) => booking.avgNightlyRate,
};

function isNullish(value: string | number | null): value is null | "" {
  return value === null || value === "";
}

function compareValues(
  left: string | number | null,
  right: string | number | null,
  direction: SortDirection,
): number {
  const leftNull = isNullish(left);
  const rightNull = isNullish(right);
  if (leftNull || rightNull) {
    if (leftNull && rightNull) return 0;
    return leftNull ? 1 : -1;
  }

  const result =
    typeof left === "number" && typeof right === "number"
      ? left - right
      : String(left).localeCompare(String(right), "en", { numeric: true, sensitivity: "base" });
  return direction === "asc" ? result : -result;
}

export function filterAndSortBookings(
  bookings: BookingRow[],
  filters: BookingFilters,
  sortKey: BookingSortKey,
  direction: SortDirection,
): BookingRow[] {
  const q = (filters.q || "").trim().toLowerCase();
  const filtered = bookings.filter((booking) => {
    if (filters.channel && booking.channel !== filters.channel) return false;
    if (filters.status && booking.status !== filters.status) return false;
    if (!q) return true;
    return [booking.guestName, booking.guestPhone, booking.guestEmail].some((value) =>
      (value || "").toLowerCase().includes(q),
    );
  });

  const getValue = valueForSort[sortKey];
  return [...filtered].sort((left, right) => {
    const compared = compareValues(getValue(left), getValue(right), direction);
    return compared || left.id.localeCompare(right.id);
  });
}
