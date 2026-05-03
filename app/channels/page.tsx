import SubHeader from "@/components/SubHeader";
import { getAllChannels, getAllMonthly } from "@/lib/queries";
import { formatMoney, formatPct, channelBadgeClass } from "@/lib/format";

export const dynamic = "force-dynamic";

export default function ChannelsPage() {
  const channels = getAllChannels();
  const all = getAllMonthly();

  // Aggregate revenue per channel across all years
  const totals = all.reduce(
    (acc, m) => ({
      Direct: acc.Direct + (m.revenueDirect || 0),
      Airbnb: acc.Airbnb + (m.revenueAirbnb || 0),
      Luxe: acc.Luxe + (m.revenueLuxe || 0),
      VRBO: acc.VRBO + (m.revenueVrbo || 0),
      TripAdvisor: acc.TripAdvisor + (m.revenueTripadvisor || 0),
      "Booking.com": acc["Booking.com"] + (m.revenueBookingcom || 0),
      StayOne: acc.StayOne + (m.revenueStayone || 0),
    }),
    { Direct: 0, Airbnb: 0, Luxe: 0, VRBO: 0, TripAdvisor: 0, "Booking.com": 0, StayOne: 0 } as Record<string, number>,
  );

  // Current year totals
  const currentYear = new Date().getFullYear();
  const currentMonths = all.filter((m) => m.year === currentYear);
  const currentTotals: Record<string, number> = {
    Direct: currentMonths.reduce((a, m) => a + (m.revenueDirect || 0), 0),
    Airbnb: currentMonths.reduce((a, m) => a + (m.revenueAirbnb || 0), 0),
    Luxe: currentMonths.reduce((a, m) => a + (m.revenueLuxe || 0), 0),
    VRBO: currentMonths.reduce((a, m) => a + (m.revenueVrbo || 0), 0),
    TripAdvisor: currentMonths.reduce((a, m) => a + (m.revenueTripadvisor || 0), 0),
    "Booking.com": currentMonths.reduce((a, m) => a + (m.revenueBookingcom || 0), 0),
    StayOne: currentMonths.reduce((a, m) => a + (m.revenueStayone || 0), 0),
  };
  const allTimeTotal = Object.values(totals).reduce((a, b) => a + b, 0);

  const coreChannelNames = ["Direct", "Airbnb", "Luxe", "VRBO", "TripAdvisor", "Booking.com", "StayOne"];
  const coreChannels = channels.filter((c) => coreChannelNames.includes(c.name));
  const auxChannels = channels.filter((c) => !coreChannelNames.includes(c.name));

  return (
    <>
      <SubHeader
        title="Channel Management"
        subtitle={`${channels.filter((c) => c.active).length} active · ${formatMoney(
          allTimeTotal,
          { compact: true },
        )} all-time revenue`}
      />
      <div className="px-6 py-6 space-y-6">
        <div className="grid grid-cols-3 gap-4">
          {coreChannels.map((c) => {
            const allTime = totals[c.name] || 0;
            const ytd = currentTotals[c.name] || 0;
            const pct = allTimeTotal > 0 ? (allTime / allTimeTotal) * 100 : 0;
            const isInactive = !c.active || (currentYear in [] ? false : ytd === 0 && allTime > 0);
            return (
              <div key={c.id} className="data-card rounded-lg p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={`${channelBadgeClass(c.name)} px-2 py-0.5 rounded text-xs font-medium`}
                    >
                      {c.name}
                    </span>
                    {!c.active && (
                      <span className="text-xs text-red-500 font-medium">INACTIVE</span>
                    )}
                  </div>
                  {c.commissionRate !== null && (
                    <span className="text-xs text-gray-400 font-mono">
                      {(c.commissionRate * 100).toFixed(0)}% fee
                    </span>
                  )}
                </div>
                <div>
                  <div className="text-xs text-gray-400 mb-1">All-time revenue</div>
                  <div className="text-2xl font-bold font-mono text-[#161616]">
                    {formatMoney(allTime, { compact: true })}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5 font-mono">
                    {formatPct(pct)} of total
                  </div>
                </div>
                <div className="pt-2 border-t border-gray-100">
                  <div className="text-xs text-gray-400 mb-1">YTD {currentYear}</div>
                  <div
                    className={`text-lg font-bold font-mono ${
                      ytd === 0 ? "text-gray-400" : "text-[#161616]"
                    }`}
                  >
                    {formatMoney(ytd)}
                  </div>
                </div>
                {c.listingUrl && (
                  <a
                    href={c.listingUrl.startsWith("http") ? c.listingUrl : `https://${c.listingUrl}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-[#0f62fe] hover:text-[#0353e9]"
                  >
                    View listing →
                  </a>
                )}
              </div>
            );
          })}
        </div>

        {auxChannels.length > 0 && (
          <div className="data-card rounded-lg overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-[#161616]">Auxiliary listings</h3>
              <p className="text-xs text-gray-400 mt-0.5">
                Additional listing platforms (no historical revenue tracked separately)
              </p>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-400 font-mono uppercase bg-gray-50/50">
                  <th className="px-5 py-2.5 font-medium">Platform</th>
                  <th className="px-5 py-2.5 font-medium">Listing URL</th>
                  <th className="px-5 py-2.5 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {auxChannels.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50/50">
                    <td className="px-5 py-3 font-medium">{c.name}</td>
                    <td className="px-5 py-3 text-gray-600 text-xs">
                      {c.listingUrl ? (
                        <a
                          href={c.listingUrl.startsWith("http") ? c.listingUrl : `https://${c.listingUrl}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#0f62fe] hover:underline truncate inline-block max-w-md"
                        >
                          {c.listingUrl}
                        </a>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`text-xs ${c.active ? "text-emerald-600" : "text-gray-400"}`}
                      >
                        {c.active ? "Active" : "Inactive"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
