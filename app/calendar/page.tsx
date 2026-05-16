import SubHeader from "@/components/SubHeader";
import { getAllBookings } from "@/lib/queries";
import { channelColor, formatMoney } from "@/lib/format";
import Link from "next/link";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export const dynamic = "force-dynamic";

export default function CalendarPage({
  searchParams,
}: {
  searchParams?: { year?: string; month?: string };
}) {
  const today = new Date();
  const year = parseInt(searchParams?.year || String(today.getFullYear()));
  const month = parseInt(searchParams?.month || String(today.getMonth() + 1));

  const bookings = getAllBookings().filter((b) =>
    ["booked", "completed", "owner_block", "maintenance_block"].includes(b.status || "booked"),
  );

  const firstOfMonth = new Date(Date.UTC(year, month - 1, 1));
  const startWeekday = firstOfMonth.getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();

  const cells: { date: Date | null }[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push({ date: null });
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ date: new Date(Date.UTC(year, month - 1, d)) });
  }
  while (cells.length % 7 !== 0) cells.push({ date: null });

  function bookingsCovering(date: Date) {
    const iso = date.toISOString().slice(0, 10);
    return bookings.filter((b) => {
      if (!b.checkIn || !b.checkOut) return false;
      return b.checkIn <= iso && iso < b.checkOut;
    });
  }

  function bookingsStartingOn(date: Date) {
    const iso = date.toISOString().slice(0, 10);
    return bookings.filter((b) => b.checkIn === iso);
  }

  const monthBookings = bookings.filter(
    (b) => b.checkIn && b.checkIn.startsWith(`${year}-${String(month).padStart(2, "0")}`),
  );
  const monthRevenue = monthBookings.reduce((a, b) => a + (b.grossRevenue || 0), 0);

  const prev = month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
  const next = month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 };

  return (
    <>
      <SubHeader
        title="Booking Calendar"
        subtitle={`${MONTH_NAMES[month - 1]} ${year} · ${monthBookings.length} stays · ${formatMoney(monthRevenue, { compact: true })}`}
        actions={
          <div className="flex items-center gap-2">
            <Link
              href={`/calendar?year=${prev.year}&month=${prev.month}`}
              className="text-sm border border-gray-200 rounded-md px-3 py-1.5 text-gray-600 hover:bg-gray-50"
            >
              ←
            </Link>
            <Link
              href={`/calendar?year=${today.getFullYear()}&month=${today.getMonth() + 1}`}
              className="text-sm border border-gray-200 rounded-md px-3 py-1.5 text-gray-600 hover:bg-gray-50"
            >
              Today
            </Link>
            <Link
              href={`/calendar?year=${next.year}&month=${next.month}`}
              className="text-sm border border-gray-200 rounded-md px-3 py-1.5 text-gray-600 hover:bg-gray-50"
            >
              →
            </Link>
          </div>
        }
      />
      <div className="px-6 py-6">
        <div className="data-card rounded-lg overflow-hidden">
          <div className="grid grid-cols-7 border-b border-gray-100">
            {DAY_LABELS.map((d) => (
              <div
                key={d}
                className="px-3 py-2 text-xs font-mono uppercase text-gray-400 text-center"
              >
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {cells.map((cell, i) => {
              if (!cell.date) {
                return (
                  <div
                    key={i}
                    className="min-h-[120px] border-r border-b border-gray-100 bg-gray-50/30"
                  />
                );
              }
              const covering = bookingsCovering(cell.date);
              const starting = bookingsStartingOn(cell.date);
              const isToday =
                cell.date.toISOString().slice(0, 10) === today.toISOString().slice(0, 10);
              return (
                <div
                  key={i}
                  className={`min-h-[120px] border-r border-b border-gray-100 p-2 ${
                    isToday ? "bg-blue-50/30" : "bg-white"
                  }`}
                >
                  <div
                    className={`text-xs font-mono mb-1.5 ${
                      isToday ? "text-[#0f62fe] font-semibold" : "text-gray-500"
                    }`}
                  >
                    {cell.date.getUTCDate()}
                  </div>
                  <div className="space-y-1">
                    {starting.map((b) => (
                      <Link
                        key={b.id}
                        href={`/bookings/${b.id}`}
                        className="block text-xs px-1.5 py-0.5 rounded text-white truncate"
                        style={{ background: channelColor(b.channel || "") }}
                        title={`${b.guestName} — ${b.nights} nights — ${formatMoney(b.grossRevenue || 0)}`}
                      >
                        {b.guestName}
                      </Link>
                    ))}
                    {covering.length === 0 && (
                      <div className="text-[10px] text-gray-300">—</div>
                    )}
                    {covering.length > 0 && starting.length === 0 && (
                      <div className="space-y-0.5">
                        {covering.map((b) => (
                          <div
                            key={b.id}
                            className="h-1 rounded-full"
                            style={{ background: channelColor(b.channel || "") }}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-4 flex items-center gap-3 text-xs text-gray-500">
          <span className="font-mono">Legend:</span>
          {["Direct", "Airbnb", "Luxe", "VRBO"].map((c) => (
            <span key={c} className="flex items-center gap-1.5">
              <span
                className="w-3 h-3 rounded-sm"
                style={{ background: channelColor(c) }}
              />
              {c}
            </span>
          ))}
        </div>
      </div>
    </>
  );
}
