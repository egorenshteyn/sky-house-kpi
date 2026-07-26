import SubHeader from "@/components/SubHeader";
import Link from "next/link";
import { getAllBookings } from "@/lib/queries";
import { formatBookingDate, formatMoney, channelBadgeClass } from "@/lib/format";
import BookingsFilters from "./BookingsFilters";

export const dynamic = "force-dynamic";

export default function BookingsPage({
  searchParams,
}: {
  searchParams?: { q?: string; channel?: string; status?: string };
}) {
  const q = (searchParams?.q || "").toLowerCase();
  const channel = searchParams?.channel || "";
  const status = searchParams?.status || "";

  let bookings = getAllBookings();
  if (q) {
    bookings = bookings.filter(
      (b) =>
        (b.guestName || "").toLowerCase().includes(q) ||
        (b.guestPhone || "").toLowerCase().includes(q) ||
        (b.guestEmail || "").toLowerCase().includes(q),
    );
  }
  if (channel) bookings = bookings.filter((b) => b.channel === channel);
  if (status) bookings = bookings.filter((b) => b.status === status);

  const total = bookings.reduce((acc, b) => acc + (b.grossRevenue || 0), 0);

  return (
    <>
      <SubHeader
        title="Bookings"
        subtitle={`${bookings.length} bookings · ${formatMoney(total, { compact: true })} total revenue`}
        actions={
          <Link href="/bookings/new" className="btn-primary inline-flex items-center gap-1.5 !text-white">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Booking
          </Link>
        }
      />
      <div className="px-6 py-6 space-y-4">
        <BookingsFilters initial={{ q, channel, status }} />

        <div className="data-card rounded-lg overflow-hidden">
          {bookings.length === 0 ? (
            <div className="px-5 py-12 text-center text-sm text-gray-400">
              No bookings match these filters.{" "}
              <Link href="/bookings/new" className="text-[#0f62fe]">
                Add a new booking
              </Link>
              .
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-400 font-mono uppercase bg-gray-50/50">
                  <th className="px-5 py-2.5 font-medium">Guest</th>
                  <th className="px-5 py-2.5 font-medium">Phone</th>
                  <th className="px-5 py-2.5 font-medium">Channel</th>
                  <th className="px-5 py-2.5 font-medium">Status</th>
                  <th className="px-5 py-2.5 font-medium">Check-in</th>
                  <th className="px-5 py-2.5 font-medium">Check-out</th>
                  <th className="px-5 py-2.5 font-medium">Nts</th>
                  <th className="px-5 py-2.5 font-medium text-right">Revenue</th>
                  <th className="px-5 py-2.5 font-medium text-right">ADR</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {bookings.map((b) => (
                  <tr key={b.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-3">
                      <Link
                        href={`/bookings/${b.id}`}
                        className="font-medium hover:text-[#0f62fe]"
                      >
                        {b.guestName || "—"}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-gray-600 font-mono text-xs">
                      {b.guestPhone || "—"}
                    </td>
                    <td className="px-5 py-3">
                      {b.channel ? (
                        <span
                          className={`${channelBadgeClass(b.channel)} px-2 py-0.5 rounded text-xs font-medium`}
                        >
                          {b.channel}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-5 py-3 text-xs text-gray-500">{b.status || "—"}</td>
                    <td className="px-5 py-3 text-gray-600 font-mono text-xs">
                      {formatBookingDate(b.checkIn || "")}
                    </td>
                    <td className="px-5 py-3 text-gray-600 font-mono text-xs">
                      {formatBookingDate(b.checkOut || "")}
                    </td>
                    <td className="px-5 py-3 font-mono">{b.nights || 0}</td>
                    <td className="px-5 py-3 text-right font-mono font-semibold">
                      {formatMoney(b.grossRevenue || 0)}
                    </td>
                    <td className="px-5 py-3 text-right font-mono text-gray-400">
                      {formatMoney(b.avgNightlyRate || 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}
