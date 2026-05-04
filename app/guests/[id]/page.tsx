import SubHeader from "@/components/SubHeader";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getGuest, getBookingsForGuest } from "@/lib/queries";
import {
  formatMoney,
  formatDateShort,
  channelBadgeClass,
} from "@/lib/format";

export const dynamic = "force-dynamic";

export default function GuestDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const guest = getGuest(params.id);
  if (!guest) notFound();

  const bookings = getBookingsForGuest(guest.id);
  const totalRevenue = bookings.reduce(
    (a, b) => a + (b.grossRevenue || 0),
    0,
  );
  const totalNights = bookings.reduce((a, b) => a + (b.nights || 0), 0);
  const fullName =
    [guest.firstName, guest.lastName].filter(Boolean).join(" ") || "Guest";
  const location = [guest.city, guest.state, guest.country]
    .filter(Boolean)
    .join(", ");

  let tags: string[] = [];
  if (guest.tags) {
    try {
      const parsed = JSON.parse(guest.tags);
      if (Array.isArray(parsed)) tags = parsed as string[];
    } catch {
      tags = guest.tags
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    }
  }

  return (
    <>
      <SubHeader
        title={fullName}
        subtitle={`${bookings.length} stay${bookings.length === 1 ? "" : "s"} · ${totalNights} nights · ${formatMoney(totalRevenue)} lifetime`}
        actions={
          <Link
            href="/guests"
            className="text-sm text-gray-600 hover:text-[#161616] px-3 py-1.5 rounded border border-gray-200"
          >
            ← All guests
          </Link>
        }
      />
      <div className="px-6 py-6 space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <div className="data-card rounded-lg p-5 col-span-1 space-y-3">
            <h3 className="text-sm font-semibold text-[#161616]">Contact</h3>
            <Field label="Phone" value={guest.phone} mono />
            <Field label="Email" value={guest.email} />
            <Field label="Location" value={location || null} />
            <Field label="Source channel" value={guest.sourceChannel} />
            <Field
              label="Preferred channel"
              value={guest.preferredChannel}
            />
            {guest.birthday && (
              <Field label="Birthday" value={guest.birthday} mono />
            )}
            {tags.length > 0 && (
              <div>
                <div className="text-xs text-gray-400 mb-1">Tags</div>
                <div className="flex flex-wrap gap-1">
                  {tags.map((t, i) => (
                    <span
                      key={i}
                      className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="data-card rounded-lg p-5 col-span-2 space-y-3">
            <h3 className="text-sm font-semibold text-[#161616]">Notes</h3>
            <div>
              <div className="text-xs text-gray-400 mb-1">Internal notes</div>
              <div className="text-sm whitespace-pre-wrap text-[#161616]">
                {guest.notes || (
                  <span className="text-gray-400">—</span>
                )}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-400 mb-1">Communication</div>
              <div className="text-sm whitespace-pre-wrap text-[#161616]">
                {guest.communicationNotes || (
                  <span className="text-gray-400">—</span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="data-card rounded-lg overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-[#161616]">
              Bookings ({bookings.length})
            </h3>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-400 font-mono uppercase bg-gray-50/50">
                <th className="px-5 py-2.5 font-medium">Check-in</th>
                <th className="px-5 py-2.5 font-medium">Check-out</th>
                <th className="px-5 py-2.5 font-medium">Nights</th>
                <th className="px-5 py-2.5 font-medium">Channel</th>
                <th className="px-5 py-2.5 font-medium">Status</th>
                <th className="px-5 py-2.5 font-medium text-right">Revenue</th>
                <th className="px-5 py-2.5 font-medium text-right">ADR</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {bookings.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-5 py-10 text-center text-gray-400"
                  >
                    No bookings linked to this guest yet.
                  </td>
                </tr>
              ) : (
                bookings.map((b) => (
                  <tr
                    key={b.id}
                    className="hover:bg-gray-50/50 cursor-pointer"
                  >
                    <td className="px-5 py-3 font-mono text-xs">
                      <Link
                        href={`/bookings/${b.id}`}
                        className="block text-[#161616]"
                      >
                        {b.checkIn ? formatDateShort(b.checkIn) : "—"}
                      </Link>
                    </td>
                    <td className="px-5 py-3 font-mono text-xs text-gray-600">
                      {b.checkOut ? formatDateShort(b.checkOut) : "—"}
                    </td>
                    <td className="px-5 py-3 font-mono">{b.nights || 0}</td>
                    <td className="px-5 py-3">
                      {b.channel ? (
                        <span
                          className={`${channelBadgeClass(b.channel)} px-2 py-0.5 rounded text-xs font-medium`}
                        >
                          {b.channel}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-xs text-gray-600">
                      {b.status || "—"}
                    </td>
                    <td className="px-5 py-3 text-right font-mono font-semibold">
                      {formatMoney(b.grossRevenue || 0)}
                    </td>
                    <td className="px-5 py-3 text-right font-mono text-gray-600">
                      {formatMoney(b.avgNightlyRate || 0)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function Field({
  label,
  value,
  mono,
}: {
  label: string;
  value: string | null | undefined;
  mono?: boolean;
}) {
  return (
    <div>
      <div className="text-xs text-gray-400 mb-0.5">{label}</div>
      <div
        className={`text-sm text-[#161616] ${mono ? "font-mono" : ""}`}
      >
        {value || <span className="text-gray-400">—</span>}
      </div>
    </div>
  );
}
