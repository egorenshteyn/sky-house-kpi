import SubHeader from "@/components/SubHeader";
import { getAllGuests } from "@/lib/queries";
import { formatMoney, formatDateShort, channelBadgeClass } from "@/lib/format";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default function GuestsPage({
  searchParams,
}: {
  searchParams?: { q?: string };
}) {
  const q = (searchParams?.q || "").toLowerCase();
  let guests = getAllGuests();
  if (q) {
    guests = guests.filter((g) => {
      const name = `${g.firstName || ""} ${g.lastName || ""}`.toLowerCase();
      return (
        name.includes(q) ||
        (g.phone || "").toLowerCase().includes(q) ||
        (g.email || "").toLowerCase().includes(q)
      );
    });
  }

  // Direct booking opportunities: guests who came via OTA and have any history
  const opportunities = guests
    .filter(
      (g) =>
        g.preferredChannel &&
        g.preferredChannel !== "Direct" &&
        (g.totalStays || 0) >= 0,
    )
    .slice(0, 5);

  return (
    <>
      <SubHeader title="Guest CRM" subtitle={`${guests.length} contacts`} />
      <div className="px-6 py-6 space-y-4">
        <form className="data-card rounded-lg p-4 flex items-center gap-3">
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder="Search guests by name, phone, email…"
            className="input-base !w-72"
          />
          <button type="submit" className="text-sm bg-[#161616] text-white px-4 py-2 rounded-md">
            Search
          </button>
        </form>

        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2 data-card rounded-lg overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-[#161616]">All guests</h3>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-400 font-mono uppercase bg-gray-50/50">
                  <th className="px-5 py-2.5 font-medium">Name</th>
                  <th className="px-5 py-2.5 font-medium">Phone</th>
                  <th className="px-5 py-2.5 font-medium">Source</th>
                  <th className="px-5 py-2.5 font-medium">Stays</th>
                  <th className="px-5 py-2.5 font-medium text-right">Lifetime Rev</th>
                  <th className="px-5 py-2.5 font-medium">Last Stay</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {guests.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-10 text-center text-gray-400">
                      No guests yet.
                    </td>
                  </tr>
                ) : (
                  guests.map((g) => (
                    <tr
                      key={g.id}
                      className="hover:bg-gray-50/50 transition-colors cursor-pointer"
                    >
                      <td className="px-5 py-3 font-medium">
                        <Link
                          href={`/guests/${g.id}`}
                          className="block text-[#161616] hover:text-[#0f62fe]"
                        >
                          {g.firstName} {g.lastName}
                        </Link>
                      </td>
                      <td className="px-5 py-3 text-gray-600 font-mono text-xs">
                        <Link href={`/guests/${g.id}`} className="block">
                          {g.phone || "—"}
                        </Link>
                      </td>
                      <td className="px-5 py-3">
                        <Link href={`/guests/${g.id}`} className="block">
                          {g.preferredChannel ? (
                            <span
                              className={`${channelBadgeClass(
                                g.preferredChannel,
                              )} px-2 py-0.5 rounded text-xs font-medium`}
                            >
                              {g.preferredChannel}
                            </span>
                          ) : (
                            <span className="text-gray-400 text-xs">—</span>
                          )}
                        </Link>
                      </td>
                      <td className="px-5 py-3 font-mono">
                        <Link href={`/guests/${g.id}`} className="block">
                          {g.totalStays || 0}
                        </Link>
                      </td>
                      <td className="px-5 py-3 text-right font-mono font-semibold">
                        <Link href={`/guests/${g.id}`} className="block">
                          {formatMoney(g.totalRevenue || 0)}
                        </Link>
                      </td>
                      <td className="px-5 py-3 text-gray-600 font-mono text-xs">
                        <Link href={`/guests/${g.id}`} className="block">
                          {g.lastStay ? formatDateShort(g.lastStay) : "—"}
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="data-card rounded-lg">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-[#161616]">Direct booking opportunities</h3>
              <p className="text-xs text-gray-400 mt-0.5">Past OTA guests to convert to Direct</p>
            </div>
            <div className="p-4 space-y-3">
              {opportunities.length === 0 ? (
                <div className="text-xs text-gray-400 text-center py-4">
                  No opportunities yet.
                </div>
              ) : (
                opportunities.map((g) => (
                  <div
                    key={g.id}
                    className="p-3 rounded-md bg-gray-50 border-l-2 border-[#0f62fe]"
                  >
                    <div className="text-sm font-medium">
                      {g.firstName} {g.lastName}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      Originally booked via {g.preferredChannel} ·{" "}
                      {formatMoney(g.totalRevenue || 0)} lifetime
                    </div>
                    {g.phone && (
                      <div className="text-xs text-gray-400 font-mono mt-1">
                        {g.phone}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="text-xs text-gray-400 font-mono">
          New bookings automatically link to or create guest records.{" "}
          <Link href="/bookings/new" className="text-[#0f62fe]">
            + Add a booking
          </Link>
        </div>
      </div>
    </>
  );
}
