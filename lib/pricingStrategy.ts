export type PricingBooking = {
  id: string;
  guestName: string | null;
  status: string | null;
  channel: string | null;
  checkIn: string | null;
  checkOut: string | null;
  avgNightlyRate?: number | null;
  grossRevenue?: number | null;
};

export type RateCard = {
  period: string;
  months: string;
  weekday: string;
  weekend: string;
  holidayPeak: string;
  minStay: string;
  posture: string;
};

export type PricingRecommendation = {
  date: string;
  period: string;
  nightType: "Weekday" | "Weekend" | "Holiday";
  airbnbTarget: string;
  directTarget: string;
  recommendedMinStay: string;
  action: string;
  note: string;
};

export type PricingGap = {
  start: string;
  end: string;
  nights: number;
  leadDays: number;
  includesWeekend: boolean;
  priority: "high" | "medium" | "low";
  recommendation: PricingRecommendation;
};

export const RATE_CARDS: RateCard[] = [
  {
    period: "June",
    months: "June",
    weekday: "$1,450–$1,750",
    weekend: "$2,100–$2,700",
    holidayPeak: "$2,700+",
    minStay: "2 midweek / 3 weekend",
    posture: "Protect weekends; fill midweek and short gaps with 2-night flexibility.",
  },
  {
    period: "July",
    months: "July",
    weekday: "$1,850–$2,150",
    weekend: "$2,400–$3,100",
    holidayPeak: "$2,900–$3,400",
    minStay: "3 nights / 4–5 July 4",
    posture: "Peak-demand month. Do not chase median comps; price against top local and luxury anchors.",
  },
  {
    period: "August",
    months: "August",
    weekday: "$1,500–$1,850",
    weekend: "$2,200–$2,800",
    holidayPeak: "$2,600+",
    minStay: "2 midweek / 3 weekend",
    posture: "Strong summer but less scarce than July; use direct pushes for orphan gaps.",
  },
  {
    period: "September",
    months: "September",
    weekday: "$1,250–$1,550",
    weekend: "$1,750–$2,500",
    holidayPeak: "$2,300+",
    minStay: "2–3 nights",
    posture: "Campaign month. Loosen LOS early before cutting rate too deeply.",
  },
  {
    period: "October",
    months: "October",
    weekday: "$1,350–$1,650",
    weekend: "$1,950–$2,800",
    holidayPeak: "$2,500+",
    minStay: "2 midweek / 3 weekend",
    posture: "Premium shoulder. Hold design-led weekend pricing, fill midweek selectively.",
  },
  {
    period: "Early November",
    months: "Nov 1–20",
    weekday: "$1,250–$1,500",
    weekend: "$1,700–$2,100",
    holidayPeak: "—",
    minStay: "2 midweek / 3 weekend",
    posture: "Soft shoulder. Use direct guest list before OTA discounting.",
  },
  {
    period: "Thanksgiving",
    months: "Thanksgiving week",
    weekday: "—",
    weekend: "—",
    holidayPeak: "$2,400–$2,900",
    minStay: "4–5 nights",
    posture: "Hold premium holiday rate and longer LOS until close-in.",
  },
  {
    period: "Early December",
    months: "Dec 1–18",
    weekday: "$1,250–$1,500",
    weekend: "$1,700–$2,100",
    holidayPeak: "—",
    minStay: "2 midweek / 3 weekend",
    posture: "Soft shoulder. Fill with direct offers and 2-night flexibility.",
  },
  {
    period: "Christmas / NYE",
    months: "Dec 19–Jan 3",
    weekday: "—",
    weekend: "—",
    holidayPeak: "$2,300–$3,200",
    minStay: "5 nights / 7 combined preferred",
    posture: "Scarcity window. Avoid early discounting; loosen only if gap remains close-in.",
  },
];

export const RELEASE_RULES = [
  { lead: "90+ days", action: "Hold 4–7 night minimums on holidays and peak weeks. No discount." },
  { lead: "60–90 days", action: "Keep premium weekends at 3 nights. Protect July and holiday ADR." },
  { lead: "30–60 days", action: "Open selected 2-night shoulder weekends if calendar is soft." },
  { lead: "14–30 days", action: "Match orphan-gap length and prioritize occupancy on non-holidays." },
  { lead: "0–14 days", action: "Allow 2 nights on most non-holiday gaps; push direct first." },
  { lead: "0–7 days", action: "Discount only if the night will otherwise go empty and ops still make sense." },
];

