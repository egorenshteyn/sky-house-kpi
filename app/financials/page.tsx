import SubHeader from "@/components/SubHeader";
import { getAllExpenses, getAllMonthly } from "@/lib/queries";
import { formatMoney, formatPct } from "@/lib/format";

export const dynamic = "force-dynamic";

const PROPERTY_VALUE = 3_500_000;

export default function FinancialsPage() {
  const expenses = getAllExpenses();
  const all = getAllMonthly();

  // Group expenses by category
  const byCategory: Record<string, { total: typeof expenses[0] | null; subs: typeof expenses }> = {};
  for (const e of expenses) {
    if (!byCategory[e.category]) byCategory[e.category] = { total: null, subs: [] };
    if (e.subcategory === "TOTAL") byCategory[e.category].total = e;
    else byCategory[e.category].subs.push(e);
  }

  const monthlyOpexTotal = expenses
    .filter((e) => e.subcategory !== "TOTAL")
    .reduce((a, e) => a + (e.monthlyOpex || 0), 0);
  const monthlyCashOutflowTotal = expenses
    .filter((e) => e.subcategory !== "TOTAL")
    .reduce((a, e) => a + (e.monthlyCashOutflow || 0), 0);

  const yearlyOpex = monthlyOpexTotal * 12;
  const yearlyOutflow = monthlyCashOutflowTotal * 12;

  // Compute current year revenue
  const currentYear = new Date().getFullYear();
  const yearMonths = all.filter((m) => m.year === currentYear);
  const ytdRevenue = yearMonths.reduce((a, m) => a + (m.bookedRevenue || 0), 0);

  // Rolling 12-month revenue (last 12 months with data)
  const sortedMonths = [...all]
    .filter((m) => (m.bookedRevenue || 0) > 0)
    .sort((a, b) => (a.year - b.year) * 100 + (a.month - b.month));
  const trailing12 = sortedMonths.slice(-12);
  const trailingRevenue = trailing12.reduce((a, m) => a + (m.bookedRevenue || 0), 0);

  // 2020-23 average ≈ $270K (per income.csv)
  const baselineAnnualRevenue = 270000;
  const noi = baselineAnnualRevenue - yearlyOpex;
  const capRate = (noi / PROPERTY_VALUE) * 100;
  const grossYield = (baselineAnnualRevenue / PROPERTY_VALUE) * 100;

  return (
    <>
      <SubHeader
        title="Financials"
        subtitle={`Property value ${formatMoney(PROPERTY_VALUE, { compact: true })} · Cap rate ${capRate.toFixed(1)}%`}
      />
      <div className="px-6 py-6 space-y-4">
        <div className="grid grid-cols-4 gap-4">
          <Stat label={`${currentYear} YTD Revenue`} value={formatMoney(ytdRevenue, { compact: true })} />
          <Stat label="Trailing 12mo Revenue" value={formatMoney(trailingRevenue, { compact: true })} />
          <Stat label="Annual OpEx" value={formatMoney(yearlyOpex, { compact: true })} />
          <Stat label="Annual Cash Outflow" value={formatMoney(yearlyOutflow, { compact: true })} />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <Stat label="Net Operating Income" value={formatMoney(noi, { compact: true })} sub="NOI = Revenue − OpEx (excl. financing)" />
          <Stat label="Cap Rate" value={formatPct(capRate)} sub="6–8% considered good" />
          <Stat label="Gross Yield" value={formatPct(grossYield)} sub="Annual revenue ÷ property value" />
        </div>

        <div className="data-card rounded-lg overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-[#161616]">Operating expenses</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Monthly OpEx {formatMoney(monthlyOpexTotal)} · Cash outflow {formatMoney(monthlyCashOutflowTotal)}/mo (incl. principal)
            </p>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-400 font-mono uppercase bg-gray-50/50">
                <th className="px-5 py-2.5 font-medium">Category</th>
                <th className="px-5 py-2.5 font-medium">Item</th>
                <th className="px-5 py-2.5 font-medium text-right">Monthly OpEx</th>
                <th className="px-5 py-2.5 font-medium text-right">Cash Outflow</th>
                <th className="px-5 py-2.5 font-medium">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {Object.entries(byCategory).flatMap(([category, group]) => {
                const rows: React.ReactNode[] = [];
                if (group.total) {
                  rows.push(
                    <tr key={`${category}-total`} className="bg-gray-50/40">
                      <td className="px-5 py-2.5 font-semibold text-[#161616]" colSpan={2}>
                        {category}
                      </td>
                      <td className="px-5 py-2.5 text-right font-mono font-semibold">
                        {formatMoney(group.total.monthlyOpex || 0)}
                      </td>
                      <td className="px-5 py-2.5 text-right font-mono font-semibold">
                        {formatMoney(group.total.monthlyCashOutflow || 0)}
                      </td>
                      <td className="px-5 py-2.5 text-xs text-gray-400">subtotal</td>
                    </tr>,
                  );
                }
                for (const s of group.subs) {
                  rows.push(
                    <tr key={s.id} className="hover:bg-gray-50/50">
                      <td className="px-5 py-2.5 text-gray-400 text-xs">{category}</td>
                      <td className="px-5 py-2.5">{s.subcategory}</td>
                      <td className="px-5 py-2.5 text-right font-mono">
                        {formatMoney(s.monthlyOpex || 0)}
                      </td>
                      <td className="px-5 py-2.5 text-right font-mono text-gray-600">
                        {formatMoney(s.monthlyCashOutflow || 0)}
                      </td>
                      <td className="px-5 py-2.5 text-xs text-gray-500">{s.notes || ""}</td>
                    </tr>,
                  );
                }
                return rows;
              })}
            </tbody>
          </table>
        </div>

        <div className="data-card rounded-lg p-5">
          <h3 className="text-sm font-semibold text-[#161616] mb-3">Scenario inputs</h3>
          <p className="text-xs text-gray-500 mb-4">
            Adjust property value or revenue assumption to recompute cap rate and yield.
          </p>
          <div className="grid grid-cols-3 gap-4">
            <Field label="Property asset value">
              <input
                type="number"
                defaultValue={PROPERTY_VALUE}
                disabled
                className="input-base bg-gray-50 font-mono"
              />
            </Field>
            <Field label="Annual revenue (avg 2020-23)">
              <input
                type="number"
                defaultValue={baselineAnnualRevenue}
                disabled
                className="input-base bg-gray-50 font-mono"
              />
            </Field>
            <Field label="Annual OpEx">
              <input
                type="number"
                defaultValue={Math.round(yearlyOpex)}
                disabled
                className="input-base bg-gray-50 font-mono"
              />
            </Field>
          </div>
          <p className="text-xs text-gray-400 mt-4 font-mono">
            Scenario modeling editor coming soon — values shown are derived from imported data.
          </p>
        </div>
      </div>
    </>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="data-card rounded-lg p-4">
      <div className="text-xs text-gray-400 font-medium mb-1">{label}</div>
      <div className="text-2xl font-bold font-mono text-[#161616]">{value}</div>
      {sub && <div className="text-xs text-gray-400 mt-1">{sub}</div>}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs text-gray-500 mb-1">{label}</label>
      {children}
    </div>
  );
}
