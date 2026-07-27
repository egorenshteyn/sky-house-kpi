import SubHeader from "@/components/SubHeader";
import Link from "next/link";
import { getAllBookings } from "@/lib/queries";
import { formatBookingDate, formatMoney, channelBadgeClass } from "@/lib/format";
import BookingsFilters from "./BookingsFilters";
import BookingsTableHeader from "./BookingsTableHeader";
import { filterAndSortBookings, parseBookingSort } from "@/lib/booking-list";

export const dynamic = "force-dynamic";

export default function BookingsPage({
  searchParams,
}: {
  searchParams?: {
    q?: string;
    channel?: string;
    status?: string;
    sort?: string;
    direction?: string;
  };
}) {
  const q = searchParams?.q || "";
  const channel = searchParams?.channel || "";
  const status = searchParams?.status || "";
  const { sortKey, direction } = parseBookingSort(searchParams || {});

  const bookings = filterAndSortBookings(
    getAllBookings(),
    { q, channel, status },
    sortKey,
    direction,
  );

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
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px] text-sm">
                <BookingsTableHeader
                  activeSort={sortKey}
                  direction={direction}
                  searchParams={{ q, channel, status }}
                />
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
                    <td className="px-5 py-3 text-gray-600 font-mono text-xs whitespace-nowrap">
                      {formatBookingDate(b.bookingCreatedDate || "")}
                    </td>
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
            </div>
          )}
        </div>
      </div>
    </>
  );
}
