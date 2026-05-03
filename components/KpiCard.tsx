type Props = {
  label: string;
  value: string;
  delta?: { value: string; direction: "up" | "down" | "flat"; suffix?: string };
  bar?: { pct: number; color?: string; caption?: string };
};

export default function KpiCard({ label, value, delta, bar }: Props) {
  return (
    <div className="data-card rounded-lg p-4">
      <div className="text-xs text-gray-400 font-medium mb-1">{label}</div>
      <div className="text-2xl font-bold font-mono text-[#161616]">{value}</div>
      {delta && (
        <div className="mt-2 flex items-center gap-1.5">
          {delta.direction === "up" ? (
            <svg className="w-3 h-3 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z"
              />
            </svg>
          ) : delta.direction === "down" ? (
            <svg className="w-3 h-3 text-red-500" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z"
              />
            </svg>
          ) : (
            <span className="w-3 h-3 inline-block bg-gray-300 rounded-sm" />
          )}
          <span
            className={`text-xs font-mono ${
              delta.direction === "up"
                ? "text-emerald-600"
                : delta.direction === "down"
                  ? "text-red-500"
                  : "text-gray-400"
            }`}
          >
            {delta.value}
          </span>
          <span className="text-xs text-gray-300">{delta.suffix || "YoY"}</span>
        </div>
      )}
      {bar && (
        <div className="mt-2">
          <div className="metric-bar">
            <div
              className="metric-fill"
              style={{
                width: `${Math.min(Math.max(bar.pct, 0), 100)}%`,
                background: bar.color || "#0f62fe",
              }}
            />
          </div>
          {bar.caption && (
            <div className="text-xs text-gray-300 mt-1 font-mono">{bar.caption}</div>
          )}
        </div>
      )}
    </div>
  );
}
