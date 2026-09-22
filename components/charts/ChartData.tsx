const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export default function ChartData({ series, unit }: { series: { year: number; data: number[] }[]; unit: "currency" | "percent" }) {
  return <details className="chart-data"><summary>View monthly data</summary>
    <div className="table-scroll" role="region" aria-label="Monthly chart values" tabIndex={0}>
      <table><caption className="sr-only">Monthly {unit === "currency" ? "revenue" : "occupancy"}</caption>
        <thead><tr><th scope="col">Month</th>{series.map((s) => <th scope="col" key={s.year}>{s.year}</th>)}</tr></thead>
        <tbody>{MONTHS.map((month, i) => <tr key={month}><th scope="row">{month}</th>{series.map((s) => <td key={s.year}>{unit === "currency" ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(s.data[i] || 0) : `${(s.data[i] || 0).toFixed(1)}%`}</td>)}</tr>)}</tbody>
      </table>
    </div>
  </details>;
}
