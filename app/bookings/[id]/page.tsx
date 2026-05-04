import SubHeader from "@/components/SubHeader";
import BookingForm from "../BookingForm";
import BookingDeleteButton from "./BookingDeleteButton";
import { getBooking } from "@/lib/queries";
import { notFound } from "next/navigation";
import { formatDateFull, formatMoney, channelBadgeClass } from "@/lib/format";

export const dynamic = "force-dynamic";

export default function BookingDetailPage({ params }: { params: { id: string } }) {
  const b = getBooking(params.id);
  if (!b) notFound();

  return (
    <>
      <SubHeader
        title={b.guestName || "Booking"}
        subtitle={`${formatDateFull(b.checkIn || "")} → ${formatDateFull(b.checkOut || "")} · ${b.nights || 0} nights`}
        actions={
          <div className="flex items-center gap-2">
            {b.channel && (
              <span className={`${channelBadgeClass(b.channel)} px-3 py-1 rounded text-sm font-medium`}>
                {b.channel}
              </span>
            )}
            <BookingDeleteButton id={b.id} guestName={b.guestName} />
          </div>
        }
      />
      <div className="px-6 py-6 space-y-4">
        <div className="grid grid-cols-4 gap-4">
          <Stat label="Revenue" value={formatMoney(b.grossRevenue || 0)} />
          <Stat label="Net Payout" value={formatMoney(b.netPayout || 0)} />
          <Stat label="ADR" value={formatMoney(b.avgNightlyRate || 0)} />
          <Stat label="Status" value={b.status || "—"} />
        </div>
        <BookingForm initial={b as any} />
      </div>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="data-card rounded-lg p-4">
      <div className="text-xs text-gray-400 font-medium mb-1">{label}</div>
      <div className="text-xl font-bold font-mono text-[#161616]">{value}</div>
    </div>
  );
}
