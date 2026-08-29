export type PropertyType = "cottage" | "house" | "luxury-home";
export type MarketPositioning = "standard" | "premium" | "luxury";
export type InteriorCondition = "dated" | "standard" | "updated" | "fully-renovated" | "designer";
export type OceanView = "none" | "partial" | "direct";
export type BeachAccess = "drive" | "nearby" | "walkable";

export type DillonBeachAmenities = {
  hotTub: boolean;
  petFriendly: boolean;
  fireplace: boolean;
  gameRoom: boolean;
  evCharger: boolean;
  firePitDeck: boolean;
};

export type DillonBeachEstimatorInput = {
  firstName: string;
  email?: string;
  addressOrNeighborhood?: string;
  bedrooms: number;
  bathrooms: number;
  maxGuests: number;
  propertyType: PropertyType;
  marketPositioning: MarketPositioning;
  interiorCondition: InteriorCondition;
  oceanView: OceanView;
  beachAccess: BeachAccess;
  amenities: DillonBeachAmenities;
  ownerUseWeeks: number;
  managementRate: number;
};

export type MoneyRange = {
  low: number;
  midpoint: number;
  high: number;
};

export type PercentRange = MoneyRange;

export type SeasonalEstimate = {
  key: "winter" | "spring" | "summer" | "fall";
  label: string;
  share: number;
  revenue: number;
  note: string;
};

export type EstimateNote = {
  title: string;
  body: string;
};

export type ValueDriver = {
  label: string;
  impact: string;
  detail: string;
};

export type Opportunity = {
  title: string;
  body: string;
};

export type DillonBeachEstimatorOutput = {
  inputs: DillonBeachEstimatorInput;
  personalization: {
    firstName: string;
  };
  annualGross: MoneyRange;
  ownerNet: MoneyRange;
  blendedAdr: MoneyRange;
  occupancy: PercentRange;
  bookedNights: MoneyRange;
  seasonalBreakdown: SeasonalEstimate[];
  valueDrivers: ValueDriver[];
  opportunities: Opportunity[];
  caveats: EstimateNote[];
  methodology: string[];
};

const DEFAULT_AMENITIES: DillonBeachAmenities = {
  hotTub: false,
  petFriendly: false,
  fireplace: false,
  gameRoom: false,
  evCharger: false,
  firePitDeck: false,
};

const ADR_BY_BEDROOMS: Record<number, number> = {
  1: 430,
  2: 663,
  3: 892,
  4: 1173,
  5: 1624,
  6: 1780,
};

const PROPERTY_MULTIPLIER: Record<PropertyType, number> = {
  cottage: 0.93,
  house: 1,
  "luxury-home": 1.11,
};

const POSITIONING_MULTIPLIER: Record<MarketPositioning, number> = {
  standard: 0.9,
  premium: 1,
  luxury: 1.13,
};

const CONDITION_MULTIPLIER: Record<InteriorCondition, number> = {
  dated: 0.84,
  standard: 0.94,
  updated: 1,
  "fully-renovated": 1.08,
  designer: 1.16,
};

const VIEW_MULTIPLIER: Record<OceanView, number> = {
  none: 0.93,
  partial: 1,
  direct: 1.14,
};

const ACCESS_MULTIPLIER: Record<BeachAccess, number> = {
  drive: 0.94,
  nearby: 1,
  walkable: 1.08,
};

const AMENITY_UPLIFTS: Record<keyof DillonBeachAmenities, number> = {
  hotTub: 0.055,
  petFriendly: 0.045,
  fireplace: 0.018,
  gameRoom: 0.025,
  evCharger: 0.012,
  firePitDeck: 0.028,
};

const ASKING_TO_REALIZED_ADR = 0.86;
const NON_BEDROOM_MULTIPLIER_CAP = 1.55;
const NON_BEDROOM_MULTIPLIER_FLOOR = 0.72;

const SEASONS: Omit<SeasonalEstimate, "revenue">[] = [
  { key: "winter", label: "Winter", share: 18, note: "Lower midweek demand, weather-led weekends." },
  { key: "spring", label: "Spring", share: 23, note: "Spring breaks, coastal weekends, and shoulder-season value." },
  { key: "summer", label: "Summer", share: 36, note: "Peak beach demand and highest rate compression." },
  { key: "fall", label: "Fall", share: 23, note: "Strong weekends, holidays, and calmer shoulder weeks." },
];

