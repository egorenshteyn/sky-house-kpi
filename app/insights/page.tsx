import SubHeader from "@/components/SubHeader";
import { getActiveInsights } from "@/lib/queries";
import { computeInsights } from "@/lib/insights";

export const dynamic = "force-dynamic";

export default function InsightsPage({
  searchParams,
}: {
  searchParams?: { q?: string };
}) {
  const stored = getActiveInsights();
  const computed = computeInsights();
  const all = [
    ...stored.map((s) => ({
      title: s.title,
      summary: s.summary,
      priority: s.priority as "high" | "medium" | "low",
      type: s.insightType,
      action: s.actionRecommendation,
    })),
    ...computed.map((c) => ({
      title: c.title,
      summary: c.summary,
      priority: c.priority,
      type: c.type,
      action: c.actionRecommendation,
    })),
  ];

  // Dedup by title
  const seen = new Set<string>();
  const insights = all.filter((i) => {
    if (seen.has(i.title)) return false;
    seen.add(i.title);
    return true;
  });

  const q = (searchParams?.q || "").trim();
  const answer = q ? generateAnswer(q) : null;

  return (
    <>
      <SubHeader title="AI Insights" subtitle={`${insights.length} insights · heuristic-based for v1`} />
      <div className="px-6 py-6 space-y-4">
        <div className="data-card rounded-lg p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-5 h-5 rounded bg-[#0f62fe] flex items-center justify-center">
              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-sm font-semibold text-[#161616]">Ask about performance</h3>
          </div>
          <form className="relative">
            <input
              type="text"
              name="q"
              defaultValue={q}
              placeholder="e.g. How are we pacing? Which channel grew most?"
              className="input-base pr-10"
              autoFocus
            />
            <button
              type="submit"
              className="absolute right-2.5 top-2.5 text-gray-400 hover:text-[#0f62fe]"
              aria-label="Ask"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </button>
          </form>
          {answer && (
            <div className="mt-4 p-4 rounded-md bg-gray-50 border-l-2 border-[#0f62fe]">
              <div className="text-xs font-semibold text-gray-500 mb-2 uppercase font-mono">Answer</div>
              <div className="text-sm text-[#161616] leading-relaxed whitespace-pre-line">{answer}</div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          {insights.map((ins, i) => {
            const borderColor =
              ins.priority === "high"
                ? "border-red-500"
                : ins.priority === "medium"
                  ? "border-amber-500"
                  : "border-[#0f62fe]";
            return (
              <div key={i} className={`data-card rounded-lg p-4 border-l-4 ${borderColor}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs uppercase font-mono text-gray-400">{ins.type}</span>
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded ${
                      ins.priority === "high"
                        ? "bg-red-50 text-red-600"
                        : ins.priority === "medium"
                          ? "bg-amber-50 text-amber-600"
                          : "bg-blue-50 text-blue-600"
                    }`}
                  >
                    {ins.priority}
                  </span>
                </div>
                <div className="text-sm font-semibold text-[#161616] mb-1.5">{ins.title}</div>
                <div className="text-sm text-gray-500 leading-relaxed">{ins.summary}</div>
                {ins.action && (
                  <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-600">
                    <span className="font-semibold">Recommended action: </span>
                    {ins.action}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

function generateAnswer(q: string): string {
  // Heuristic Q&A using imported data
  const { getAllMonthly } = require("@/lib/queries") as typeof import("@/lib/queries");
  const all = getAllMonthly();
  const today = new Date();
  const currentYear = today.getFullYear();
  const cur = all.filter((m) => m.year === currentYear);
  const prev = all.filter((m) => m.year === currentYear - 1);
  const sumRev = (rows: typeof all) => rows.reduce((a, m) => a + (m.bookedRevenue || 0), 0);
  const sumNights = (rows: typeof all) => rows.reduce((a, m) => a + (m.totalNights || 0), 0);
  const sumStays = (rows: typeof all) => rows.reduce((a, m) => a + (m.totalStays || 0), 0);

  const lc = q.toLowerCase();
  if (lc.includes("pace") || lc.includes("pacing") || lc.includes("yoy") || lc.includes("year over year")) {
    const cr = sumRev(cur);
    const pr = sumRev(prev);
    if (pr === 0) return `${currentYear} revenue so far is $${(cr / 1000).toFixed(1)}K. No comparable prior-year data.`;
    const delta = ((cr - pr) / pr) * 100;
    return `${currentYear} revenue is $${(cr / 1000).toFixed(1)}K vs ${currentYear - 1}'s $${(pr / 1000).toFixed(1)}K (${delta >= 0 ? "+" : ""}${delta.toFixed(1)}%).`;
  }
  if (lc.includes("channel") || lc.includes("airbnb") || lc.includes("vrbo") || lc.includes("luxe") || lc.includes("direct")) {
    const totals = {
      Direct: cur.reduce((a, m) => a + (m.revenueDirect || 0), 0),
      Airbnb: cur.reduce((a, m) => a + (m.revenueAirbnb || 0), 0),
      Luxe: cur.reduce((a, m) => a + (m.revenueLuxe || 0), 0),
      VRBO: cur.reduce((a, m) => a + (m.revenueVrbo || 0), 0),
    };
    const total = Object.values(totals).reduce((a, b) => a + b, 0) || 1;
    const lines = Object.entries(totals)
      .sort((a, b) => b[1] - a[1])
      .map(([n, v]) => `• ${n}: $${(v / 1000).toFixed(1)}K (${((v / total) * 100).toFixed(0)}%)`);
    return `Channel mix for ${currentYear}:\n${lines.join("\n")}`;
  }
  if (lc.includes("adr") || lc.includes("rate")) {
    const cn = sumNights(cur);
    const cr = sumRev(cur);
    const adr = cn > 0 ? cr / cn : 0;
    return `${currentYear} ADR is $${adr.toFixed(0)} across ${cn} nights and $${(cr / 1000).toFixed(1)}K revenue.`;
  }
  if (lc.includes("occup")) {
    const cn = sumNights(cur);
    const days = (currentYear % 4 === 0 ? 366 : 365);
    const occ = (cn / days) * 100;
    return `Occupancy in ${currentYear} is ${occ.toFixed(1)}% (${cn} of ${days} nights).`;
  }
  if (lc.includes("stay") || lc.includes("nights") || lc.includes("length")) {
    const cn = sumNights(cur);
    const cs = sumStays(cur);
    const avg = cs > 0 ? cn / cs : 0;
    return `${currentYear} so far: ${cs} stays, ${cn} nights, avg stay ${avg.toFixed(1)} nights.`;
  }
  if (lc.includes("revenue") || lc.includes("how much")) {
    const cr = sumRev(cur);
    return `${currentYear} revenue so far: $${(cr / 1000).toFixed(1)}K.`;
  }
  return "I can answer questions about pacing, channels, ADR, occupancy, stay length, and revenue. Try asking about one of those.";
}
