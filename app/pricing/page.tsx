import SubHeader from "@/components/SubHeader";
import { getAllBookings } from "@/lib/queries";
import { summarizePricingStrategy, type PricingGap, type RateCard } from "@/lib/pricingStrategy";
import Link from "next/link";

export const dynamic = "force-dynamic";

const PRIORITY_STYLES = {
  high: "bg-red-50 text-red-700 border-red-100",
  medium: "bg-amber-50 text-amber-700 border-amber-100",
  low: "bg-emerald-50 text-emerald-700 border-emerald-100",
};

export default function PricingStrategyPage() {
  const bookings = getAllBookings();
  const strategy = summarizePricingStrategy(bookings);
  const highPriority = strategy.nextGaps.filter((gap) => gap.priority === "high").length;

  return (
    <>
      <SubHeader
        title="Pricing Strategy"
        subtitle="Sky House rate bands, LOS rules, discount ladder, and next gap-fill actions"
        actions={
          <div className="flex items-center gap-2">
            <Link href="/calendar" className="text-sm border border-gray-200 rounded-md px-3 py-1.5 text-gray-600 hover:bg-gray-50">
              Calendar
            </Link>
            <Link href="/comps/calendar" className="text-sm border border-gray-200 rounded-md px-3 py-1.5 text-gray-600 hover:bg-gray-50">
              Comp calendar
            </Link>
          </div>
        }
      />

      <main className="px-6 py-6 space-y-6">
        <section className="grid grid-cols-[1.4fr_0.8fr] gap-6">
          <div className="data-card rounded-lg p-6 border-l-4 border-l-[#0f62fe]">
            <div className="text-xs font-mono uppercase tracking-wide text-[#0f62fe] mb-3">Executive posture</div>
            <h2 className="text-2xl font-semibold text-[#161616] leading-tight">
              Hold premium pricing for peak windows. Use LOS flexibility and direct pushes to fill soft gaps.
            </h2>
            <p className="mt-4 text-sm leading-6 text-gray-600">
              Sky House should not price against median Dillon inventory. The app now anchors to the upper local/luxury comp band,
              protects July and holidays, and flags upcoming gaps where a 2-night release or direct-booking campaign should happen before broad OTA discounting.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Metric label="Active gap actions" value={String(strategy.nextGaps.length)} caption="Next 220 days" />
            <Metric label="High priority" value={String(highPriority)} caption="Close-in / peak / weekend" tone={highPriority ? "red" : "green"} />
            <Metric label="Direct target" value="5–10%" caption="Below Airbnb guest total" />
            <Metric label="Generated" value={strategy.generatedAt.slice(5)} caption="Auto from live bookings" />
          </div>
        </section>

        <section className="data-card rounded-lg overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-[#161616]">Next gap-fill actions</h3>
              <p className="text-xs text-gray-400 mt-0.5">Open windows from the live booking calendar, prioritized by lead time, weekend/holiday value, and orphan length.</p>
            </div>
          </div>
          {strategy.nextGaps.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm text-gray-400">No 2+ night gaps found in the next 220 days.</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {strategy.nextGaps.map((gap) => <GapRow key={`${gap.start}-${gap.end}`} gap={gap} />)}
            </div>
          )}
        </section>

        <section className="data-card rounded-lg overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-[#161616]">Sky House rate card</h3>
            <p className="text-xs text-gray-400 mt-0.5">Airbnb-facing nightly targets; direct should usually sit 5–10% below guest-facing OTA total while preserving better owner net.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-400 font-mono">
                <tr>
                  <th className="text-left px-5 py-3 font-medium">Period</th>
                  <th className="text-left px-5 py-3 font-medium">Weekday</th>
                  <th className="text-left px-5 py-3 font-medium">Weekend</th>
                  <th className="text-left px-5 py-3 font-medium">Holiday / peak</th>
                  <th className="text-left px-5 py-3 font-medium">LOS</th>
                  <th className="text-left px-5 py-3 font-medium">Posture</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {strategy.rateCards.map((card) => <RateRow key={card.period} card={card} />)}
              </tbody>
            </table>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-6">
          <Playbook title="Dynamic release schedule" rows={strategy.releaseRules.map((rule) => [rule.lead, rule.action])} />
          <Playbook title="Discount ladder" rows={strategy.discountLadder.map((rule) => [rule.lead, `${rule.trigger}: ${rule.action}`])} />
        </section>
      </main>
    </>
  );
}

