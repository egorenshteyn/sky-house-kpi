import type { BookingRow } from "./queries";

const BLOCK_STATUSES = new Set(["owner_block", "maintenance_block"]);

function monthStart(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}-01`;
}

export function isCalendarBlock(status: string | null): boolean {
  return BLOCK_STATUSES.has(status || "");
}

export function getCalendarMonthSummary(bookings: BookingRow[], year: number, month: number) {
  const start = monthStart(year, month);
  const next = month === 12 ? monthStart(year + 1, 1) : monthStart(year, month + 1);
  const checkInPrefix = start.slice(0, 7);

  const stays = bookings.filter(
    (booking) =>
      !isCalendarBlock(booking.status) &&
      booking.checkIn?.startsWith(checkInPrefix),
  );
  const blocks = bookings.filter((booking) => {
    if (!isCalendarBlock(booking.status) || !booking.checkIn) return false;
    if (!booking.checkOut) return booking.checkIn.startsWith(checkInPrefix);
    return booking.checkIn < next && booking.checkOut > start;
  });

  return {
    stays,
    blocks,
    revenue: stays.reduce((total, booking) => total + (booking.grossRevenue || 0), 0),
  };
}