function clamp(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function roundTo(value: number, increment: number) {
  return Math.round(value / increment) * increment;
}

function rangeFromMidpoint(midpoint: number, width: number, increment: number): MoneyRange {
  const low = roundTo(midpoint * (1 - width), increment);
  const high = roundTo(midpoint * (1 + width), increment);
  return {
    low,
    midpoint: roundTo(midpoint, increment),
    high: Math.max(high, low + increment),
  };
}

function normalizeInput(input: DillonBeachEstimatorInput): DillonBeachEstimatorInput {
  const bedrooms = Math.round(clamp(input.bedrooms, 1, 6));
  const maxGuests = Math.round(clamp(input.maxGuests, 2, 16));
  return {
    ...input,
    firstName: input.firstName.trim() || "there",
    email: input.email?.trim() || undefined,
    addressOrNeighborhood: input.addressOrNeighborhood?.trim() || undefined,
    bedrooms,
    bathrooms: Math.round(clamp(input.bathrooms, 1, 6) * 2) / 2,
    maxGuests,
    amenities: { ...DEFAULT_AMENITIES, ...input.amenities },
    ownerUseWeeks: Math.round(clamp(input.ownerUseWeeks, 0, 16)),
    managementRate: clamp(input.managementRate, 0, 30),
  };
}

function guestFitMultiplier(bedrooms: number, maxGuests: number) {
  const expectedGuests = bedrooms * 2 + 2;
  const difference = maxGuests - expectedGuests;
  if (difference <= 0) return 1 + Math.max(difference, -4) * 0.012;
  return 1 + Math.min(difference, 4) * 0.018;
}

function bathroomMultiplier(bedrooms: number, bathrooms: number) {
  const target = Math.max(1, bedrooms - 0.5);
  const difference = bathrooms - target;
  return clamp(1 + difference * 0.035, 0.9, 1.12);
}

function amenityMultiplier(amenities: DillonBeachAmenities) {
  return (Object.keys(AMENITY_UPLIFTS) as (keyof DillonBeachAmenities)[]).reduce(
    (multiplier, key) => multiplier + (amenities[key] ? AMENITY_UPLIFTS[key] : 0),
    1,
  );
}

function cappedNonBedroomMultiplier(input: DillonBeachEstimatorInput) {
  const multiplier = PROPERTY_MULTIPLIER[input.propertyType]
    * POSITIONING_MULTIPLIER[input.marketPositioning]
    * CONDITION_MULTIPLIER[input.interiorCondition]
    * VIEW_MULTIPLIER[input.oceanView]
    * ACCESS_MULTIPLIER[input.beachAccess]
    * bathroomMultiplier(input.bedrooms, input.bathrooms)
    * guestFitMultiplier(input.bedrooms, input.maxGuests)
    * amenityMultiplier(input.amenities);

  return clamp(multiplier, NON_BEDROOM_MULTIPLIER_FLOOR, NON_BEDROOM_MULTIPLIER_CAP);
}

function occupancyMidpoint(input: DillonBeachEstimatorInput) {
  const baseline = 47;
  const view = input.oceanView === "direct" ? 2.5 : input.oceanView === "partial" ? 1 : -1.5;
  const access = input.beachAccess === "walkable" ? 2 : input.beachAccess === "nearby" ? 0.5 : -1.5;
  const positioning = input.marketPositioning === "luxury" ? -2 : input.marketPositioning === "standard" ? 1.5 : 0;
  const condition = input.interiorCondition === "dated" ? -4 : input.interiorCondition === "designer" ? 1 : 0;
  const hotTub = input.amenities.hotTub ? 1.5 : 0;
  const petFriendly = input.amenities.petFriendly ? 1.5 : 0;
  return clamp(baseline + view + access + positioning + condition + hotTub + petFriendly, 34, 57);
}

function buildValueDrivers(input: DillonBeachEstimatorInput): ValueDriver[] {
  const drivers: ValueDriver[] = [];
  const addDriver = (driver: ValueDriver) => {
    if (!drivers.some((existing) => existing.label === driver.label)) {
      drivers.push(driver);
    }
  };

  if (input.oceanView === "direct") {
    addDriver({
      label: "Direct ocean view",
      impact: "High",
      detail: "Dillon Beach travelers pay a visible premium for unobstructed water-facing homes.",
    });
  } else if (input.oceanView === "partial") {
    addDriver({
      label: "Partial coastal view",
      impact: "Medium",
      detail: "A credible view supports rate confidence, especially in shoulder seasons.",
    });
  }
  if (input.beachAccess === "walkable") {
    addDriver({
      label: "Walk-to-beach access",
      impact: "High",
      detail: "Walkability reduces guest friction and helps family groups justify premium rates.",
    });
  }
  if (input.marketPositioning === "luxury" || input.interiorCondition === "designer") {
    addDriver({
      label: "Premium positioning",
      impact: "High",
      detail: "Design quality and luxury presentation raise achievable ADR more than occupancy.",
    });
  }
  if (input.amenities.hotTub) {
    addDriver({
      label: "Hot tub",
      impact: "Medium",
      detail: "A four-season amenity that helps winter and spring weekends convert.",
    });
  }
  if (input.amenities.petFriendly) {
    addDriver({
      label: "Pet friendly",
      impact: "Medium",
      detail: "Broadens the Dillon Beach audience and can add durable shoulder-season demand.",
    });
  }
  if (input.maxGuests >= 10) {
    addDriver({
      label: "Group capacity",
      impact: "Medium",
      detail: "Larger homes command stronger absolute revenue when sleeping capacity is credible.",
    });
  }
  if (input.bedrooms >= 3) {
    addDriver({
      label: "Bedroom count",
      impact: "Medium",
      detail: "More bedrooms support larger family and group stays, which raises the revenue anchor.",
    });
  }
  if (input.bathrooms >= Math.max(1, input.bedrooms - 0.5)) {
    addDriver({
      label: "Bathroom fit",
      impact: "Medium",
      detail: "Bathroom count appears aligned with sleeping capacity, reducing friction for longer stays.",
    });
  }
  if (input.amenities.fireplace || input.amenities.firePitDeck) {
    addDriver({
      label: "Coastal gathering spaces",
      impact: "Medium",
      detail: "Indoor and outdoor gathering features help the home merchandise across cooler months.",
    });
  }
  if (input.ownerUseWeeks <= 2) {
    addDriver({
      label: "Rentable availability",
      impact: "Medium",
      detail: "Limited owner-use weeks preserve more bookable nights for peak and shoulder-season demand.",
    });
  }

  [
    {
      label: "Dillon Beach seasonality",
      impact: "Foundational",
      detail: "The estimate reflects local seasonality rather than assuming year-round peak demand.",
    },
    {
      label: "Efficient guest fit",
      impact: "Foundational",
      detail: "Sleeping capacity is modeled against bedroom count so the revenue range stays grounded in guest comfort.",
    },
    {
      label: "Owner-use planning",
      impact: "Foundational",
      detail: "Reserved owner weeks are removed from rentable supply before estimating paid booked nights.",
    },
  ].forEach(addDriver);

  return drivers.slice(0, 3);
}

function buildOpportunities(input: DillonBeachEstimatorInput): Opportunity[] {
  const opportunities: Opportunity[] = [];
  if (!input.amenities.hotTub) {
    opportunities.push({
      title: "Model a hot tub payback",
      body: "For Dillon Beach, a well-presented hot tub can support both ADR and off-season conversion.",
    });
  }
  if (!input.amenities.petFriendly) {
    opportunities.push({
      title: "Evaluate pet-friendly rules",
      body: "A clear pet policy, fee, and durable finishes can expand demand without discounting the home.",
    });
  }
  if (input.oceanView !== "direct" && input.beachAccess !== "walkable") {
    opportunities.push({
      title: "Merchandise the coastal experience",
      body: "Professional photography should make beach logistics, decks, sunset areas, and gathering spaces obvious.",
    });
  }
  if (input.interiorCondition === "dated" || input.interiorCondition === "standard") {
    opportunities.push({
      title: "Prioritize camera-visible updates",
      body: "Lighting, bedding, living-room seating, and outdoor furniture usually move conversion before deep remodels.",
    });
  }
  if (!input.amenities.evCharger && input.marketPositioning !== "standard") {
    opportunities.push({
      title: "Consider EV charging",
      body: "It is a smaller revenue lever, but it matches the expectations of higher-end Bay Area drive-to guests.",
    });
  }
  if (!input.amenities.gameRoom && input.maxGuests >= 8) {
    opportunities.push({
      title: "Add all-weather group utility",
      body: "A small game or media area can improve family appeal when beach time is weather-limited.",
    });
  }
  if (input.oceanView === "direct" || input.beachAccess === "walkable") {
    opportunities.push({
      title: "Lead with location proof",
      body: "Use photos, captions, and the first lines of the listing to make the view and beach access unmistakable.",
    });
  }
  if (input.interiorCondition === "fully-renovated" || input.interiorCondition === "designer") {
    opportunities.push({
      title: "Protect premium presentation",
      body: "Refresh photography seasonally and keep linens, tableware, and outdoor furnishings consistent with the rate tier.",
    });
  }
  opportunities.push({
    title: "Tune shoulder-season pricing",
    body: "Use conservative weekday rates and stronger weekend minimums so fall, winter, and spring do not depend on peak-season assumptions.",
  });
  return opportunities.slice(0, 3);
}

function buildCaveats(input: DillonBeachEstimatorInput): EstimateNote[] {
  const caveats: EstimateNote[] = [
    {
      title: "Accommodation revenue only",
      body: "The estimate excludes cleaning fees, transient occupancy tax, platform fees, operating expenses, insurance, repairs, debt service, and income tax effects.",
    },
  ];
  if (input.maxGuests > input.bedrooms * 2 + 4) {
    caveats.push({
      title: "Guest count may outpace bedroom count",
      body: "Very high advertised capacity can increase wear and guest scrutiny unless beds, baths, parking, and dining capacity all feel comfortable.",
    });
  }
  if (input.ownerUseWeeks > 0) {
    caveats.push({
      title: "Owner-use weeks reduce rentable supply",
      body: `${input.ownerUseWeeks} owner-use week${input.ownerUseWeeks === 1 ? "" : "s"} are removed before estimating paid booked nights.`,
    });
  }
  caveats.push({
    title: "Conservative local calibration",
    body: "Pandemic-era revenue spikes are treated as anomalies; current estimates are anchored to recent Dillon Beach asking-rate snapshots and normalized demand.",
  });
  return caveats;
}

export function calculateDillonBeachEstimate(input: DillonBeachEstimatorInput): DillonBeachEstimatorOutput {
  const normalized = normalizeInput(input);
  const baseAdr = ADR_BY_BEDROOMS[normalized.bedrooms];
  const adrMidpoint = baseAdr
    * ASKING_TO_REALIZED_ADR
    * cappedNonBedroomMultiplier(normalized);
  const rentableNights = 365 - normalized.ownerUseWeeks * 7;
  const occupancy = occupancyMidpoint(normalized);
  const bookedNightsMidpoint = rentableNights * (occupancy / 100);
  const grossMidpoint = adrMidpoint * bookedNightsMidpoint;
  const gross = rangeFromMidpoint(grossMidpoint, 0.17, 1000);
  const ownerNet: MoneyRange = {
    low: roundTo(gross.low * (1 - normalized.managementRate / 100), 1000),
    midpoint: roundTo(gross.midpoint * (1 - normalized.managementRate / 100), 1000),
    high: roundTo(gross.high * (1 - normalized.managementRate / 100), 1000),
  };
  const seasonalBreakdown = SEASONS.map((season) => ({
    ...season,
    revenue: roundTo(gross.midpoint * (season.share / 100), 1000),
  }));

  return {
    inputs: normalized,
    personalization: {
      firstName: normalized.firstName,
    },
    annualGross: gross,
    ownerNet,
    blendedAdr: rangeFromMidpoint(adrMidpoint, 0.11, 25),
    occupancy: rangeFromMidpoint(occupancy, 0.1, 1),
    bookedNights: rangeFromMidpoint(bookedNightsMidpoint, 0.1, 1),
    seasonalBreakdown,
    valueDrivers: buildValueDrivers(normalized),
    opportunities: buildOpportunities(normalized),
    caveats: buildCaveats(normalized),
    methodology: [
      "Bedroom anchors use observed Dillon Beach asking-rate snapshots: 2BR/6 around $663, 3BR/8 around $892, 4BR/10 around $1,173, and 5BR/14 around $1,624.",
      "Revenue is converted from asking-rate evidence to realized accommodation revenue with conservative paid-occupancy assumptions rather than scraped availability.",
      "Local luxury estimates are capped so view, condition, positioning, and amenity adjustments do not compound beyond recent normalized asking-rate baselines.",
      "Management fee changes owner net only; it does not change gross accommodation revenue.",
    ],
  };
}