function Metric({ label, value, caption, tone }: { label: string; value: string; caption: string; tone?: "red" | "green" }) {
  const color = tone === "red" ? "text-red-600" : tone === "green" ? "text-emerald-600" : "text-[#161616]";
  return (
    <div className="data-card rounded-lg p-4">
      <div className="text-xs text-gray-400 mb-1 font-mono uppercase">{label}</div>
      <div className={`text-2xl font-bold font-mono ${color}`}>{value}</div>
      <div className="text-xs text-gray-400 mt-0.5">{caption}</div>
    </div>
  );
}

function GapRow({ gap }: { gap: PricingGap }) {
  return (
    <div className="px-5 py-4 grid grid-cols-[1fr_0.7fr_1.8fr_1.4fr] gap-4 items-start">
      <div>
        <div className="font-mono text-sm font-semibold text-[#161616]">{gap.start} → {gap.end}</div>
        <div className="text-xs text-gray-400 mt-1">{gap.nights} nights · {gap.leadDays} days out · {gap.includesWeekend ? "includes weekend" : "midweek"}</div>
      </div>
      <div>
        <span className={`inline-flex rounded-full border px-2 py-1 text-xs font-medium ${PRIORITY_STYLES[gap.priority]}`}>
          {gap.priority} priority
        </span>
        <div className="text-xs text-gray-400 mt-2">{gap.recommendation.period} · {gap.recommendation.nightType}</div>
      </div>
      <div>
        <div className="text-sm text-[#161616]">{gap.recommendation.action}</div>
        <div className="text-xs text-gray-400 mt-1">LOS target: {gap.recommendation.recommendedMinStay}</div>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-md bg-gray-50 px-3 py-2">
          <div className="text-gray-400 font-mono uppercase">Airbnb</div>
          <div className="font-mono text-[#161616] mt-1">{gap.recommendation.airbnbTarget}</div>
        </div>
        <div className="rounded-md bg-emerald-50 px-3 py-2">
          <div className="text-emerald-600 font-mono uppercase">Direct</div>
          <div className="font-mono text-[#161616] mt-1">{gap.recommendation.directTarget}</div>
        </div>
      </div>
    </div>
  );
}

function RateRow({ card }: { card: RateCard }) {
  return (
    <tr className="align-top">
      <td className="px-5 py-4">
        <div className="font-semibold text-[#161616]">{card.period}</div>
        <div className="text-xs text-gray-400 mt-0.5">{card.months}</div>
      </td>
      <td className="px-5 py-4 font-mono text-[#161616]">{card.weekday}</td>
      <td className="px-5 py-4 font-mono text-[#161616]">{card.weekend}</td>
      <td className="px-5 py-4 font-mono text-[#161616]">{card.holidayPeak}</td>
      <td className="px-5 py-4 text-sm text-gray-600">{card.minStay}</td>
      <td className="px-5 py-4 text-sm text-gray-600 max-w-sm">{card.posture}</td>
    </tr>
  );
}

function Playbook({ title, rows }: { title: string; rows: string[][] }) {
  return (
    <div className="data-card rounded-lg overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-[#161616]">{title}</h3>
      </div>
      <div className="divide-y divide-gray-100">
        {rows.map(([lead, action]) => (
          <div key={`${title}-${lead}`} className="px-5 py-3 grid grid-cols-[90px_1fr] gap-4 text-sm">
            <div className="font-mono text-xs text-gray-400">{lead}</div>
            <div className="text-gray-600">{action}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
