import Link from "next/link";
import { formatBookingDate, formatMoney, channelBadgeClass } from "@/lib/format";

type Booking = {
  id: string; guestName?: string | null; channel?: string | null; status?: string | null;
  checkIn?: string | null; checkOut?: string | null; nights?: number | null;
  grossRevenue?: number | null; avgNightlyRate?: number | null;
};
export default function BookingCards({ bookings }: { bookings: Booking[] }) {
  return <div className="record-list lg:hidden">
    {bookings.map((b) => <article key={b.id} className="record-card">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3><Link href={`/bookings/${b.id}`}>{b.guestName || "Booking"}</Link></h3>
        <span className={`${channelBadgeClass(b.channel || "")} px-2 py-1 rounded text-xs`}>{b.channel || "No channel"}</span>
      </div>
      <p className="text-xs text-gray-500 mt-1">{b.status?.replaceAll("_", " ") || "No status"} · {b.nights || 0} nights</p>
      <dl>
        <div><dt>Check-in</dt><dd>{formatBookingDate(b.checkIn || "")}</dd></div>
        <div><dt>Check-out</dt><dd>{formatBookingDate(b.checkOut || "")}</dd></div>
        <div><dt>Revenue</dt><dd className="font-mono font-medium">{formatMoney(b.grossRevenue || 0)}</dd></div>
        <div><dt>Nightly rate</dt><dd className="font-mono">{formatMoney(b.avgNightlyRate || 0)}</dd></div>
      </dl>
      <Link href={`/bookings/${b.id}`} className="record-link">View booking <span aria-hidden="true" className="ml-auto">→</span></Link>
    </article>)}
  </div>;
}
