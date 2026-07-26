export function formatMoney(n: number, opts?: { compact?: boolean }): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "$0";
  if (opts?.compact) {
    if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
    if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  }
  return `$${Math.round(n).toLocaleString("en-US")}`;
}

export function formatPct(n: number, digits = 1): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "0%";
  return `${n.toFixed(digits)}%`;
}

export function formatNumber(n: number): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "0";
  return Math.round(n).toLocaleString("en-US");
}

export function formatDateShort(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function formatDateFull(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatBookingDate(iso: string): string {
  if (!iso) return "—";
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  const d = dateOnly
    ? new Date(Date.UTC(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3])))
    : new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function channelBadgeClass(channel: string): string {
  const c = (channel || "").toLowerCase().replace(/[^a-z]/g, "");
  if (c === "airbnb") return "badge-airbnb";
  if (c === "luxe") return "badge-luxe";
  if (c === "direct") return "badge-direct";
  if (c === "vrbo") return "badge-vrbo";
  if (c === "tripadvisor") return "badge-tripadvisor";
  if (c === "bookingcom") return "badge-bookingcom";
  if (c === "lodgify") return "bg-gray-900 text-white";
  if (c === "stayone") return "badge-stayone";
  return "bg-gray-100 text-gray-600";
}

export function channelColor(channel: string): string {
  const c = (channel || "").toLowerCase().replace(/[^a-z]/g, "");
  switch (c) {
    case "airbnb":
      return "#FF5A5F";
    case "luxe":
      return "#6929c4";
    case "direct":
      return "#198038";
    case "vrbo":
      return "#0043ce";
    case "tripadvisor":
      return "#00aa6c";
    case "bookingcom":
      return "#003580";
    case "lodgify":
      return "#393939";
    case "stayone":
      return "#a56eff";
    default:
      return "#a8a8a8";
  }
}