export const DISCOUNT_LADDER = [
  { lead: "60+ days", trigger: "Prime weekend / holiday", action: "No discount" },
  { lead: "45 days", trigger: "Shoulder weekend", action: "Reduce 5–8% or loosen LOS" },
  { lead: "30 days", trigger: "Midweek gap", action: "Reduce 10% or allow 2 nights" },
  { lead: "21 days", trigger: "Any non-holiday gap", action: "Reduce 10–15%" },
  { lead: "14 days", trigger: "Open orphan", action: "Reduce 15–20%, direct push" },
  { lead: "7 days", trigger: "Still open", action: "Price to fill, but keep cleaning/ops worth it" },
];

const MS_PER_DAY = 86_400_000;

function parseDate(date: string) {
  return new Date(`${date}T00:00:00Z`);
}

function iso(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addDays(date: string, days: number) {
  const d = parseDate(date);
  d.setUTCDate(d.getUTCDate() + days);
  return iso(d);
}

function diffDays(from: string | Date, to: string | Date) {
  const a = typeof from === "string" ? parseDate(from) : from;
  const b = typeof to === "string" ? parseDate(to) : to;
  return Math.round((b.getTime() - a.getTime()) / MS_PER_DAY);
}

function dayOfWeek(date: string) {
  return parseDate(date).getUTCDay();
}

function isWeekendNight(date: string) {
  const d = dayOfWeek(date);
  return d === 5 || d === 6;
}

function isThanksgivingWindow(date: string) {
  const d = parseDate(date);
  const month = d.getUTCMonth() + 1;
  const day = d.getUTCDate();
  return month === 11 && day >= 21 && day <= 30;
}

function isChristmasNyeWindow(date: string) {
  const d = parseDate(date);
  const month = d.getUTCMonth() + 1;
  const day = d.getUTCDate();
  return (month === 12 && day >= 19) || (month === 1 && day <= 3);
}

function isJulyFourthWindow(date: string) {
  const d = parseDate(date);
  const month = d.getUTCMonth() + 1;
  const day = d.getUTCDate();
  return month === 7 && day >= 2 && day <= 6;
}

function periodForDate(date: string) {
  const month = parseDate(date).getUTCMonth() + 1;
  const day = parseDate(date).getUTCDate();
  if (isChristmasNyeWindow(date)) return "Christmas / NYE";
  if (isThanksgivingWindow(date)) return "Thanksgiving";
  if (month === 6) return "June";
  if (month === 7) return "July";
  if (month === 8) return "August";
  if (month === 9) return "September";
  if (month === 10) return "October";
  if (month === 11 && day <= 20) return "Early November";
  if (month === 12 && day <= 18) return "Early December";
  return "Shoulder / custom";
}

function cardForPeriod(period: string) {
  return RATE_CARDS.find((card) => card.period === period);
}

function directRange(airbnbTarget: string) {
  const numbers = airbnbTarget.match(/[\d,]+/g)?.map((n) => Number(n.replace(/,/g, ""))) || [];
  if (airbnbTarget.includes("+") && numbers[0]) return `$${Math.round(numbers[0] * 0.9).toLocaleString()}+`;
  if (numbers.length >= 2) {
    return `$${Math.round(numbers[0] * 0.9).toLocaleString()}–$${Math.round(numbers[1] * 0.95).toLocaleString()}`;
  }
  return "Direct: 5–10% below Airbnb guest-facing total";
}

function actionForLead(leadDays: number, period: string, nightType: PricingRecommendation["nightType"]) {
  const holiday = nightType === "Holiday" || period === "Thanksgiving" || period === "Christmas / NYE";
  const shoulder = ["September", "Early November", "Early December"].includes(period);
  if (leadDays >= 60 && holiday) return "No discount. Hold premium holiday rate and longer LOS.";
  if (leadDays >= 60) return "Hold rate. Adjust LOS before discounting.";
  if (leadDays >= 45 && shoulder) return "Reduce 5–8% or loosen LOS; push direct guest list.";
  if (leadDays >= 30 && nightType === "Weekday") return "Reduce 10% or allow 2-night stay.";
  if (leadDays >= 21 && !holiday) return "Reduce 10–15% or open 2-night gap-fill window.";
  if (leadDays >= 14 && !holiday) return "Reduce 15–20%, prioritize direct push, match orphan length.";
  if (leadDays < 14 && !holiday) return "Allow 2 nights and price to fill while preserving cleaning/ops value.";
  if (holiday && leadDays < 30) return "Hold premium rate, but match orphan length with a 2-night floor before discounting.";
  return "Hold premium posture; only loosen LOS if the calendar remains empty close-in.";
}

export function getPricingRecommendationForDate(date: string, leadDays: number): PricingRecommendation {
  const period = periodForDate(date);
  const holiday = isThanksgivingWindow(date) || isChristmasNyeWindow(date) || isJulyFourthWindow(date);
  const nightType: PricingRecommendation["nightType"] = holiday ? "Holiday" : isWeekendNight(date) ? "Weekend" : "Weekday";
  const card = cardForPeriod(period);
  const airbnbTarget = card
    ? nightType === "Holiday"
      ? card.holidayPeak !== "—"
        ? card.holidayPeak
        : card.weekend
      : nightType === "Weekend"
        ? card.weekend
        : card.weekday
    : nightType === "Weekend"
      ? "$1,700–$2,300"
      : "$1,250–$1,600";

  const recommendedMinStay = holiday
    ? period === "Christmas / NYE"
      ? "5 nights"
      : period === "Thanksgiving" || isJulyFourthWindow(date)
        ? "4–5 nights"
        : "3–4 nights"
    : period === "September"
      ? "2 nights"
      : nightType === "Weekend"
        ? "3 nights"
        : "2 nights";

  return {
    date,
    period,
    nightType,
    airbnbTarget,
    directTarget: directRange(airbnbTarget),
    recommendedMinStay,
    action: actionForLead(leadDays, period, nightType),
    note: card?.posture || "Use actual comp data and booking pace to tune final rate.",
  };
}

function activeBookings(bookings: PricingBooking[]) {
  return bookings
    .filter((booking) => booking.checkIn && booking.checkOut && !["cancelled", "refunded", "inquiry"].includes((booking.status || "").toLowerCase()))
    .sort((a, b) => String(a.checkIn).localeCompare(String(b.checkIn)));
}

function gapIncludesWeekend(start: string, end: string) {
  for (let d = start; d < end; d = addDays(d, 1)) {
    if (isWeekendNight(d)) return true;
  }
  return false;
}

function priorityForGap(nights: number, leadDays: number, includesWeekend: boolean, recommendation: PricingRecommendation): PricingGap["priority"] {
  const holiday = recommendation.nightType === "Holiday";
  if ((leadDays <= 30 && nights <= 4) || (includesWeekend && leadDays <= 45) || (holiday && leadDays <= 90)) return "high";
  if (leadDays <= 60 || includesWeekend) return "medium";
  return "low";
}

export function findOpenPricingGaps(
  bookings: PricingBooking[],
  fromDate: string,
  toDate: string,
  today: Date = new Date(),
): PricingGap[] {
  const relevant = activeBookings(bookings).filter((booking) => booking.checkOut! > fromDate && booking.checkIn! < toDate);
  const gaps: PricingGap[] = [];
  let cursor = fromDate;

  for (const booking of relevant) {
    if (booking.checkIn! > cursor) {
      const nights = diffDays(cursor, booking.checkIn!);
      if (nights >= 2) {
        const leadDays = diffDays(today, cursor);
        const recommendation = getPricingRecommendationForDate(cursor, leadDays);
        const includesWeekend = gapIncludesWeekend(cursor, booking.checkIn!);
        gaps.push({
          start: cursor,
          end: booking.checkIn!,
          nights,
          leadDays,
          includesWeekend,
          priority: priorityForGap(nights, leadDays, includesWeekend, recommendation),
          recommendation,
        });
      }
    }
    if (booking.checkOut! > cursor) cursor = booking.checkOut!;
  }

  if (cursor < toDate) {
    const nights = diffDays(cursor, toDate);
    if (nights >= 2) {
      const leadDays = diffDays(today, cursor);
      const recommendation = getPricingRecommendationForDate(cursor, leadDays);
      const includesWeekend = gapIncludesWeekend(cursor, toDate);
      gaps.push({
        start: cursor,
        end: toDate,
        nights,
        leadDays,
        includesWeekend,
        priority: priorityForGap(nights, leadDays, includesWeekend, recommendation),
        recommendation,
      });
    }
  }

  return gaps.sort((a, b) => {
    const weight = { high: 0, medium: 1, low: 2 } as const;
    return weight[a.priority] - weight[b.priority] || a.start.localeCompare(b.start);
  });
}

export function summarizePricingStrategy(bookings: PricingBooking[], today: Date = new Date()) {
  const from = iso(today);
  const horizon = new Date(today);
  horizon.setUTCDate(horizon.getUTCDate() + 220);
  return {
    generatedAt: from,
    rateCards: RATE_CARDS,
    releaseRules: RELEASE_RULES,
    discountLadder: DISCOUNT_LADDER,
    nextGaps: findOpenPricingGaps(bookings, from, iso(horizon), today).slice(0, 8),
  };
}
