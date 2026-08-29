import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  calculateDillonBeachEstimate,
  type DillonBeachEstimatorInput,
} from "../lib/dillonBeachEstimator";

const baseInput: DillonBeachEstimatorInput = {
  firstName: "Avery",
  email: "avery@example.com",
  addressOrNeighborhood: "Oceana Drive",
  bedrooms: 3,
  bathrooms: 2.5,
  maxGuests: 8,
  propertyType: "house",
  marketPositioning: "premium",
  interiorCondition: "updated",
  oceanView: "partial",
  beachAccess: "nearby",
  amenities: {
    hotTub: false,
    petFriendly: false,
    fireplace: true,
    gameRoom: false,
    evCharger: false,
    firePitDeck: true,
  },
  ownerUseWeeks: 2,
  managementRate: 20,
};

function estimate(overrides: Partial<DillonBeachEstimatorInput> = {}) {
  return calculateDillonBeachEstimate({ ...baseInput, ...overrides });
}

describe("calculateDillonBeachEstimate", () => {
  it("is deterministic for identical inputs", () => {
    const first = estimate();
    const second = estimate();

    assert.deepEqual(second, first);
    assert.equal("generatedAt" in first.personalization, false);
  });

  it("returns a conservative finite base case with ordered ranges", () => {
    const result = estimate();

    assert.equal(result.personalization.firstName, "Avery");
    assert.ok(result.annualGross.midpoint >= 80_000);
    assert.ok(result.annualGross.midpoint <= 120_000);
    assert.ok(result.annualGross.low < result.annualGross.midpoint);
    assert.ok(result.annualGross.midpoint < result.annualGross.high);
    assert.ok(result.ownerNet.low < result.ownerNet.high);
    assert.ok(result.blendedAdr.low > 0);
    assert.ok(result.occupancy.low > 0);
    assert.ok(result.bookedNights.high <= 365);
    assert.equal(result.seasonalBreakdown.length, 4);
    assert.equal(result.seasonalBreakdown.reduce((sum, season) => sum + season.share, 0), 100);
  });

  it("uses exact bedroom-tier paid occupancy baselines before attribute adjustments", () => {
    const neutralAdjustment = {
      oceanView: "direct" as const,
      beachAccess: "drive" as const,
      marketPositioning: "luxury" as const,
      interiorCondition: "fully-renovated" as const,
      amenities: {
        hotTub: false,
        petFriendly: false,
        fireplace: false,
        gameRoom: false,
        evCharger: false,
        firePitDeck: false,
      },
    };

    assert.equal(estimate({ ...neutralAdjustment, bedrooms: 1 }).occupancy.midpoint, 38);
    assert.equal(estimate({ ...neutralAdjustment, bedrooms: 2 }).occupancy.midpoint, 36);
    assert.equal(estimate({ ...neutralAdjustment, bedrooms: 3 }).occupancy.midpoint, 33);
    assert.equal(estimate({ ...neutralAdjustment, bedrooms: 4 }).occupancy.midpoint, 30);
    assert.equal(estimate({ ...neutralAdjustment, bedrooms: 5 }).occupancy.midpoint, 28);
    assert.equal(estimate({ ...neutralAdjustment, bedrooms: 6 }).occupancy.midpoint, 26);
  });

  it("lands the 5 bedroom recent benchmark near the high-20s before adjustments", () => {
    const result = estimate({
      bedrooms: 5,
      oceanView: "direct",
      beachAccess: "drive",
      marketPositioning: "luxury",
      interiorCondition: "fully-renovated",
      amenities: {
        hotTub: false,
        petFriendly: false,
        fireplace: false,
        gameRoom: false,
        evCharger: false,
        firePitDeck: false,
      },
    });

    assert.equal(result.occupancy.midpoint, 28);
    assert.ok(result.occupancy.low <= 24);
    assert.ok(result.occupancy.high >= 32);
  });

  it("increases revenue for a larger luxury designer home", () => {
    const standard = estimate({
      bedrooms: 2,
      bathrooms: 1.5,
      maxGuests: 6,
      propertyType: "cottage",
      marketPositioning: "standard",
      interiorCondition: "standard",
    });
    const luxury = estimate({
      bedrooms: 5,
      bathrooms: 4.5,
      maxGuests: 14,
      propertyType: "luxury-home",
      marketPositioning: "luxury",
      interiorCondition: "designer",
    });

    assert.ok(luxury.annualGross.midpoint > standard.annualGross.midpoint);
    assert.ok(luxury.blendedAdr.midpoint > standard.blendedAdr.midpoint);
  });

  it("keeps a fully loaded 4 bedroom luxury home within a conservative local band", () => {
    const result = estimate({
      bedrooms: 4,
      bathrooms: 3.5,
      maxGuests: 12,
      propertyType: "luxury-home",
      marketPositioning: "luxury",
      interiorCondition: "designer",
      oceanView: "direct",
      beachAccess: "walkable",
      amenities: {
        hotTub: true,
        petFriendly: true,
        fireplace: true,
        gameRoom: true,
        evCharger: true,
        firePitDeck: true,
      },
      ownerUseWeeks: 0,
    });

    assert.equal(result.occupancy.midpoint, 35);
    assert.ok(result.occupancy.high < 50);
    assert.ok(result.annualGross.midpoint >= 170_000);
    assert.ok(result.annualGross.midpoint <= 210_000);
  });

  it("clamps paid occupancy to the defensible 20% to 45% range", () => {
    const optimistic = estimate({
      bedrooms: 1,
      propertyType: "house",
      marketPositioning: "standard",
      interiorCondition: "designer",
      oceanView: "direct",
      beachAccess: "walkable",
      amenities: {
        hotTub: true,
        petFriendly: true,
        fireplace: false,
        gameRoom: false,
        evCharger: false,
        firePitDeck: false,
      },
    });
    const sparse = estimate({
      bedrooms: 6,
      propertyType: "luxury-home",
      marketPositioning: "luxury",
      interiorCondition: "dated",
      oceanView: "none",
      beachAccess: "drive",
      amenities: {
        hotTub: false,
        petFriendly: false,
        fireplace: false,
        gameRoom: false,
        evCharger: false,
        firePitDeck: false,
      },
    });

    assert.equal(optimistic.occupancy.midpoint, 45);
    assert.equal(sparse.occupancy.midpoint, 20);
  });

  it("uses the recalibrated 2023-2025 seasonal revenue shares", () => {
    const shares = estimate().seasonalBreakdown.map((season) => [season.key, season.share]);

    assert.deepEqual(shares, [
      ["winter", 23],
      ["spring", 21],
      ["summer", 32],
      ["fall", 24],
    ]);
  });

  it("uses wider honest uncertainty ranges", () => {
    const result = estimate();

    assert.equal(result.annualGross.low, Math.round((result.annualGross.midpoint * 0.82) / 1000) * 1000);
    assert.equal(result.annualGross.high, Math.round((result.annualGross.midpoint * 1.18) / 1000) * 1000);
    assert.equal(result.blendedAdr.low, Math.round((result.blendedAdr.midpoint * 0.88) / 25) * 25);
    assert.equal(result.blendedAdr.high, Math.round((result.blendedAdr.midpoint * 1.12) / 25) * 25);
    assert.equal(result.occupancy.low, Math.round(result.occupancy.midpoint * 0.85));
    assert.equal(result.occupancy.high, Math.round(result.occupancy.midpoint * 1.15));
    assert.equal(result.bookedNights.low, Math.round(result.bookedNights.midpoint * 0.85));
    assert.equal(result.bookedNights.high, Math.round(result.bookedNights.midpoint * 1.15));
  });

  it("keeps quality, amenity, and bedroom improvements monotonic", () => {
    const base = estimate({
      amenities: {
        hotTub: false,
        petFriendly: false,
        fireplace: false,
        gameRoom: false,
        evCharger: false,
        firePitDeck: false,
      },
      oceanView: "none",
      beachAccess: "drive",
      interiorCondition: "standard",
      marketPositioning: "standard",
    });
    const better = estimate({
      bedrooms: 4,
      bathrooms: 3,
      maxGuests: 10,
      amenities: {
        hotTub: true,
        petFriendly: true,
        fireplace: true,
        gameRoom: true,
        evCharger: true,
        firePitDeck: true,
      },
      oceanView: "direct",
      beachAccess: "walkable",
      interiorCondition: "designer",
      marketPositioning: "luxury",
    });

    assert.ok(better.annualGross.midpoint > base.annualGross.midpoint);
    assert.ok(better.blendedAdr.midpoint > base.blendedAdr.midpoint);
  });

  it("decreases gross revenue when owner-use weeks increase", () => {
    const lightUse = estimate({ ownerUseWeeks: 0 });
    const heavyUse = estimate({ ownerUseWeeks: 12 });

    assert.ok(heavyUse.annualGross.midpoint < lightUse.annualGross.midpoint);
    assert.ok(heavyUse.bookedNights.midpoint < lightUse.bookedNights.midpoint);
  });

  it("applies a direct ocean view uplift", () => {
    const noView = estimate({ oceanView: "none" });
    const direct = estimate({ oceanView: "direct" });

    assert.ok(direct.annualGross.midpoint > noView.annualGross.midpoint);
    assert.ok(direct.valueDrivers.some((driver) => /ocean/i.test(driver.label)));
  });

  it("management fee affects owner net but not gross", () => {
    const selfManaged = estimate({ managementRate: 0 });
    const managed = estimate({ managementRate: 30 });

    assert.equal(managed.annualGross.midpoint, selfManaged.annualGross.midpoint);
    assert.ok(managed.ownerNet.midpoint < selfManaged.ownerNet.midpoint);
  });

  it("owner-use weeks reduce rentable booked nights but not paid occupancy", () => {
    const noOwnerUse = estimate({ ownerUseWeeks: 0 });
    const fourWeeks = estimate({ ownerUseWeeks: 4 });

    assert.equal(fourWeeks.occupancy.midpoint, noOwnerUse.occupancy.midpoint);
    assert.ok(fourWeeks.bookedNights.midpoint < noOwnerUse.bookedNights.midpoint);
  });

  it("flags guest-count-to-bedroom mismatch", () => {
    const result = estimate({ bedrooms: 2, maxGuests: 12 });

    assert.ok(result.caveats.some((caveat) => /guest count/i.test(caveat.title)));
  });

  it("always returns exactly three unique value drivers for worst-case sparse inputs", () => {
    const result = estimate({
      bedrooms: 1,
      bathrooms: 1,
      maxGuests: 2,
      propertyType: "cottage",
      marketPositioning: "standard",
      interiorCondition: "dated",
      oceanView: "none",
      beachAccess: "drive",
      amenities: {
        hotTub: false,
        petFriendly: false,
        fireplace: false,
        gameRoom: false,
        evCharger: false,
        firePitDeck: false,
      },
      ownerUseWeeks: 16,
    });

    assert.equal(result.valueDrivers.length, 3);
    assert.equal(new Set(result.valueDrivers.map((driver) => driver.label)).size, 3);
    assert.ok(
      result.valueDrivers.every((driver) => driver.label && driver.impact && driver.detail),
    );
  });

  it("always returns useful opportunities for fully loaded inputs", () => {
    const result = estimate({
      propertyType: "luxury-home",
      marketPositioning: "luxury",
      interiorCondition: "designer",
      oceanView: "direct",
      beachAccess: "walkable",
      amenities: {
        hotTub: true,
        petFriendly: true,
        fireplace: true,
        gameRoom: true,
        evCharger: true,
        firePitDeck: true,
      },
    });

    assert.equal(result.valueDrivers.length, 3);
    assert.ok(result.opportunities.length >= 2);
    assert.ok(result.opportunities.length <= 3);
  });

  it("describes data basis and limitations without exposing private names or revenue", () => {
    const result = estimate();
    const publicCopy = [
      ...result.methodology,
      ...result.caveats.map((caveat) => `${caveat.title} ${caveat.body}`),
    ].join(" ");

    assert.match(publicCopy, /2023-2025 local operating sample/i);
    assert.match(publicCopy, /high-20%/i);
    assert.match(publicCopy, /368 observed listing-days/i);
    assert.match(publicCopy, /one listing per 2-5BR tier/i);
    assert.match(publicCopy, /blocked\/unavailable comp days are not treated as bookings/i);
    assert.match(publicCopy, /1BR and 6BR are extrapolated/i);
    assert.match(publicCopy, /estimate, not an appraisal or guarantee/i);
    assert.doesNotMatch(publicCopy, /Sky House/i);
    assert.doesNotMatch(publicCopy, /guest/i);
    assert.doesNotMatch(publicCopy, /\$[0-9]{3},[0-9]{3}/);
    assert.doesNotMatch(publicCopy, /2020|2021|2022|pandemic/i);
    assert.doesNotMatch(publicCopy, /2019/i);
    assert.doesNotMatch(publicCopy, /\b(?:89|93|103|114)\s+paid nights\b/i);
    assert.doesNotMatch(publicCopy, /\b(?:24\.4|25\.5|28\.2|31\.1)%/);
    assert.doesNotMatch(publicCopy, /\$(?:1,530|1,663|1,667|2,025)\b/);
  });

  it("clamps edge cases and never emits NaN or infinity", () => {
    const result = calculateDillonBeachEstimate({
      ...baseInput,
      firstName: "  ",
      bedrooms: 99,
      bathrooms: -4,
      maxGuests: 99,
      ownerUseWeeks: 99,
      managementRate: 80,
    });

    assert.equal(result.inputs.bedrooms, 6);
    assert.equal(result.inputs.bathrooms, 1);
    assert.equal(result.inputs.maxGuests, 16);
    assert.equal(result.inputs.ownerUseWeeks, 16);
    assert.equal(result.inputs.managementRate, 30);

    const numericValues = JSON.stringify(result).match(/-?\d+(\.\d+)?/g) ?? [];
    for (const value of numericValues) {
      assert.ok(Number.isFinite(Number(value)), `${value} should be finite`);
    }
  });
});
